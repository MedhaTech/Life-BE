import { Request, Response, NextFunction } from 'express';
import { customAlphabet } from 'nanoid';
import { speeches } from '../configs/speeches.config';
import dispatcher from '../utils/dispatch.util';
import { studentSchema, studentLoginSchema, studentUpdateSchema, studentChangePasswordSchema, studentResetPasswordSchema, studentForgotPasswordSchema } from '../validations/student.validationa';
import bcrypt from 'bcrypt';
import authService from '../services/auth.service';
import BaseController from './base.controller';
import ValidationsHolder from '../validations/validationHolder';
import validationMiddleware from '../middlewares/validation.middleware';
import { user } from '../models/user.model';
import { baseConfig } from '../configs/base.config';
import { student } from '../models/student.model';
import { badRequest, internal, notFound, unauthorized } from 'boom';
import { S3 } from "aws-sdk";
import fs from 'fs';


export default class StudentController extends BaseController {
    model = "student";
    authService: authService = new authService;
    private password = process.env.GLOBAL_PASSWORD;
    private nanoid = customAlphabet('0123456789', 6);

    protected initializePath(): void {
        this.path = '/students';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(studentSchema, studentUpdateSchema);
    }
    protected initializeRoutes(): void {
        this.router.post(`${this.path}/register`, validationMiddleware(studentSchema), this.register.bind(this));
        this.router.post(`${this.path}/login`, validationMiddleware(studentLoginSchema), this.login.bind(this));
        this.router.get(`${this.path}/logout`, this.logout.bind(this));
        this.router.put(`${this.path}/changePassword`, validationMiddleware(studentChangePasswordSchema), this.changePassword.bind(this));
        this.router.get(`${this.path}/:student_user_id/studentCertificate`, this.studentCertificate.bind(this));
        this.router.post(`${this.path}/emailOtp`, this.emailOtp.bind(this));
        this.router.post(`${this.path}/idcardUpload`, this.handleAttachment.bind(this));
        this.router.put(`${this.path}/resetPassword`, validationMiddleware(studentResetPasswordSchema), this.resetPassword.bind(this));
        this.router.post(`${this.path}/triggerWelcomeEmail`, this.triggerWelcomeEmail.bind(this));
        this.router.put(`${this.path}/forgotPassword`, validationMiddleware(studentForgotPasswordSchema), this.forgotPassword.bind(this));
        super.initializeRoutes();
    }
    protected async getData(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            throw unauthorized(speeches.ROLE_ACCES_DECLINE)
        }
        try {
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            let { state, year_of_study, group, Gender } = newREQQuery;
            let data: any = {}
            const where: any = {};
            where[`status`] = "ACTIVE";
            if (state !== 'All States' && state !== undefined) {
                where[`state`] = state;
            }
            if (year_of_study !== 'All Categories' && year_of_study !== undefined) {
                where[`year_of_study`] = year_of_study;
            }
            if (group !== 'All Institutions' && group !== undefined) {
                where[`group`] = group;
            }
            if (Gender !== 'All Genders' && Gender !== undefined) {
                where[`Gender`] = Gender;
            }
            const { id } = req.params;
            if (id) {
                const newParamId = await this.authService.decryptGlobal(req.params.id);
                where[`student_id`] = newParamId;
                data = await this.crudService.findOne(student, {
                    where: [where]
                })
            }
            else {
                data = await this.crudService.findAll(student, {
                    where: [where]
                })
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error) {
            next(error);
        }
    }
    protected async updateData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STATE' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { model, id } = req.params;
            if (model) {
                this.model = model;
            };
            const user_id = res.locals.user_id
            const newParamId: any = await this.authService.decryptGlobal(req.params.id);
            const studentTableDetails = await student.findOne(
                {
                    where: {
                        student_id: JSON.parse(newParamId)
                    }
                }
            )
            if (!studentTableDetails) {
                throw notFound(speeches.USER_NOT_FOUND)
            }
            if (studentTableDetails instanceof Error) {
                throw studentTableDetails
            }

