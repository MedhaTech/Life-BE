import { teamSchema, teamUpdateSchema } from "../validations/team.validationa";
import ValidationsHolder from "../validations/validationHolder";
import BaseController from "./base.controller";
import authService from '../services/auth.service';
import { Request, Response, NextFunction } from 'express';
import { unauthorized } from "boom";
import { speeches } from "../configs/speeches.config";
import dispatcher from "../utils/dispatch.util";
import { team } from "../models/team.model";

export default class TeamController extends BaseController {

    model = "team";
    authService: authService = new authService;
    protected initializePath(): void {
        this.path = '/teams';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(teamSchema, teamUpdateSchema);
    }
    protected initializeRoutes(): void {
        super.initializeRoutes();
    }
    protected async getData(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            throw unauthorized(speeches.ROLE_ACCES_DECLINE)
        }
        let newREQQuery: any = {}
        if (req.query.Data) {
            let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
            newREQQuery = JSON.parse(newQuery);
        } else if (Object.keys(req.query).length !== 0) {
            return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
        }
        let { student_id } = newREQQuery;
        if (!student_id) {
            throw unauthorized(speeches.USER_TEAMID_REQUIRED)
        }
        if(student_id){
            const where: any = {};
        where[`student_id`] = student_id;
        const data = await this.crudService.findAll(team,{
            where:[where]
        })
        return res.status(200).send(dispatcher(res, data, 'success'));
        }
    }
}