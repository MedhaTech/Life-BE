import { Request, Response, NextFunction } from 'express';

import { speeches } from '../configs/speeches.config';
import dispatcher from '../utils/dispatch.util';
import authService from '../services/auth.service';
import BaseController from './base.controller';
import ValidationsHolder from '../validations/validationHolder';
import { user } from '../models/user.model';
import { admin } from '../models/admin.model';
import { adminRegSchema, adminSchema, adminUpdateSchema } from '../validations/admins.validationa';
import { badRequest, notFound, unauthorized } from 'boom';
import db from "../utils/dbconnection.util"
import { QueryTypes } from 'sequelize';
import validationMiddleware from '../middlewares/validation.middleware';

export default class AdminController extends BaseController {
    model = "admin";
    authService: authService = new authService;
    private password = process.env.GLOBAL_PASSWORD;

    protected initializePath(): void {
        this.path = '/admins';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(adminSchema, adminUpdateSchema);
    }
    protected initializeRoutes(): void {
        //example route to add
        //this.router.get(`${this.path}/`, this.getData);
        this.router.post(`${this.path}/register`, validationMiddleware(adminRegSchema), this.register.bind(this));
        this.router.post(`${this.path}/login`, this.login.bind(this));
        this.router.get(`${this.path}/logout`, this.logout.bind(this));
        this.router.put(`${this.path}/changePassword`, this.changePassword.bind(this));
        this.router.post(`${this.path}/IdeaInDraftEmail`, this.IdeaInDraftEmail.bind(this));
        this.router.post(`${this.path}/IdeaNotInitiatedEmail`, this.IdeaNotInitiatedEmail.bind(this));

        super.initializeRoutes();
    }
    protected getData(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN') {
            throw unauthorized(speeches.ROLE_ACCES_DECLINE)
        }
        return super.getData(req, res, next, [],
            [
                "admin_id",
                "date_of_birth",
                "district",
                "state",
                "country",
                "status"
            ], {
            attributes: [
                "user_id",
                "username",
                "full_name",
                "role"
            ], model: user, required: false
        }
        );
    }

    protected async updateData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { model, id } = req.params;
            if (model) {
                this.model = model;
            };
            const user_id = res.locals.user_id
            const where: any = {};
            const newParamId = await this.authService.decryptGlobal(req.params.id);
            where[`${this.model}_id`] = newParamId;
            const modelLoaded = await this.loadModel(model);
            const payload = this.autoFillTrackingColumns(req, res, modelLoaded)
            const findAdminDetail = await this.crudService.findOne(modelLoaded, { where: where });
            if (!findAdminDetail || findAdminDetail instanceof Error) {
                throw notFound();
            } else {
                const adminData = await this.crudService.update(modelLoaded, payload, { where: where });
                const userData = await this.crudService.update(user, payload, { where: { user_id: findAdminDetail.dataValues.user_id } } );
                if (!adminData || !userData) {
                    throw badRequest()
                }
                if (adminData instanceof Error) {
                    throw adminData;
                }
                if (userData instanceof Error) {
                    throw userData;
                }
                const data = { userData, admin };
                return res.status(200).send(dispatcher(res, data, 'updated'));
            }
        } catch (error) {
            next(error);
        }
    }

    private async register(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (!req.body.username || req.body.username === "") req.body.username = req.body.full_name.replace(/\s/g, '');
        if (!req.body.password || req.body.password === "") req.body.password = this.password;
        if (req.body.role == 'ADMIN' || req.body.role == 'EADMIN') {
            const result = await this.authService.register(req.body);
            if (result.user_res) return res.status(406).send(dispatcher(res, result.user_res.dataValues, 'error', speeches.ADMIN_EXISTS, 406));
            return res.status(201).send(dispatcher(res, result.profile.dataValues, 'success', speeches.USER_REGISTERED_SUCCESSFULLY, 201));
        }
        return res.status(406).send(dispatcher(res, null, 'error', speeches.USER_ROLE_REQUIRED, 406));
    }

    private async login(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        let adminDetails: any;
        let newREQQuery: any = {}
        if (req.query.Data) {
            let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
            newREQQuery = JSON.parse(newQuery);
        } else if (Object.keys(req.query).length !== 0) {
            return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
        }
        if (newREQQuery.eAdmin && newREQQuery.eAdmin == 'true') { req.body['role'] = 'EADMIN' } else if (newREQQuery.report && newREQQuery.report == 'true') { req.body['role'] = 'REPORT' } else { req.body['role'] = 'ADMIN' }
        const result = await this.authService.login(req.body);
        if (!result) {
            return res.status(404).send(dispatcher(res, result, 'error', speeches.USER_NOT_FOUND));
        } else if (result.error) {
            return res.status(401).send(dispatcher(res, result.error, 'error', speeches.USER_RISTRICTED, 401));
        } else {
            adminDetails = await this.authService.getServiceDetails('admin', { user_id: result.data.user_id });
            if (!adminDetails) {
                result.data['admin_id'] = null;
            } else {
                result.data['admin_id'] = adminDetails.dataValues.admin_id;
            }
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
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN') {
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
    // private async updatePassword(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     const result = await this.authService.updatePassword(req.body, res);
    //     if (!result) {
    //         return res.status(404).send(dispatcher(res,null, 'error', speeches.USER_NOT_FOUND));
    //     } else if (result.error) {
    //         return res.status(404).send(dispatcher(res,result.error, 'error', result.error));
    //     }
    //     else if (result.match) {
    //         return res.status(404).send(dispatcher(res,null, 'error', speeches.USER_PASSWORD));
    //     } else {
    //         return res.status(202).send(dispatcher(res,result.data, 'accepted', speeches.USER_PASSWORD_CHANGE, 202));
    //     }
    // }
    private async IdeaInDraftEmail(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { date } = req.body;
            let data: any = {}
            const contentText = `
            <body style="border: solid;margin-right: 15%;margin-left: 15%; ">
        <img src="https://aim-email-images.s3.ap-south-1.amazonaws.com/ATL-Marathon-Banner-1000X450px.jpg" alt="header" style="width: 100%;" />
        <div style="padding: 1% 5%;">
        <h3>Dear Team Members,</h3>

            <p>As the Last date to submit your project in ATL Marathon 23-24 is ${date} , we noticed that your team is yet to submit the idea.</p>

            <p>Project submission status : InDraft</p>
            <p>Please ensure that idea details are fully updated and submitted on or before the deadline.</p>

            <p>Looking forward for your brilliant project works. Thank you for participating In ATL Marathon.</p>
            <p>
            <strong>
            Regards,<br>
            ATL Marathon</strong></p></div></body>`;
            const subject = `ATL Marathon Idea submission is incomplete`
            const summary = await db.query(`SELECT 
            GROUP_CONCAT(username
                SEPARATOR ', ') AS all_usernames
        FROM
            (SELECT DISTINCT
                u.username
            FROM
                challenge_responses AS cal
            JOIN teams AS t ON cal.team_id = t.team_id
            JOIN mentors AS m ON t.mentor_id = m.mentor_id
            JOIN users AS u ON m.user_id = u.user_id
            WHERE
                cal.status = 'DRAFT' UNION ALL SELECT 
                u.username
            FROM
                challenge_responses AS cal
            JOIN users AS u ON cal.initiated_by = u.user_id
            WHERE
                cal.status = 'DRAFT') AS combined_usernames;`, { type: QueryTypes.SELECT });
            data = summary;
            const usernameArray = data[0].all_usernames;
            let arrayOfUsernames = usernameArray.split(', ');
            const result = await this.authService.triggerBulkEmail(arrayOfUsernames, contentText, subject);
            return res.status(200).send(dispatcher(res, result, 'Email sent'));
        } catch (error) {
            next(error);
        }
    }
    private async IdeaNotInitiatedEmail(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { date } = req.body;
            let data: any = {}
            const contentText = `
            <body style="border: solid;margin-right: 15%;margin-left: 15%; ">
        <img src="https://aim-email-images.s3.ap-south-1.amazonaws.com/ATL-Marathon-Banner-1000X450px.jpg" alt="header" style="width: 100%;" />
        <div style="padding: 1% 5%;">
        <h3>Dear Team Members,</h3>

            <p>As the Last date to submit your project in ATL Marathon 23-24 is ${date} , we noticed that your team is yet to submit the idea.</p>

            <p>Project submission status : Not Initiated</p>
            <p>Please ensure that idea details are fully updated and submitted on or before the deadline.</p>

            <p>Looking forward for your brilliant project works. Thank you for participating In ATL Marathon.</p>
            <p>
            <strong>
            Regards,<br>
            ATL Marathon</strong></p></div></body>`;
            const subject = `ATL Marathon Idea submission is incomplete`
            const summary = await db.query(`SELECT 
            GROUP_CONCAT(username
                SEPARATOR ', ') AS all_usernames
        FROM
            (SELECT DISTINCT
                u.username
            FROM
                (SELECT 
                team_id
            FROM
                teams
            WHERE
                team_id NOT IN (SELECT 
                        team_id
                    FROM
                        challenge_responses)) AS st
            JOIN teams AS t ON st.team_id = t.team_id
            JOIN mentors AS m ON t.mentor_id = m.mentor_id
            JOIN users AS u ON m.user_id = u.user_id UNION ALL SELECT 
                u.username
            FROM
                (SELECT 
                team_id
            FROM
                teams
            WHERE
                team_id NOT IN (SELECT 
                        team_id
                    FROM
                        challenge_responses)) AS st
            JOIN students AS s ON st.team_id = s.team_id
            JOIN users AS u ON s.user_id = u.user_id) AS combined_usernames;`, { type: QueryTypes.SELECT });
            data = summary;
            const usernameArray = data[0].all_usernames;
            let arrayOfUsernames = usernameArray.split(', ');

            const result = await this.authService.triggerBulkEmail(arrayOfUsernames, contentText, subject);
            return res.status(200).send(dispatcher(res, result, 'Email sent'));
        } catch (error) {
            next(error);
        }
    }
};