            const where: any = {};
            where[`${this.model}_id`] = JSON.parse(newParamId);
            const modelLoaded = await this.loadModel(model);
            req.body['full_name'] = req.body.student_full_name;
            const payload = this.autoFillTrackingColumns(req, res, modelLoaded);
            if (req.body.email) {
                const cryptoEncryptedString = await this.authService.generateCryptEncryption(req.body.email);
                const username = req.body.email;
                const studentDetails = await this.crudService.findOne(user, { where: { username: username } });
                // console.log(studentDetails);

                if (studentDetails) {
                    if (studentDetails.dataValues.username == username) throw badRequest(speeches.USER_EMAIL_EXISTED);
                    if (studentDetails instanceof Error) throw studentDetails;
                };
                const user_data = await this.crudService.update(user, {
                    full_name: payload.full_name,
                    username: username,
                    password: await bcrypt.hashSync(cryptoEncryptedString, process.env.SALT || baseConfig.SALT),
                }, { where: { user_id: studentTableDetails.getDataValue("user_id") } });
                if (!user_data) {
                    throw internal()
                }
                if (user_data instanceof Error) {
                    throw user_data;
                }
            }
            if (req.body.student_full_name) {
                const user_data = await this.crudService.update(user, {
                    full_name: payload.full_name
                }, { where: { user_id: studentTableDetails.getDataValue("user_id") } });
                if (!user_data) {
                    throw internal()
                }
                if (user_data instanceof Error) {
                    throw user_data;
                }
            }
            const student_data = await this.crudService.updateAndFind(modelLoaded, payload, { where: where });
            if (!student_data) {
                throw badRequest()
            }
            if (student_data instanceof Error) {
                throw student_data;
            }

