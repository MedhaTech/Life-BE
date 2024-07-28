import bcrypt from 'bcrypt';
import axios from 'axios';
import fs from 'fs';
import * as csv from "fast-csv";
import { Op, QueryTypes } from 'sequelize';
import { Request, Response, NextFunction } from 'express';
import { customAlphabet } from 'nanoid';
import { speeches } from '../configs/speeches.config';
import { baseConfig } from '../configs/base.config';
import { user } from '../models/user.model';
import db from "../utils/dbconnection.util"
import { mentorRegSchema, mentorSchema, mentorUpdateSchema } from '../validations/mentor.validationa';
import dispatcher from '../utils/dispatch.util';
import authService from '../services/auth.service';
import BaseController from './base.controller';
import ValidationsHolder from '../validations/validationHolder';
import { badRequest, forbidden, internal, notFound } from 'boom';
import { mentor } from '../models/mentor.model';
import { where } from 'sequelize/types';
import { mentor_topic_progress } from '../models/mentor_topic_progress.model';
import { quiz_survey_response } from '../models/quiz_survey_response.model';
import { quiz_response } from '../models/quiz_response.model';
import { team } from '../models/team.model';
import { student } from '../models/student.model';
import { constents } from '../configs/constents.config';
import { organization } from '../models/organization.model';
import validationMiddleware from '../middlewares/validation.middleware';
import { institutions } from '../models/institutions.model';
import { places } from '../models/places.model';
import { blocks } from '../models/blocks.model';
import { taluks } from '../models/taluks.model';
import { districts } from '../models/districts.model';
import { states } from '../models/states.model';
import { institution_types } from '../models/institution_types.model';
import { ideas } from '../models/ideas.model';

export default class MentorController extends BaseController {
    model = "mentor";
    authService: authService = new authService;
    private password = process.env.GLOBAL_PASSWORD;
    private nanoid = customAlphabet('0123456789', 6);
    protected initializePath(): void {
        this.path = '/mentors';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(mentorSchema, mentorUpdateSchema);
    }
    protected initializeRoutes(): void {
        //example route to add
        //this.router.get(`${this.path}/`, this.getData);
        this.router.post(`${this.path}/register`, validationMiddleware(mentorRegSchema), this.register.bind(this));
        this.router.post(`${this.path}/validateOtp`, this.validateOtp.bind(this));
        this.router.post(`${this.path}/login`, this.login.bind(this));
        this.router.get(`${this.path}/logout`, this.logout.bind(this));
        this.router.put(`${this.path}/changePassword`, this.changePassword.bind(this));
        this.router.put(`${this.path}/updatePassword`, this.updatePassword.bind(this));
        this.router.put(`${this.path}/verifyUser`, this.verifyUser.bind(this));
        this.router.put(`${this.path}/updateMobile`, this.updateMobile.bind(this));
        this.router.delete(`${this.path}/:mentor_user_id/deleteAllData`, this.deleteAllData.bind(this));
        this.router.put(`${this.path}/resetPassword`, this.resetPassword.bind(this));
        this.router.put(`${this.path}/manualResetPassword`, this.manualResetPassword.bind(this));
        this.router.get(`${this.path}/regStatus`, this.getMentorRegStatus.bind(this));
        this.router.post(`${this.path}/bulkUpload`, this.bulkUpload.bind(this));
        this.router.post(`${this.path}/mobileOtp`, this.mobileOpt.bind(this));
        this.router.get(`${this.path}/mentorpdfdata`, this.mentorpdfdata.bind(this));
        this.router.post(`${this.path}/triggerWelcomeEmail`, this.triggerWelcomeEmail.bind(this));
        super.initializeRoutes();
    }
    protected async autoFillUserDataForBulkUpload(req: Request, res: Response, modelLoaded: any, reqData: any = null) {
        let payload = reqData;
        if (modelLoaded.rawAttributes.user_id !== undefined) {
            const userData = await this.crudService.create(user, { username: reqData.username, ...reqData });
            payload['user_id'] = userData.dataValues.user_id;
        }
        if (modelLoaded.rawAttributes.created_by !== undefined) {
            payload['created_by'] = res.locals.user_id;
        }
        if (modelLoaded.rawAttributes.updated_by !== undefined) {
            payload['updated_by'] = res.locals.user_id;
        }
        return payload;
    }
    protected async getMentorRegStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { quiz_survey_id } = req.params
            const { page, size, status } = newREQQuery;
            let condition = {}
            // condition = status ? { status: { [Op.like]: `%${status}%` } } : null;
            const { limit, offset } = this.getPagination(page, size);

