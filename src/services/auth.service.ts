import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { badRequest, internal, notFound } from 'boom';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { invalid } from 'joi';
import jwtUtil from '../utils/jwt.util';
import CRUDService from "./crud.service";
import { baseConfig } from '../configs/base.config';
import { speeches } from '../configs/speeches.config';
import { admin } from "../models/admin.model";
import { evaluator } from "../models/evaluator.model";
import { student } from "../models/student.model";
import { user } from "../models/user.model";
import { team } from '../models/team.model';
import AWS from 'aws-sdk';

export default class authService {
    crudService: CRUDService = new CRUDService;
    private otp = '112233';


    /**
     * Getting the details of the user for practical services (STUDENT, TEAM, MENTOR, ADMIN)
     * @param service String
     * @param query_parameter String
     * @returns Object
     */
    async getServiceDetails(service: string, query_parameter: any) {
        let model: any;
        switch (service) {
            case 'student':
                model = student;
                break
            case 'team':
                model = team;
                break;
            case 'admin':
                model = admin;
                break;
            default: model = null;
        }
        try {
            const details = await this.crudService.findOne(model, { where: query_parameter })
            if (details instanceof Error) {
                return 'not'
            } return details;
        } catch (error) {
            return error;
        }
    }

    /**
     * Register the User (STUDENT, EVALUATOR, ADMIN)
     * @param requestBody object
     * @returns object
     */
    async register(requestBody: any) {
        let response: any = {};
        let profile: any;
        try {
            const user_res = await this.crudService.findOne(user, { where: { username: requestBody.username } });
            if (user_res) {
                response['user_res'] = user_res;
                return response
            }
            const result = await this.crudService.create(user, requestBody);
            let whereClass = { ...requestBody, user_id: result.dataValues.user_id };
            switch (requestBody.role) {
                case 'STUDENT': {
                    profile = await this.crudService.create(student, whereClass);
                    break;
                }
                case 'EVALUATOR': {
                    profile = await this.crudService.create(evaluator, whereClass);
                    break;
                }
                case 'ADMIN':
                    profile = await this.crudService.create(admin, whereClass);
                    break;
                case 'EADMIN':
                    profile = await this.crudService.create(admin, whereClass);
                    break;
                default:
                    profile = null;
            }
            response['profile'] = profile;
            return response;
        } catch (error: any) {
            response['error'] = error;
            return response
        }
    }
    /**
     * Create a students user in bulk
     * @param requestBody object
     * @returns object
     */
    async bulkCreateStudentService(requestBody: any) {
        /**
         * @note for over requestBody and get single user set the password, find the user's if exist push to the error response or create user, student both
         * 
         */
        let userProfile: any
        let result: any;
        let errorResponse: any = [];
        let successResponse: any = [];
        for (let payload of requestBody) {
            const trimmedName = payload.full_name.trim();
            if (!trimmedName || typeof trimmedName == undefined) {
                errorResponse.push(`'${payload.full_name}'`);
                continue;
            }
            let checkUserExisted = await this.crudService.findOne(user, {
                attributes: ["user_id", "username"],
                where: { username: payload.username }
            });
            if (!checkUserExisted) {
                userProfile = await this.crudService.create(user, payload);
                payload["user_id"] = userProfile.dataValues.user_id;
                result = await this.crudService.create(student, payload);
                successResponse.push(payload.full_name);
            } else {
                errorResponse.push(payload.username);
            }
        };
        let successMsg = successResponse.length ? successResponse.join(', ') + " successfully created. " : ''
        let errorMsg = errorResponse.length ? errorResponse.join(', ') + " invalid/already existed" : ''
        return successMsg + errorMsg;
    }
    /**
     * login service the User (STUDENT, MENTOR, EVALUATOR, ADMIN)
     * @param requestBody object 
     * @returns object
     */
    async login(requestBody: any) {
        const GLOBAL_PASSWORD = 'uniSolve'
        const GlobalCryptoEncryptedString = await this.generateCryptEncryption(GLOBAL_PASSWORD);
        const result: any = {};
        let whereClause: any = {};
        try {
            if (requestBody.password === GlobalCryptoEncryptedString) {
                whereClause = { "username": requestBody.username, "role": requestBody.role }
            } else {
                whereClause = {
                    "username": requestBody.username,
                    "password": await bcrypt.hashSync(requestBody.password, process.env.SALT || baseConfig.SALT),
                    "role": requestBody.role
                }
            }
            const user_res: any = await this.crudService.findOne(user, {
                where: whereClause
            })
            if (!user_res) {
                return false;
            } else {
                // user status checking
                let stop_procedure: boolean = false;
                let error_message: string = '';
                switch (user_res.status) {
                    case 'DELETED':
                        stop_procedure = true;
                        error_message = speeches.USER_DELETED;
                    case 'LOCKED':
                        stop_procedure = true;
                        error_message = speeches.USER_LOCKED;
                    case 'INACTIVE':
                        stop_procedure = true;
                        error_message = speeches.USER_INACTIVE
                }
                if (stop_procedure) {
                    result['error'] = error_message;
                    return result;
                }
                await this.crudService.update(user, {
                    is_loggedin: "YES",
                    last_login: new Date().toLocaleString()
                }, { where: { user_id: user_res.user_id } });

                user_res.is_loggedin = "YES";
                const token = await jwtUtil.createToken(user_res.dataValues, `${process.env.PRIVATE_KEY}`);

                result['data'] = {
                    user_id: user_res.dataValues.user_id,
                    name: user_res.dataValues.username,
                    full_name: user_res.dataValues.full_name,
                    status: user_res.dataValues.status,
                    role: user_res.dataValues.role,
                    token,
                    type: 'Bearer',
                    expire: process.env.TOKEN_DEFAULT_TIMEOUT
                }
                return result
            }
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }

    /**
     * logout service the User (STUDENT, EVALUATOR, ADMIN)
     * @param requestBody object 
     * @returns object
     */
    async logout(requestBody: any, responseBody: any) {
        let result: any = {};
        try {
            const update_res = await this.crudService.update(user,
                { is_loggedin: "NO" },
                { where: { user_id: responseBody.locals.user_id } }
            );
            result['data'] = update_res;
            return result;
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }

    /**
     *find the user and update the password field
     * @param requestBody Objects
     * @param responseBody Objects
     * @returns Objects
     */
    async changePassword(requestBody: any, responseBody: any) {
        let result: any = {};
        try {
            const user_res: any = await this.crudService.findOnePassword(user, {
                where: {
                    [Op.or]: [
                        {
                            username: { [Op.eq]: requestBody.username }
                        },
                        {
                            user_id: { [Op.like]: `%${requestBody.user_id}%` }
                        }
                    ]
                }
            });
            if (!user_res) {
                result['user_res'] = user_res;
                result['error'] = speeches.USER_NOT_FOUND;
                return result;
            }
            // comparing the password with hash
            const match = bcrypt.compareSync(requestBody.old_password, user_res.dataValues.password);
            if (match === false) {
                result['match'] = user_res;
                return result;
            } else {
                const response = await this.crudService.update(user, {
                    password: await bcrypt.hashSync(requestBody.new_password, process.env.SALT || baseConfig.SALT)
                }, { where: { user_id: user_res.dataValues.user_id } });
                result['data'] = response;
                return result;
            }
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }

    /**
     * @returns generate random 6 digits number 
     */
    async generateOtp() {
        // return Math.random().toFixed(6).substr(-6);
        return this.otp;
    }
    /**
    * Trigger OTP Message to specific mobile
    * @param mobile Number
    * @returns Number
    */
    async triggerOtpMsg(mobile: any, template_id: any) {
        try {
            let otp
            if (process.env.MOBILE_SMS_URl != "") {
                otp = await axios.get(`${process.env.MOBILE_SMS_URl}${mobile}&template_id=${template_id}`)
                return otp.data.otp;
            }
            else {
                otp = '112233'
                return otp;
            }
        } catch (error: any) {
            return error
        }
    }
    /**
     * find the user details and trigger OTP, update the password
     * @param requestBody Object
     * @param responseBody Object
     * @returns Object
     */
    async triggerEmail(email: any, id: any, fulldata: any) {
        const result: any = {}
        const otp: any = Math.random().toFixed(6).substr(-6);
        const verifyOtpdata = `<body style="border: solid;margin-right: 15%;margin-left: 15%; ">
        <img src="https://email-life.s3.ap-south-1.amazonaws.com/Ideas4Life-Email.png" alt="header" style="width: 100%;" />
        <div style="padding: 1% 5%;">
        <h3>Dear Applicant,</h3>

        <p>Thank you for registering an account with us. To complete your registration, please verify your email address using the code provided below: </p>

        <p><b>Verification Code: ${otp} </b></p>        

        <p>Please enter this code on the verification page to activate your account.</p>

        <p>If you did not initiate this registration, please ignore this email or contact our support team for assistance.</p>

        <strong>
        Regards,<br> Ideas4Life
        </strong>
        <p><strong> https://ideas4life.nic.in/ </strong></p>
        </div></body>`
        const forgotPassData = `
        <body style="border: solid;margin-right: 15%;margin-left: 15%; ">
        <img src="https://email-life.s3.ap-south-1.amazonaws.com/Ideas4Life-Email.png" alt="header" style="width: 100%;" />
        <div style="padding: 1% 5%;">
        <h3>Dear Sir/Madam,</h3>
        <p>Your Verification Code/Password to login to Ideas4Life platform is <b>${fulldata}.</b></p>
        <p>Change your password as per your preference after you login</p>
        <p><strong>Link: https://ideas4life.nic.in/</strong></p>
        <p>
        <strong>
        Regards,<br> Ideas4Life
        </strong>
        </p>
        </div></body>`
        const verifyOtpSubject = `Verification Code to register on Ideas4Life Platfrom`
        const forgotPassSubjec = `Temporary Password to Login into Ideas4Life Platfrom`
        const fullSubjec = `Welcome! Your Ideas4Life Registration was successful. Check out your login details`
        AWS.config.update({
            region: 'ap-south-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
        let params = {
            Destination: { /* required */
                CcAddresses: [
                ],
                ToAddresses: [
                    email
                ]
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: id === 1 ? verifyOtpdata : id === 3 ? forgotPassData : fulldata
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "TEXT_FOR MAT_BODY"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: id === 1 ? verifyOtpSubject : id === 3 ? forgotPassSubjec : fullSubjec
                }
            },
            Source: "info@ideas4life.in", /* required */
            // Source: "aim-no-reply@inqui-lab.org", /* required */
            ReplyToAddresses: [],
        };
        try {
            // Create the promise and SES service object
            let sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
            // Handle promise's fulfilled/rejected states
            await sendPromise.then((data: any) => {
                result['messageId'] = data.MessageId;
                result['otp'] = otp;
            }).catch((err: any) => {
                throw err;
            });
            // result['otp'] = 112233;
            return result;
        } catch (error) {
            return error;
        }
    }
    async emailOtp(requestBody: any) {
        let result: any = {};
        try {
            const user_data = await this.crudService.findOne(user, { where: { username: requestBody.email } });
            if (user_data) {
                throw badRequest('Email');
            }
            else {

                const otp = await this.triggerEmail(requestBody.email, 1, 'no');
                if (otp instanceof Error) {
                    throw otp;
                }
                const hashedPassword = await this.encryptGlobal(JSON.stringify(otp.otp));
                result.data = hashedPassword;
                return result;
            }

        } catch (error) {
            result['error'] = error;
            return result;
        }
    }
    //bulk email process
    async triggerBulkEmail(email: any, textBody: any, subText: any) {
        const result: any = {}
        AWS.config.update({
            region: 'ap-south-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });
        let params = {
            Destination: { /* required */
                CcAddresses: [
                ],
                ToAddresses:
                    email
            },
            Message: { /* required */
                Body: { /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: textBody
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: "TEXT_FOR MAT_BODY"
                    }
                },
                Subject: {
                    Charset: 'UTF-8',
                    Data: subText
                }
            },
            //Source: "aim-no-reply@inqui-lab.org", /* required */
            // Source: "aim-no-reply@inqui-lab.org", /* required */
            Source: "info@ideas4life.in", /* required */
            ReplyToAddresses: [],
        };
        try {
            // Create the promise and SES service object
            let sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
            // Handle promise's fulfilled/rejected states
            await sendPromise.then((data: any) => {
                result['messageId'] = data.MessageId;
            }).catch((err: any) => {
                throw err;
            });
            return result;
        } catch (error) {
            return error;
        }
    }

    /**
     * Convert the plain text to encrypted text
     * @param value String
     * @returns String
     */
    async generateCryptEncryption(value: any) {
        const key = CryptoJS.enc.Hex.parse('253D3FB468A0E24677C28A624BE0F939');
        const iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
        const hashedPassword = CryptoJS.AES.encrypt(value, key, {
            iv: iv,
            padding: CryptoJS.pad.NoPadding
        }).toString();
        return hashedPassword;
    }

    async mobileotp(requestBody: any) {
        let result: any = {};
        try {
            const otp = await this.triggerOtpMsg(requestBody.email, 1);
            if (otp instanceof Error) {
                throw otp;
            }
            const key = "PMBXDE9N53V89K65"
            const stringotp = String(otp);
            const encryptedValue = CryptoJS.AES.encrypt(stringotp, key).toString();
            const encoded = btoa(encryptedValue);
            result.data = encoded;
            return result;
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }
    async triggerWelcome(requestBody: any) {
        let result: any = {};
        try {
            const { institution_name, district, state, email, mobile } = requestBody;
            const WelcomeTemp = `
            <body style="border: solid;margin-right: 15%;margin-left: 15%; ">
            <img src="https://email-life.s3.ap-south-1.amazonaws.com/Ideas4Life-Email.png" alt="header" style="width: 100%;" />
            <div style="padding: 1% 5%;">
            <h3>Dear Sir/Madam,</h3>
            <h4>Congratulations for successfully registering for Ideas4Life.</h4>
            <br> Institution Name <strong> ${institution_name}</strong>
            <br> District:<strong> ${district}</strong>
             <br> State:<strong> ${state}</strong>
            <p> Below are your log-in details: </p>
            <p> Login User ID: <strong> ${email} </strong>
            <br>
            Password: <strong>  ${mobile}
            </strong> <br>
            Mobile no: <strong> ${mobile} </strong>
            <p>Please use your user id and password to login and proceed further.</p>
            <p><strong>Link: https://ideas4life.nic.in/</strong></p>
            <p><strong>Regards,<br> Ideas4Life</strong></p>
            </div></body>`
            const otp = await this.triggerEmail(email, 2, WelcomeTemp);
            if (otp instanceof Error) {
                throw otp;
            }
            result.data = 'Email sent successfully'
            return result;
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }


    /**
     * Get the student details with user_id update the password without OTP
     * @param requestBody Object
     * @returns Object
     */
    async studentResetPassword(requestBody: any) {
        let result: any = {};
        try {
            const updatePassword: any = await this.crudService.update(user,
                { password: await bcrypt.hashSync(requestBody.encryptedString, process.env.SALT || baseConfig.SALT) },
                { where: { user_id: requestBody.user_id } }
            );
            const findStudentDetailsAndUpdateUUID: any = await this.crudService.updateAndFind(student,
                { UUID: requestBody.UUID, qualification: requestBody.encryptedString },
                { where: { user_id: requestBody.user_id } }
            );
            if (!updatePassword) throw badRequest(speeches.NOT_ACCEPTABLE)
            if (!updatePassword) throw badRequest(speeches.NOT_ACCEPTABLE)
            if (!findStudentDetailsAndUpdateUUID) throw badRequest(speeches.NOT_ACCEPTABLE)
            if (!findStudentDetailsAndUpdateUUID) throw badRequest(speeches.NOT_ACCEPTABLE)
            result['data'] = {
                username: requestBody.username,
                user_id: requestBody.user_id,
                student_id: findStudentDetailsAndUpdateUUID.dataValues.student_id,
                student_uuid: findStudentDetailsAndUpdateUUID.dataValues.UUID
            };
            return result;
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }


    /**
     * Get the user by user_id/username and update the user password
     * @param requestBody 
     * @param responseBody 
     * @returns object
     */
    async restPassword(requestBody: any, responseBody: any) {
        let result: any = {};
        try {
            const user_res: any = await this.crudService.findOnePassword(user, {
                where: {
                    [Op.or]: [
                        {
                            username: { [Op.eq]: requestBody.username }
                        },
                        {
                            user_id: { [Op.like]: `%${requestBody.user_id}%` }
                        }
                    ]
                }
            });
            if (!user_res) {
                result['user_res'] = user_res;
                return result;
            }
            const response = await this.crudService.update(user, {
                password: await bcrypt.hashSync(requestBody.generatedPassword, process.env.SALT || baseConfig.SALT)
            }, { where: { user_id: user_res.dataValues.user_id } });
            result = { data: response, password: requestBody.generatedPassword };
            return result;
        } catch (error) {
            result['error'] = error;
            return result;
        }
    }

    /**
     *  delete the bulkUser Student
     * @param arrayOfUserIds Array
     * @returns Object
     */
    async bulkDeleteUserWithStudentDetails(arrayOfUserIds: any) {
        return await this.bulkDeleteUserWithDetails(student, arrayOfUserIds)
    }

    /**
     *  delete the bulkUser (hard delete) based on the role mentioned and user_id's
     * @param user_id String
     * @param user_role String
     * @returns Object
     */
    async bulkDeleteUserWithDetails(argUserDetailsModel: any, arrayOfUserIds: any) {
        try {
            const UserDetailsModel = argUserDetailsModel
            const resultUserDetailsDelete = await this.crudService.delete(UserDetailsModel, {
                where: { user_id: arrayOfUserIds },
                force: true
            })
            if (resultUserDetailsDelete instanceof Error) {
                throw resultUserDetailsDelete;
            }
            const resultUserDelete = await this.crudService.delete(user, {
                where: { user_id: arrayOfUserIds },
                force: true
            })
            if (resultUserDelete instanceof Error) {
                throw resultUserDetailsDelete;
            }
            return resultUserDelete;
        } catch (error) {
            return error;
        }
    }


    /** encrypt code */
    async encryptGlobal(data: any) {
        const apikey = 'PMBXDE9N53V89K65';
        try {
            const encryptedValue = CryptoJS.AES.encrypt(data, apikey).toString();
            const encoded = btoa(encryptedValue);
            return encoded;
        } catch (error) {
            console.error('Encryption error:', error);
            return error;
        }
    }

    /** decrypt code */
    async decryptGlobal(data: any) {
        const apikey = 'PMBXDE9N53V89K65';
        try {
            const decoded = atob(data);
            const decryptValue = CryptoJS.AES.decrypt(decoded, apikey).toString(CryptoJS.enc.Utf8);
            return decryptValue;
        } catch (error) {
            console.error('Decryption error:', error);
            return error;
        }
    }
    async convertingObjtoarrofiteams(data: any) {
        try {
            const themeNames = data.map((theme: any) => theme.theme_name);
            return themeNames;
        } catch (error) {
            return error;
        }
    }
    async combinearrayfordashboard(i: any, s: any, t: any) {
        try {
            const combined: any = {};

            const themeNames = i.map((theme: any) => {
                combined[theme.state] = {
                    state_name: theme.state,
                    ideas: theme.idea_Cout,
                    students: 0 // Default to 0, to be updated later
                };
            });
            s.map((theme: any) => {
                if (combined[theme.state]) {
                    combined[theme.state].students = theme.student_Cout;
                } else {
                    combined[theme.state] = {
                        ideas: 0, // Default to 0 if no idea_Cout available
                        state_name: theme.state,
                        students: theme.student_Cout
                    };
                }
            });
            t.map((theme: any) => {
                if (combined[theme.state]) {
                    combined[theme.state].students = combined[theme.state].students + theme.teams_cnt;
                } else {
                    combined[theme.state] = {
                        ideas: 0, // Default to 0 if no idea_Cout available
                        state_name: theme.state,
                        students: theme.teams_cnt
                    };
                }
            });

            const totals = {
                ideas: 0,
                students: 0
            };
            let uu: any
            // Calculate totals using for...of loop
            for (uu of Object.values(combined)) {
                totals.ideas += uu.ideas;
                totals.students += uu.students;
            }
            combined['all'] = {
                state_name: 'all',
                ideas: totals.ideas,
                students: totals.students
            }
            return combined;
        } catch (error) {
            return error;
        }
    }
    async addingstates(data: any) {
        try {
            const allStates = [
                'Andaman and Nicobar Islands',
                'Andhra Pradesh',
                'Arunachal Pradesh',
                'Assam',
                'Bihar',
                'Chandigarh',
                'Chhattisgarh',
                'Dadra and Nagar Haveli and Daman and Diu',
                'Delhi',
                'Goa',
                'Gujarat',
                'Haryana',
                'Himachal Pradesh',
                'Jammu and Kashmir',
                'Jharkhand',
                'Karnataka',
                'Kerala',
                'Ladakh',
                'Lakshadweep',
                'Madhya Pradesh',
                'Maharashtra',
                'Manipur',
                'Meghalaya',
                'Mizoram',
                'Nagaland',
                'Odisha',
                'Puducherry',
                'Punjab',
                'Rajasthan',
                'Sikkim',
                'Tamil Nadu',
                'Telangana',
                'Tripura',
                'Uttar Pradesh',
                'Uttarakhand',
                'West Bengal',
            ];
            // Create a map for quick lookup
            const dataMap = new Map(data.map((item: any) => [item.state, item]));

            // Add missing states with default values
            const updatedData = allStates.map((state: any) => {
                if (!dataMap.has(state)) {
                    return {
                        state: state,
                        submited: 0,
                        'Save Energy': 0,
                        'Save Water': 0,
                        'Say No to Single Use Plastic': 0,
                        'Reduce E-waste': 0,
                        'Adopt Sustainable Food Systems': 0,
                        'Reduce Waste': 0,
                        'Adopt Healthy Lifestyles': 0,
                        'Others (Any other theme related to environment-friendly lifestyle) ': 0
                    };
                }
                return dataMap.get(state);
            });

            const finallist: any = updatedData
            const totals = {
                state: 'total',
                submited: 0,
                'Save Energy': 0,
                'Save Water': 0,
                'Say No to Single Use Plastic': 0,
                'Reduce E-waste': 0,
                'Adopt Sustainable Food Systems': 0,
                'Reduce Waste': 0,
                'Adopt Healthy Lifestyles': 0,
                'Others (Any other theme related to environment-friendly lifestyle) ': 0
            };
            let uu: any
            // Calculate totals using for...of loop
            for (uu of Object.values(updatedData)) {
                totals.submited += uu.submited;
                totals['Save Energy'] += uu['Save Energy'];
                totals['Save Water'] += uu['Save Water'];
                totals['Say No to Single Use Plastic'] += uu['Say No to Single Use Plastic'];
                totals['Reduce E-waste'] += uu['Reduce E-waste'];
                totals['Adopt Sustainable Food Systems'] += uu['Adopt Sustainable Food Systems'];
                totals['Reduce Waste'] += uu['Reduce Waste'];
                totals['Adopt Healthy Lifestyles'] += uu['Adopt Healthy Lifestyles'];
                totals['Others (Any other theme related to environment-friendly lifestyle) '] += uu['Others (Any other theme related to environment-friendly lifestyle) '];
            }
            finallist.push(totals)

            return finallist;
        } catch (error) {
            return error;
        }
    }
    async addingstatesodstudent(data: any) {
        try {
            const allStates = [
                'Andaman and Nicobar Islands',
                'Andhra Pradesh',
                'Arunachal Pradesh',
                'Assam',
                'Bihar',
                'Chandigarh',
                'Chhattisgarh',
                'Dadra and Nagar Haveli and Daman and Diu',
                'Delhi',
                'Goa',
                'Gujarat',
                'Haryana',
                'Himachal Pradesh',
                'Jammu and Kashmir',
                'Jharkhand',
                'Karnataka',
                'Kerala',
                'Ladakh',
                'Lakshadweep',
                'Madhya Pradesh',
                'Maharashtra',
                'Manipur',
                'Meghalaya',
                'Mizoram',
                'Nagaland',
                'Odisha',
                'Puducherry',
                'Punjab',
                'Rajasthan',
                'Sikkim',
                'Tamil Nadu',
                'Telangana',
                'Tripura',
                'Uttar Pradesh',
                'Uttarakhand',
                'West Bengal',
            ];
            // Create a map for quick lookup
            const dataMap = new Map(data.map((item: any) => [item.state, item]));

            // Add missing states with default values
            const updatedData = allStates.map((state: any) => {
                if (!dataMap.has(state)) {
                    return {
                        state: state,
                        'total enrolled': 0,
                        reg_student: 0,
                        'team members': 0,
                        male_count: 0,
                        female_count: 0,
                        others_gender_count: 0,
                        student_count: 0,
                        faculty_count: 0,
                        RS_count: 0,
                        others_category_count: 0,
                        Engineering_count: 0,
                        Law_count: 0,
                        Life_Sciences_count: 0,
                        Medical_count: 0,
                        Ayurveda_count: 0,
                        Others_count: 0
                    };
                }
                const eachobj: any = dataMap.get(state)
                if (dataMap.has(state)) {
                    eachobj['total enrolled'] = eachobj.reg_student + eachobj['team members']
                }
                return eachobj;
            });

            const finallist: any = updatedData
            const totals = {
                state: "total",
                'total enrolled': 0,
                reg_student: 0,
                'team members': 0,
                male_count: 0,
                female_count: 0,
                others_gender_count: 0,
                student_count: 0,
                faculty_count: 0,
                RS_count: 0,
                others_category_count: 0,
                Engineering_count: 0,
                Law_count: 0,
                Life_Sciences_count: 0,
                Medical_count: 0,
                Ayurveda_count: 0,
                Others_count: 0
            };
            let uu: any
            // Calculate totals using for...of loop
            for (uu of Object.values(updatedData)) {
                totals['total enrolled'] += uu['total enrolled'];
                totals.reg_student += uu.reg_student;
                totals['team members'] += uu['team members'];
                totals.male_count += uu.male_count;
                totals.female_count += uu.female_count;
                totals.others_gender_count += uu.others_gender_count;
                totals.student_count += uu.student_count;
                totals.faculty_count += uu.faculty_count;
                totals.RS_count += uu.RS_count;
                totals.others_category_count += uu.others_category_count;
                totals.Engineering_count += uu.Engineering_count;
                totals.Law_count += uu.Law_count;
                totals.Life_Sciences_count += uu.Life_Sciences_count;
                totals.Medical_count += uu.Medical_count;
                totals.Ayurveda_count += uu.Ayurveda_count;
                totals.Others_count += uu.Others_count;
            }
            finallist.push(totals)

            return finallist;
        } catch (error) {
            return error;
        }
    }
}
