import { teamSchema, teamUpdateSchema } from "../validations/team.validationa";
import ValidationsHolder from "../validations/validationHolder";
import BaseController from "./base.controller";
import authService from '../services/auth.service';
import { Request, Response, NextFunction } from 'express';
import { unauthorized } from "boom";
import { speeches } from "../configs/speeches.config";
import dispatcher from "../utils/dispatch.util";
import { team } from "../models/team.model";
import { S3 } from "aws-sdk";
import fs from 'fs';

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
        this.router.post(`${this.path}/teamidcardUpload`,this.handleAttachment.bind(this));
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
    protected async handleAttachment(req: Request, res: Response, next: NextFunction) {
        if(res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT'){
            return res.status(401).send(dispatcher(res,'','error', speeches.ROLE_ACCES_DECLINE,401));
        }
        try {
            const rawfiles: any = req.files;
            const userId = res.locals.user_id;
            const files: any = Object.values(rawfiles);
            const allowedTypes = ['image/jpeg', 'image/png','application/msword','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(files[0].type)) {
                return res.status(400).send(dispatcher(res,'','error','This file type not allowed',400)); 
            }
            const errs: any = [];
            let attachments: any = [];
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
                file_name_prefix = `team/idCard/${userId}`
            } else if(process.env.DB_HOST?.includes("dev")){
                file_name_prefix = `team/idCard/dev/${userId}`
            }else {
                file_name_prefix = `team/idCard/stage/${userId}`
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
            res.status(200).send(dispatcher(res, result));
        } catch (err) {
            next(err)
        }
    }
}