            const paramStatus: any = newREQQuery.status;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let boolStatusWhereClauseRequired = false;
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    boolStatusWhereClauseRequired = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    boolStatusWhereClauseRequired = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                boolStatusWhereClauseRequired = true;
            }
            const mentorsResult = await organization.findAll({
                attributes: [
                    "organization_code",
                    "organization_name",
                    "city",
                    "district",
                    "state",
                    "country"
                ],
                where: {
                    [Op.and]: [
                        whereClauseStatusPart,
                        condition
                    ]
                },
                include: [
                    {
                        model: mentor, attributes: [
                            "mobile",
                            "full_name",
                            "mentor_id",
                            "created_by",
                            "created_at",
                            "updated_at",
                            "updated_by"
                        ],
                        include: [
                            {
                                model: user, attributes: [
                                    "username",
                                    "user_id"
                                ]
                            }
                        ]
                    }
                ],
                limit, offset
            });
            if (!mentorsResult) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (mentorsResult instanceof Error) {
                throw mentorsResult
            }
            res.status(200).send(dispatcher(res, mentorsResult, "success"))
        } catch (err) {
            next(err)
        }
    }

    //TODO: Override the getDate function for mentor and join org details and user details
    protected async getData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STATE' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let data: any;
            const { model, id } = req.params;
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const paramStatus: any = newREQQuery.status;
            if (model) {
                this.model = model;
            };
            // const current_user = res.locals.user_id; 
            // pagination
            const { page, size, status } = newREQQuery;
            // let condition = status ? { status: { [Op.like]: `%${status}%` } } : null;
            const { limit, offset } = this.getPagination(page, size);
            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            const where: any = {};
            let whereClauseStatusPart: any = {};
            let boolStatusWhereClauseRequired = false;
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    boolStatusWhereClauseRequired = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    boolStatusWhereClauseRequired = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                boolStatusWhereClauseRequired = true;
            };

            let district_name: any = newREQQuery.district_name;

            if (id) {
                const deValue: any = await this.authService.decryptGlobal(req.params.id);
                where[`${this.model}_id`] = JSON.parse(deValue);
                data = await this.crudService.findOne(modelClass, {
                    attributes: [
                        "mentor_id",
                        "financial_year_id",
                        "user_id",
                        "institution_id",
                        "mentor_title",
                        "mentor_name",
                        "mentor_name_vernacular",
                        "mentor_mobile",
                        "mentor_whatapp_mobile",
                        "mentor_email",
                        "date_of_birth",
                        "gender"
                    ],
                    where: {
                        [Op.and]: [
                            whereClauseStatusPart,
                            where,
                        ]
                    },
                    include:
                    {
                        model: institutions,
                        attributes: [
                            "institution_id",
                            "institution_code",
                            "institution_name",
                            "institution_name_vernacular"
                        ],
                        include: [
                            {
                                model: places,
                                attributes: [
                                    'place_id',
                                    'place_type',
                                    'place_name',
                                    'place_name_vernacular'
                                ],
                                include: [{
                                    model: blocks,
                                    attributes: [
                                        'block_id',
                                        'block_name',
                                        'block_name_vernacular'
                                    ],
                                    include: {
                                        model: districts,
                                        attributes: [
                                            'district_id',
                                            'district_name',
                                            'district_name_vernacular',
                                            'district_headquarters',
                                            'district_headquarters_vernacular'
                                        ],
                                        include: {
                                            model: states,
                                            attributes: [
                                                'state_id',
                                                'state_name',
                                                'state_name_vernacular'
                                            ]
                                        }
                                    }
                                },
                                {
                                    model: taluks,
                                    attributes: [
                                        'taluk_id',
                                        'taluk_name',
                                        'taluk_name_vernacular'

                                    ],
                                }]
                            }
                        ]
                    }
                });
            } else {
                try {
                    let whereText
                    if (district_name !== 'All Districts') {
                        whereText = `and d.district_name = '${district_name}'`
                    } else {
                        whereText = ''
                    }
                    const responseOfFindAndCountAll = await db.query(`SELECT 
                    mentor_id,
                    financial_year_id,
                    user_id,
                    ins.institution_id,
                    mentor_title,
                    mentor_name,
                    mentor_name_vernacular,
                    mentor_mobile,
                    mentor_whatapp_mobile,
                    mentor_email,
                    date_of_birth,
                    gender,
                    institution_code,
                    institution_name,
                    place_type,
                    place_name,
                    taluk_name,
                    block_name,
                    district_name,
                    district_headquarters,
                    state_name
                FROM
                    mentors AS m
                        LEFT JOIN
                    institutions AS ins ON m.institution_id = ins.institution_id
                        LEFT JOIN
                    places AS p ON ins.place_id = p.place_id
                        LEFT JOIN
                    blocks AS b ON p.block_id = b.block_id
                        LEFT JOIN
                    districts AS d ON b.district_id = d.district_id
                        LEFT JOIN
                    taluks AS t ON p.taluk_id = t.taluk_id
                        LEFT JOIN
                    states AS s ON d.state_id = s.state_id
                WHERE
                    ins.status = 'ACTIVE' ${whereText};`, { type: QueryTypes.SELECT })
                    data = responseOfFindAndCountAll;
                } catch (error: any) {
                    return res.status(500).send(dispatcher(res, data, 'error'))
                }

            }
            // if (!data) {
            //     return res.status(404).send(dispatcher(res,data, 'error'));
            // }
            if (!data || data instanceof Error) {
                if (data != null) {
                    throw notFound(data.message)
                } else {
                    throw notFound()
                }
                res.status(200).send(dispatcher(res, null, "error", speeches.DATA_NOT_FOUND));
                // if(data!=null){
                //     throw 
                (data.message)
                // }else{
                //     throw notFound()
                // }
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
            req.body['full_name'] = req.body.mentor_name;
            const user_id = res.locals.user_id
            const where: any = {};
            const newParamId = await this.authService.decryptGlobal(req.params.id);
            where[`${this.model}_id`] = newParamId;
            const modelLoaded = await this.loadModel(model);
            const payload = this.autoFillTrackingColumns(req, res, modelLoaded)
            const findMentorDetail = await this.crudService.findOne(modelLoaded, { where: where });
            if (!findMentorDetail || findMentorDetail instanceof Error) {
                throw notFound();
            } else {
                const mentorData = await this.crudService.update(modelLoaded, payload, { where: where });
                const userData = await this.crudService.update(user, payload, { where: { user_id: findMentorDetail.dataValues.user_id } });
                if (!mentorData || !userData) {
                    throw badRequest()
                }
                if (mentorData instanceof Error) {
                    throw mentorData;
                }
                if (userData instanceof Error) {
                    throw userData;
                }
                const data = { userData, mentor };
                return res.status(200).send(dispatcher(res, data, 'updated'));
            }
        } catch (error) {
            next(error);
        }
    }
    // TODO: update the register flow by adding a flag called reg_statue in mentor tables
    private async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (!req.body.institution_code || req.body.institution_code === "") return res.status(406).send(dispatcher(res, speeches.ORG_CODE_REQUIRED, 'error', speeches.NOT_ACCEPTABLE, 406));
        const org = await this.authService.checkOrgDetails(req.body.institution_code);
        if (!org) {
            return res.status(406).send(dispatcher(res, org, 'error', speeches.ORG_CODE_NOT_EXISTS, 406));
        }
        if (!req.body.role || req.body.role !== 'MENTOR') {
            return res.status(406).send(dispatcher(res, null, 'error', speeches.USER_ROLE_REQUIRED, 406));
        }
        req.body['reg_status'] = '3';
        req.body['full_name'] = req.body.mentor_name;
        req.body['financial_year_id'] = 1;
        if (!req.body.password || req.body.password == null) req.body.password = '';
        const result: any = await this.authService.mentorRegister(req.body);
        if (result && result.output && result.output.payload && result.output.payload.message == 'Email') {
            return res.status(406).send(dispatcher(res, result.data, 'error', speeches.MENTOR_EXISTS, 406));
        }
        if (result && result.output && result.output.payload && result.output.payload.message == 'Mobile') {
            return res.status(406).send(dispatcher(res, result.data, 'error', speeches.MOBILE_EXISTS, 406));
        }
        // // const otp = await this.authService.generateOtp();
        // let otp = await this.authService.triggerOtpMsg(req.body.mobile); //async function but no need to await ...since we yet do not care about the outcome of the sms trigger ....!!this may need to change later on ...!!
        // otp = String(otp)
        // let hashString = await this.authService.generateCryptEncryption(otp);
        // const updatePassword = await this.authService.crudService.update(user,
        //     { password: await bcrypt.hashSync(hashString, process.env.SALT || baseConfig.SALT) },
        //     { where: { user_id: result.dataValues.user_id } });
        // const findMentorDetailsAndUpdateOTP: any = await this.crudService.updateAndFind(mentor,
        //     { otp: otp },
        //     { where: { user_id: result.dataValues.user_id } }
        // );
        const data = result.dataValues;
        return res.status(201).send(dispatcher(res, data, 'success', speeches.USER_REGISTERED_SUCCESSFULLY, 201));
        //res.status(400).send(dispatcher(res, '', 'error', 'Registration has closed', 400));
    }

    // TODO: Update flag reg_status on success validate the OTP
    private async validateOtp(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        const user_res = await this.authService.validatedOTP(req.body);
        if (!user_res) {
            res.status(404).send(dispatcher(res, null, 'error', speeches.OTP_FAIL))
        } else {
            res.status(200).send(dispatcher(res, user_res, 'success', speeches.OTP_FOUND))
        }
    }

    private async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        req.body['role'] = 'MENTOR'
        try {
            const result = await this.authService.login(req.body);
            if (!result) {
                return res.status(404).send(dispatcher(res, result, 'error', speeches.USER_NOT_FOUND));
            }
            else {
                const mentorData = await this.authService.crudService.findOne(mentor, {
                    where: { user_id: result.data.user_id },
                    include: {
                        model: institutions
                    }
                });
                if (!mentorData || mentorData instanceof Error) {
                    return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_REG_STATUS));
                }
                if (mentorData.dataValues.reg_status !== '3') {
                    return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_REG_STATUS));
                }
                result.data['mentor_id'] = mentorData.dataValues.mentor_id;
                result.data['institution_name'] = mentorData.dataValues.institution.dataValues.institution_name;
                result.data['mentor_title'] = mentorData.dataValues.mentor_title;
                result.data['institution_id'] = mentorData.dataValues.institution.dataValues.institution_id;
                return res.status(200).send(dispatcher(res, result.data, 'success', speeches.USER_LOGIN_SUCCESS));
            }
        } catch (error) {
            return res.status(401).send(dispatcher(res, error, 'error', speeches.USER_RISTRICTED, 401));
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
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR') {
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

    //TODO: Update flag reg_status on successful changed password
    private async updatePassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        const result = await this.authService.updatePassword(req.body, res);
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

    private async verifyUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const mobile = req.body.mobile;
            if (!mobile) {
                throw badRequest(speeches.MOBILE_NUMBER_REQUIRED);
            }
            const result = await this.authService.verifyUser(req.body, res);
            if (!result) {
                return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
            } else if (result.error) {
                return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
            } else {
                return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
            }
        } catch (err) {
            next(err);
        }
    }
    //TODO: ADD API to update the mobile number and trigger OTP,
    private async updateMobile(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { mobile } = req.body;
            if (!mobile) {
                throw badRequest(speeches.MOBILE_NUMBER_REQUIRED);
            }
            const result = await this.authService.mobileUpdate(req.body);
            if (!result) {
                return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
            } else if (result.error) {
                return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
            } else {
                return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_MOBILE_CHANGE, 202));
            }
        } catch (error) {
            next(error)
        }
    }
    //TODO: test this api and debug and fix any issues in testing if u see any ...!!
    private async deleteAllData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const mentor_user_id: any = await this.authService.decryptGlobal(req.params.mentor_user_id);
            // const { mobile } = req.body;
            if (!mentor_user_id) {
                throw badRequest(speeches.USER_USERID_REQUIRED);
            }

            //get mentor details
            const mentorResult: any = await this.crudService.findOne(mentor, { where: { user_id: mentor_user_id } })
            if (!mentorResult) {
                throw internal(speeches.DATA_CORRUPTED)
            }
            if (mentorResult instanceof Error) {
                throw mentorResult
            }
            const mentor_id = mentorResult.dataValues.mentor_id
            if (!mentor_id) {
                throw internal(speeches.DATA_CORRUPTED + ":" + speeches.MENTOR_NOT_EXISTS)
            }
            const deleteMentorResponseResult = await this.authService.bulkDeleteMentorResponse(mentor_user_id)
            if (!deleteMentorResponseResult) {
                throw internal("error while deleting mentor response")
            }
            if (deleteMentorResponseResult instanceof Error) {
                throw deleteMentorResponseResult
            }

            //get team details
            const teamResult: any = await team.findAll({
                attributes: ["team_id"],
                where: { mentor_id: mentor_id },
                raw: true
            })
            if (!teamResult) {
                throw internal(speeches.DATA_CORRUPTED)
            }
            if (teamResult instanceof Error) {
                throw teamResult
            }

            const arrayOfteams = teamResult.map((teamSingleresult: any) => {
                return teamSingleresult.team_id;
            })

            const resultIdeasDelete = await this.crudService.delete(ideas, { where: { team_id: arrayOfteams } })
            if (resultIdeasDelete instanceof Error) {
                throw resultIdeasDelete
            }

            if (arrayOfteams && arrayOfteams.length > 0) {
                const studentUserIds = await student.findAll({
                    where: { team_id: arrayOfteams },
                    raw: true,
                    attributes: ["user_id"]
                })

                if (studentUserIds && !(studentUserIds instanceof Error)) {
                    const arrayOfStudentuserIds = studentUserIds.map((student) => student.user_id)

                    for (var i = 0; i < arrayOfStudentuserIds.length; i++) {
                        const deletStudentResponseData = await this.authService.bulkDeleteUserResponse(arrayOfStudentuserIds[i])
                        if (deletStudentResponseData instanceof Error) {
                            throw deletStudentResponseData;
                        }
                    };
                    const resultBulkDeleteStudents = await this.authService.bulkDeleteUserWithStudentDetails(arrayOfStudentuserIds)
                    // console.log("resultBulkDeleteStudents",resultBulkDeleteStudents)
                    // if(!resultBulkDeleteStudents){
                    //     throw internal("error while deleteing students")
                    // }
                    if (resultBulkDeleteStudents instanceof Error) {
                        throw resultBulkDeleteStudents
                    }
                }

                const resultTeamDelete = await this.crudService.delete(team, { where: { team_id: arrayOfteams } })
                // if(!resultTeamDelete){
                //     throw internal("error while deleting team")
                // }
                if (resultTeamDelete instanceof Error) {
                    throw resultTeamDelete
                }
            }
            let resultmentorDelete: any = {};
            resultmentorDelete = await this.authService.bulkDeleteUserWithMentorDetails([mentor_user_id])
            // if(!resultmentorDelete){
            //     throw internal("error while deleting mentor")
            //}
            if (resultmentorDelete instanceof Error) {
                throw resultmentorDelete
            }

            // if (!resultmentorDelete) {
            //     return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
            // } else 
            if (resultmentorDelete.error) {
                return res.status(404).send(dispatcher(res, resultmentorDelete.error, 'error', resultmentorDelete.error));
            } else {
                return res.status(202).send(dispatcher(res, resultmentorDelete.dataValues, 'success', speeches.USER_DELETED, 202));
            }
        } catch (error) {
            next(error)
        }
    }
    private async mobileOpt(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { mobile } = req.body;
            if (!mobile) {
                throw badRequest(speeches.MOBILE_NUMBER_REQUIRED);
            }
            const result = await this.authService.mobileotp(req.body);
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
        try {
            const { mobile, username, otp } = req.body;
            let otpCheck = typeof otp == 'boolean' && otp == false ? otp : true;
            if (otpCheck) {
                if (!mobile) {
                    throw badRequest(speeches.MOBILE_NUMBER_REQUIRED);
                }
            } else {
                if (!username) {
                    throw badRequest(speeches.MOBILE_NUMBER_REQUIRED);
                }
            }
            const result = await this.authService.mentorResetPassword(req.body);
            if (!result) {
                return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
            } else if (result.error) {
                return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
            } else {
                return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_MOBILE_CHANGE, 202));
            }
        } catch (error) {
            next(error)
        }
    }
    private async manualResetPassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        // accept the user_id or user_name from the req.body and update the password in the user table
        // perviously while student registration changes we have changed the password is changed to random generated UUID and stored and send in the payload,
        // now reset password use case is to change the password using user_id to some random generated ID and update the UUID also
        const randomGeneratedSixDigitID: any = this.nanoid();
        const cryptoEncryptedString = await this.authService.generateCryptEncryption(randomGeneratedSixDigitID);
        try {
            const { user_id } = req.body;
            req.body['otp'] = randomGeneratedSixDigitID;
            req.body['encryptedString'] = cryptoEncryptedString;
            if (!user_id) throw badRequest(speeches.USER_USERID_REQUIRED);
            const result = await this.authService.manualMentorResetPassword(req.body);
            if (!result) return res.status(404).send(dispatcher(res, null, 'error', speeches.USER_NOT_FOUND));
            else if (result.error) return res.status(404).send(dispatcher(res, result.error, 'error', result.error));
            else return res.status(202).send(dispatcher(res, result.data, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
        } catch (error) {
            next(error)
        }
        // const generatedUUID = this.nanoid();
        // req.body['generatedPassword'] = generatedUUID;
        // const result = await this.authService.restPassword(req.body, res);
        // if (!result) {
        //     return res.status(404).send(dispatcher(res, result.user_res, 'error', speeches.USER_NOT_FOUND));
        // } else if (result.match) {
        //     return res.status(404).send(dispatcher(res, result.match, 'error', speeches.USER_PASSWORD));
        // } else {
        //     return res.status(202).send(dispatcher(res, result, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
        // }
    };
    protected async bulkUpload(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        //@ts-ignore
        let file = req.files.file;
        let Errors: any = [];
        let bulkData: any = [];
        let requestData: any = [];
        let counter: number = 0;
        let existedEntities: number = 0;
        let dataLength: number;
        let payload: any;
        let loadMode: any = await this.loadModel(this.model);
        let role = 'MENTOR'
        if (file === undefined) return res.status(400).send(dispatcher(res, null, 'error', speeches.FILE_REQUIRED, 400));
        if (file.type !== 'text/csv') return res.status(400).send(dispatcher(res, null, 'error', speeches.FILE_REQUIRED, 400));
        //parsing the data
        const stream = fs.createReadStream(file.path).pipe(csv.parse({ headers: true }));
        //error event
        stream.on('error', (error) => res.status(400).send(dispatcher(res, error, 'error', speeches.CSV_SEND_ERROR, 400)));
        //data event;
        stream.on('data', async (data: any) => {
            dataLength = Object.entries(data).length;
            for (let i = 0; i < dataLength; i++) {
                // if (Object.entries(data)[i][0] === 'email')
                // Object.entries(data)[i][0].replace('email', 'username')
                // console.log(Object.entries(data)[i][0])
                if (Object.entries(data)[i][1] === '') {
                    Errors.push(badRequest('missing fields', data));
                    return;
                }
                requestData = data
                //@ts-ignore
                if (Object.entries(data)[i][0] === 'email') {
                    requestData['username'] = Object.entries(data)[i][1];
                }
            }
            bulkData.push(requestData);
        })
        //parsing completed
        stream.on('end', async () => {
            if (Errors.length > 0) next(badRequest(Errors.message));
            for (let data = 0; data < bulkData.length; data++) {
                const match = await this.crudService.findOne(user, { where: { username: bulkData[data]['username'] } });
                if (match) {
                    existedEntities++;
                } else {
                    counter++;
                    const cryptoEncryptedPassword = await this.authService.generateCryptEncryption(bulkData[data]['mobile']);
                    payload = await this.autoFillUserDataForBulkUpload(req, res, loadMode, {
                        ...bulkData[data], role,
                        password: cryptoEncryptedPassword,
                        qualification: cryptoEncryptedPassword,
                        reg_status: '3'
                    });
                    bulkData[data] = payload;
                };
            }
            // console.log(bulkData)
            if (counter > 0) {
                await this.crudService.bulkCreate(loadMode, bulkData)
                    .then((result) => {
                        // let mentorData = {...bulkData, user_id: result.user_id}
                        // await this.crudService.bulkCreate(user, bulkData)
                        return res.send(dispatcher(res, { data: result, createdEntities: counter, existedEntities }, 'success', speeches.CREATED_FILE, 200));
                    }).catch((error: any) => {
                        return res.status(500).send(dispatcher(res, error, 'error', speeches.CSV_SEND_INTERNAL_ERROR, 500));
                    })
            } else if (existedEntities > 0) {
                return res.status(400).send(dispatcher(res, { createdEntities: counter, existedEntities }, 'error', speeches.CSV_DATA_EXIST, 400));
            }
        });
    }
    protected async mentorpdfdata(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STATE') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let data: any = {};
            const { model } = req.params;
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const id = newREQQuery.id;
            const user_id = newREQQuery.user_id;
            const paramStatus: any = newREQQuery.status;
            if (model) {
                this.model = model;
            };

            const modelClass = await this.loadModel(model).catch(error => {
                next(error)
            });
            const where: any = {};
            let whereClauseStatusPart: any = {};
            let boolStatusWhereClauseRequired = false;
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                if (paramStatus === 'ALL') {
                    whereClauseStatusPart = {};
                    boolStatusWhereClauseRequired = false;
                } else {
                    whereClauseStatusPart = { "status": paramStatus };
                    boolStatusWhereClauseRequired = true;
                }
            } else {
                whereClauseStatusPart = { "status": "ACTIVE" };
                boolStatusWhereClauseRequired = true;
            };
            where[`mentor_id`] = id;
            data['mentorData'] = await this.crudService.findOne(modelClass, {
                where: {
                    [Op.and]: [
                        whereClauseStatusPart,
                        where,
                    ]
                },
                attributes: ['mentor_id',
                    "user_id",
                    "full_name",
                    "mobile"],
                include: {
                    model: organization,
                    attributes: [
                        "organization_code",
                        "organization_name",
                        "district",
                        "category"
                    ]
                },
            });
            const currentProgress = await db.query(`SELECT count(*)as currentValue FROM unisolve_db.mentor_topic_progress where user_id = ${user_id}`, { type: QueryTypes.SELECT })
            data['currentProgress'] = Object.values(currentProgress[0]).toString();
            data['totalProgress'] = baseConfig.MENTOR_COURSE
            data['quizscores'] = await db.query(`SELECT score FROM unisolve_db.quiz_responses where user_id = ${user_id}`, { type: QueryTypes.SELECT })
            data['teamsCount'] = await db.query(`SELECT count(*) as teams_count FROM teams where mentor_id = ${id}`, { type: QueryTypes.SELECT });
            data['studentCount'] = await db.query(`SELECT count(*) as student_count FROM students join teams on students.team_id = teams.team_id  where mentor_id = ${id};`, { type: QueryTypes.SELECT });
            data['IdeaCount'] = await db.query(`SELECT count(*) as idea_count FROM challenge_responses join teams on challenge_responses.team_id = teams.team_id where mentor_id = ${id} && challenge_responses.status = 'SUBMITTED';`, { type: QueryTypes.SELECT });
            if (!data || data instanceof Error) {
                if (data != null) {
                    throw notFound(data.message)
                } else {
                    throw notFound()
                }
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error) {
            next(error);
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
};