            return res.status(200).send(dispatcher(res, student_data, 'updated'));
        } catch (error) {
            next(error);
        }
    }
    private async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            if (!req.body.role || req.body.role !== 'STUDENT') return res.status(406).send(dispatcher(res, null, 'error', speeches.USER_ROLE_REQUIRED, 406));

            const cryptoEncryptedString = await this.authService.generateCryptEncryption(req.body.passwprd);
            if (!req.body.password || req.body.password === "") req.body.password = cryptoEncryptedString;

            req.body['full_name'] = req.body.student_full_name;
            req.body['username'] = req.body.email;

            const payload = this.autoFillTrackingColumns(req, res, student)
            const result = await this.authService.register(payload);
            if (result.user_res) return res.status(406).send(dispatcher(res, result.user_res.dataValues, 'error', speeches.STUDENT_EXISTS, 406));
            return res.status(201).send(dispatcher(res, result.profile.dataValues, 'success', speeches.USER_REGISTERED_SUCCESSFULLY, 201));
        } catch (err) {
            next(err)
        }
    }
    private async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        let studentDetails: any;
        let result;
        req.body['role'] = 'STUDENT'
        result = await this.authService.login(req.body);
        if (!result) {
            return res.status(404).send(dispatcher(res, result, 'error', speeches.USER_NOT_FOUND));
        } else if (result.error) {
            return res.status(401).send(dispatcher(res, result.error, 'error', speeches.USER_RISTRICTED, 401));
        } else {
            studentDetails = await this.authService.getServiceDetails('student', { user_id: result.data.user_id });
            result.data['institution_name'] = studentDetails.dataValues.institution_name;
            result.data['state'] = studentDetails.dataValues.state;
            result.data['district'] = studentDetails.dataValues.district;
            result.data['student_id'] = studentDetails.dataValues.student_id;
            result.data['user_id'] = studentDetails.dataValues.user_id;
            result.data['id_card'] = studentDetails.dataValues.id_card;
            return res.status(200).send(dispatcher(res, result.data, 'success', speeches.USER_LOGIN_SUCCESS));
        }
    }
    private async logout(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        const result = await this.authService.logout(req.body, res);
        if (result.error) {
            next(result.error);
        } else {
            return res.status(200).send(dispatcher(res, speeches.LOGOUT_SUCCESS, 'success'));
        }
    }
    private async changePassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        const result = await this.authService.changePassword(req.body, res);
        if (!result) {
            return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
        } else if (result.error) {
            return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
        }
        else if (result.match) {
            return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_PASSWORD));
        } else {
            return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
        }
    }
    protected async handleAttachment(req: Request, res: Response, next: NextFunction) {
        try {
            console.log(req);
            const rawfiles: any = req.files;
            const student_user_id: any = req.body.student_id;

            const files: any = Object.values(rawfiles);
            const allowedTypes = ['image/jpeg', 'image/png', 'application/msword', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(files[0].type)) {
                return res.status(400).send(dispatcher(res, '', 'error', 'This file type not allowed', 400));
            }
            const errs: any = [];
            let attachments: any = [];
            let payload: any = [];
            let result: any = {};
            let s3 = new S3({
                apiVersion: '2006-03-01',
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            if (!req.files) {
                return result;
            }
            let file_name_prefix: any;
            if (process.env.DB_HOST?.includes("prod")) {
                file_name_prefix = `student/idCard`
            } else if (process.env.DB_HOST?.includes("dev")) {
                file_name_prefix = `student/idCard/dev`
            } else {
                file_name_prefix = `student/idCard/stage`
            }
            for (const file_name of Object.keys(files)) {
                const file = files[file_name];
                const readFile: any = await fs.readFileSync(file.path);
                if (readFile instanceof Error) {
                    errs.push(`Error uploading file: ${file.originalFilename} err: ${readFile}`)
                }
                file.originalFilename = `${file_name_prefix}/${file.originalFilename}`;
                let params = {
                    Bucket: `${process.env.BUCKET}`,
                    Key: file.originalFilename,
                    Body: readFile
                };
                let options: any = { partSize: 20 * 1024 * 1024, queueSize: 2 };
                await s3.upload(params, options).promise()
                    .then((data: any) => { attachments.push(data.Location) })
                    .catch((err: any) => { errs.push(`Error uploading file: ${file.originalFilename}, err: ${err.message}`) })
                result['attachments'] = attachments;
                result['errors'] = errs;
            }

            payload['id_card'] = attachments[0];
            payload['student_user_id'] = student_user_id;
            result['payload'] = payload;
            // console.log(payload);
            // ["id_card"] = attachments;
            // const payload["id_card"] = attachments;

            const updateIdCard = await this.crudService.updateAndFind(student, payload, {
                where: { student_id: student_user_id }
            });
            if (!updateIdCard) {
                throw internal()
            }
            if (updateIdCard instanceof Error) {
                throw updateIdCard;
            }

            res.status(200).send(dispatcher(res, result));
        } catch (err) {
            next(err)
        }
    }
    private async studentCertificate(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let newREParams: any = {};
            if (req.params) {
                const newParams: any = await this.authService.decryptGlobal(req.params);
                newREParams = JSON.parse(newParams);
            } else {
                newREParams = req.params
            }
            const { model, student_user_id } = newREParams;
            const user_id = res.locals.user_id
            if (model) {
                this.model = model;
            };
            const where: any = {};
            where[`${this.model}_id`] = newREParams.id;
            const modelLoaded = await this.loadModel(model);
            const payload = this.autoFillTrackingColumns(req, res, modelLoaded);
            payload["certificate"] = new Date().toLocaleString();
            const updateCertificate = await this.crudService.updateAndFind(student, payload, {
                where: { student_id: student_user_id }
            });
            if (!updateCertificate) {
                throw internal()
            }
            if (updateCertificate instanceof Error) {
                throw updateCertificate;
            }
            return res.status(200).send(dispatcher(res, updateCertificate, 'Certificate Updated'));
        } catch (error) {
            next(error);
        }
    }
    private async emailOtp(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { email } = req.body;
            if (!email) {
                throw badRequest(speeches.USER_EMAIL_REQUIRED);
            }
            const result = await this.authService.emailOtp(req.body);
            if (result.error) {
                return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
            } else {
                return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.OTP_SEND, 202));
            }
        } catch (error) {
            next(error)
        }
    }
    private async resetPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        const { user_id } = req.body;
        if (!user_id) throw badRequest(speeches.USER_USERID_REQUIRED);
        const findUser: any = await this.crudService.findOne(user, { where: { user_id } });
        if (!findUser) throw badRequest(speeches.USER_NOT_FOUND);
        if (findUser instanceof Error) throw findUser;
        const findStudent: any = await this.crudService.findOne(student, { where: { user_id } });
        const cryptoEncryptedString = await this.authService.generateCryptEncryption(findStudent.dataValues.mobile);
        const passsword = await bcrypt.hashSync(cryptoEncryptedString, process.env.SALT || baseConfig.SALT)
        try {
            req.body['password'] = passsword;
            const result = await this.crudService.update(user, req.body, { where: { user_id } })
            res.status(200).send(dispatcher(res, result, 'accepted', speeches.USER_PASSWORD_CHANGE, 200));
        } catch (error) {
            next(error)
        }
    }
    protected async triggerWelcomeEmail(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const result = await this.authService.triggerWelcome(req.body);
            return res.status(200).send(dispatcher(res, result, 'success'));
        } catch (error) {
            next(error);
        }
    }
    protected async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { email } = req.body;
            if (!email) throw badRequest(speeches.USER_EMAIL_REQUIRED);
            const findStudent: any = await this.crudService.findOne(student, { where: { email } });
            if (!findStudent) throw badRequest(speeches.USER_NOT_FOUND);
            if (findStudent instanceof Error) throw findStudent;
            const user_id = findStudent.dataValues.user_id
            console.log(user_id,"user_id");
            const cryptoEncryptedString = await this.authService.generateCryptEncryption(findStudent.dataValues.mobile);
            const passsword = await bcrypt.hashSync(cryptoEncryptedString, process.env.SALT || baseConfig.SALT)
            req.body['password'] = passsword;
            await this.crudService.update(user, req.body, { where: { user_id } })
            const otpOBJ = await this.authService.triggerEmail(email, 3, findStudent.dataValues.mobile);
            return res.status(200).send(dispatcher(res, otpOBJ, 'success'));
        } catch (error) {
            next(error);
        }
    }
}

