
import { NextFunction, Request, Response } from "express";;
import BaseController from "./base.controller";
import dispatcher from "../utils/dispatch.util";
import { speeches } from "../configs/speeches.config";
import { badRequest, notFound, unauthorized } from "boom";
import { ideas } from "../models/ideas.model";
import { themes_problems } from "../models/themes_problems.model";
import { Op, QueryTypes } from "sequelize";
import fs from 'fs';
import { S3 } from "aws-sdk";
import { HttpsProxyAgent } from "https-proxy-agent";
import db from "../utils/dbconnection.util";
import { evaluation_process } from "../models/evaluation_process.model";
import { constents } from "../configs/constents.config";
import { evaluator_rating } from "../models/evaluator_rating.model";

export default class ideasController extends BaseController {

    model = "ideas";

    protected initializePath(): void {
        this.path = '/ideas';
    }
    protected initializeRoutes(): void {
        this.router.post(this.path + "/initiate", this.initiateIdea.bind(this));
        this.router.put(this.path + "/ideaUpdate", this.UpdateIdea.bind(this));
        this.router.get(this.path + '/submittedDetails', this.getResponse.bind(this));
        this.router.post(this.path + "/fileUpload", this.handleAttachment.bind(this));
        // this.router.get(`${this.path}/ideastatusbyteamId`, this.getideastatusbyteamid.bind(this));
        this.router.get(this.path + '/fetchRandomChallenge', this.getRandomChallenge.bind(this));
        this.router.get(`${this.path}/evaluated/:evaluator_id`, this.getChallengesForEvaluator.bind(this))
        this.router.get(`${this.path}/finalEvaluation/`, this.finalEvaluation.bind(this));
        super.initializeRoutes();
    }
    protected async getData(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN' && res.locals.role !== 'STATE') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        let user_id = res.locals.user_id || res.locals.state_coordinators_id;
        let newREQQuery: any = {}
        if (req.query.Data) {
            let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
            newREQQuery = JSON.parse(newQuery);
        } else if (Object.keys(req.query).length !== 0) {
            return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
        }
        let { student_id } = newREQQuery;
        if (!user_id) {
            throw unauthorized(speeches.UNAUTHORIZED_ACCESS)
        }
        let data: any;
        let responseOfFindAndCountAll: any;
        const { model, id } = req.params;
        const paramStatus: any = newREQQuery.status;
        const evaluation_status: any = newREQQuery.evaluation_status;
        const district: any = newREQQuery.district;
        const state: any = newREQQuery.state;
        const theme_problem_id: any = newREQQuery.theme_problem_id;
        const sub_category: any = newREQQuery.sub_category;
        const sdg: any = newREQQuery.sdg;
        const rejected_reason: any = newREQQuery.rejected_reason;
        const rejected_reasonSecond: any = newREQQuery.rejected_reasonSecond;
        const evaluator_id: any = JSON.stringify(newREQQuery.evaluator_id);
        const level: any = newREQQuery.level;
        const yetToProcessList: any = newREQQuery.yetToProcessList;
        if (model) {
            this.model = model;
        };
        // pagination
        const { page, size, title } = newREQQuery;
        let condition: any = {};
        if (student_id) {
            condition = { student_id };
        }
        const { limit, offset } = this.getPagination(page, size);
        const modelClass = await this.loadModel(model).catch(error => {
            next(error)
        });
        const where: any = {};
        let whereClauseStatusPart: any = {}
        let additionalFilter: any = {};
        let boolStatusWhereClauseEvaluationStatusRequired = false;
        //status filter
        if (paramStatus && (paramStatus in constents.challenges_flags.list)) {
            whereClauseStatusPart = { "status": paramStatus };
            boolStatusWhereClauseEvaluationStatusRequired = true;
        } else if (paramStatus === 'ALL') {
            whereClauseStatusPart = {};
            boolStatusWhereClauseEvaluationStatusRequired = false;
        } else if (paramStatus === 'PENDINGFORAPPROVAL') {
            whereClauseStatusPart = { "status": "PENDINGFORAPPROVAL" };
            boolStatusWhereClauseEvaluationStatusRequired = true;
        }
        else {
            whereClauseStatusPart = { "status": "SUBMITTED" };
            boolStatusWhereClauseEvaluationStatusRequired = true;
        };
        //evaluation status filter
        if (evaluation_status) {
            if (evaluation_status in constents.evaluation_status.list) {
                whereClauseStatusPart = { 'evaluation_status': evaluation_status };
            } else {
                whereClauseStatusPart['evaluation_status'] = null;
            }
        }
        if (sdg) {
            additionalFilter['sdg'] = sdg && typeof sdg == 'string' ? sdg : {}
        }

        if (rejected_reason) {
            additionalFilter['rejected_reason'] = rejected_reason && typeof rejected_reason == 'string' ? rejected_reason : {}
        }
        if (rejected_reasonSecond) {
            additionalFilter['rejected_reasonSecond'] = rejected_reasonSecond && typeof rejected_reasonSecond == 'string' ? rejected_reasonSecond : {}
        }
        if (evaluator_id) {
            additionalFilter['evaluated_by'] = evaluator_id && typeof evaluator_id == 'string' ? evaluator_id : {}
        }
        if (state) {
            additionalFilter["state"] = state && typeof state == 'string' ? state : {}
        }
        if (theme_problem_id) {
            additionalFilter["theme_problem_id"] = theme_problem_id && typeof theme_problem_id == 'string' ? theme_problem_id : {}
        }
        if (district) {
            additionalFilter["district"] = district && typeof district == 'string' ? district : {}
        }
        if (sub_category) {
            additionalFilter["sub_category"] = sub_category && typeof sub_category == 'string' ? sub_category : {}
        }
        if (id) {
            const newParamId = await this.authService.decryptGlobal(req.params.id);
            where[`idea_id`] = newParamId;
            try {
                if (level && typeof level == 'string') {
                    switch (level) {
                        case 'L1':
                            data = await this.crudService.findOne(ideas, {
                                attributes: [
                                    "idea_id",
                                    "theme_problem_id",
                                    "student_id",
                                    "idea_title",
                                    "solution_statement",
                                    "detailed_solution",
                                    "prototype_available",
                                    "Prototype_file",
                                    "idea_available",
                                    "self_declaration",
                                    "status",
                                    "initiated_by",
                                    "submitted_at",
                                    "created_by",
                                    "created_at",
                                    "verified_by",
                                    "verified_at",
                                    "district",
                                    "evaluated_by",
                                    "evaluated_at",
                                    "evaluation_status",
                                    "rejected_reason",
                                    "state",
                                    "fpp",
                                    "youtubelink",
                                    "technology",
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                    ],
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                    ]
                                ],
                                where: {
                                    [Op.and]: [
                                        where,
                                        condition
                                    ]
                                },
                                include: {
                                    model: themes_problems,
                                    attributes: [
                                        "theme_problem_id",
                                        "theme_name",
                                        "problem_statement",
                                        "problem_statement_description",
                                        "status"
                                    ]
                                }
                            });
                            break;
                        case 'L2':
                            data = await this.crudService.findOne(ideas, {
                                attributes: [
                                    "idea_id",
                                    "theme_problem_id",
                                    "student_id",
                                    "idea_title",
                                    "solution_statement",
                                    "detailed_solution",
                                    "prototype_available",
                                    "Prototype_file",
                                    "idea_available",
                                    "self_declaration",
                                    "status",
                                    "initiated_by",
                                    "submitted_at",
                                    "created_by",
                                    "created_at",
                                    "verified_by",
                                    "verified_at",
                                    "district",
                                    "evaluated_by",
                                    "evaluated_at",
                                    "evaluation_status",
                                    "rejected_reason",
                                    "state",
                                    "fpp",
                                    "youtubelink",
                                    "technology",
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                    ],
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                    ]
                                ],
                                where: {
                                    [Op.and]: [
                                        where,
                                        condition
                                    ]
                                },
                                include: [{
                                    model: evaluator_rating,
                                    required: false,
                                    attributes: [
                                        'evaluator_rating_id',
                                        'evaluator_id',
                                        'idea_id',
                                        'status',
                                        'level',
                                        'param_1',
                                        'param_2',
                                        'param_3',
                                        'param_4',
                                        'param_5',
                                        'comments',
                                        'overall',
                                        'submitted_at',
                                        "created_at",
                                        [
                                            db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = evaluator_ratings.created_by)`), 'rated_evaluated_name'
                                        ]
                                    ]
                                },
                                {
                                    model: themes_problems,
                                    attributes: [
                                        "theme_problem_id",
                                        "theme_name",
                                        "problem_statement",
                                        "problem_statement_description",
                                        "status"
                                    ]
                                }]
                            });
                            break;
                        case level != 'L1' && 'L2':
                            break;
                    }
                }
                data = await this.crudService.findOne(ideas, {
                    attributes: [
                        "idea_id",
                        "theme_problem_id",
                        "student_id",
                        "idea_title",
                        "solution_statement",
                        "detailed_solution",
                        "prototype_available",
                        "Prototype_file",
                        "idea_available",
                        "self_declaration",
                        "status",
                        "initiated_by",
                        "submitted_at",
                        "created_by",
                        "created_at",
                        "verified_by",
                        "verified_at",
                        "district",
                        "evaluation_status",
                        "evaluated_at",
                        "state",
                        "fpp",
                        "youtubelink",
                        "technology",
                        [
                            db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                        ]
                    ],
                    where: {
                        [Op.and]: [
                            where,
                            condition
                        ]
                    },
                    include: {
                        model: themes_problems,
                        attributes: [
                            "theme_problem_id",
                            "theme_name",
                            "problem_statement",
                            "problem_statement_description",
                            "status"
                        ]
                    },
                });
            } catch (error) {
                return res.status(500).send(dispatcher(res, data, 'error'))
            }
            data.dataValues.response = JSON.parse(data.dataValues.response);
        } else {
            try {
                if (level && typeof level == 'string') {
                    switch (level) {
                        case 'L1':
                            whereClauseStatusPart['status'] = "SUBMITTED";
                            if (yetToProcessList) {
                                if (yetToProcessList && yetToProcessList == 'L1') {
                                    whereClauseStatusPart['evaluation_status'] = {
                                        [Op.or]: [
                                            { [Op.is]: null }, ''
                                        ]
                                    }
                                }
                            }
                            responseOfFindAndCountAll = await this.crudService.findAndCountAll(ideas, {
                                attributes: [
                                    "idea_id",
                                    "financial_year_id",
                                    "theme_problem_id",
                                    "student_id",
                                    "idea_title",
                                    "solution_statement",
                                    "detailed_solution",
                                    "prototype_available",
                                    "Prototype_file",
                                    "idea_available",
                                    "self_declaration",
                                    "status",
                                    "initiated_by",
                                    "submitted_at",
                                    "created_by",
                                    "created_at",
                                    "verified_by",
                                    "verified_at",
                                    "district",
                                    "evaluated_by",
                                    "evaluated_at",
                                    "evaluation_status",
                                    "rejected_reason",
                                    "state",
                                    "fpp",
                                    "youtubelink",
                                    "technology",
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                    ],
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                    ]
                                ],
                                include: {
                                    model: themes_problems,
                                    attributes: [
                                        "theme_problem_id",
                                        "theme_name",
                                        "problem_statement",
                                        "problem_statement_description",
                                        "status"
                                    ]
                                },
                                where: {
                                    [Op.and]: [
                                        condition,
                                        whereClauseStatusPart,
                                        additionalFilter,
                                        { verified_by: { [Op.ne]: null } }
                                    ]
                                }, limit, offset,
                            });
                            break;
                        case 'L2':
                            await db.query(`SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));`, {
                                type: QueryTypes.RAW,
                            });
                            // cleaning up the repeated code: observation everything is same except the having groupBy clause so separating both of them based the parameter
                            let havingClausePart: any;
                            let groupByClausePart: any;
                            whereClauseStatusPart['evaluation_status'] = "SELECTEDROUND1";
                            whereClauseStatusPart['final_result'] = null;
                            if (yetToProcessList) {
                                if (yetToProcessList && yetToProcessList == 'L2') {
                                    groupByClausePart = [`ideas.idea_id`];
                                    havingClausePart = db.Sequelize.where(db.Sequelize.fn('count', db.Sequelize.col(`evaluator_ratings.idea_id`)), {
                                        [Op.lt]: 3
                                    })
                                }
                            } else {
                                groupByClausePart = [`evaluator_ratings.idea_id`];
                                havingClausePart = db.Sequelize.where(db.Sequelize.fn('count', db.Sequelize.col(`evaluator_ratings.idea_id`)), {
                                    [Op.gte]: 3
                                })
                            }
                            responseOfFindAndCountAll = await this.crudService.findAndCountAll(ideas, {
                                attributes: [
                                    "idea_id",
                                    "financial_year_id",
                                    "theme_problem_id",
                                    "student_id",
                                    "idea_title",
                                    "solution_statement",
                                    "detailed_solution",
                                    "prototype_available",
                                    "Prototype_file",
                                    "idea_available",
                                    "self_declaration",
                                    "status",
                                    "initiated_by",
                                    "submitted_at",
                                    "created_by",
                                    "created_at",
                                    "verified_by",
                                    "verified_at",
                                    "district",
                                    "evaluated_by",
                                    "evaluated_at",
                                    "evaluation_status",
                                    "final_result",
                                    "rejected_reason",
                                    "state",
                                    "fpp",
                                    "youtubelink",
                                    "technology",
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                    ],
                                    [
                                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                    ]
                                ],
                                where: {
                                    [Op.and]: [
                                        condition,
                                        whereClauseStatusPart,
                                        additionalFilter,
                                    ]
                                },
                                include: [{
                                    model: evaluator_rating,
                                    where: { level: 'L2' },
                                    required: false,
                                    attributes: [
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(param_1) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_1'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(param_2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_2'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(param_3) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_3'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(param_4) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_4'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(param_5) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_5'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(comments) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'comments'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(overall) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'overall'
                                        ],
                                        [
                                            db.literal(`(SELECT ROUND(AVG(CAST(overall AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'overall_avg'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(created_at) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'created_at'
                                        ],
                                        [
                                            db.literal(`(SELECT  JSON_ARRAYAGG(evaluator_id) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'evaluator_id'
                                        ],
                                        [
                                            db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = evaluator_ratings.created_by)`), 'rated_evaluated_name'
                                        ]
                                    ]
                                },
                                {
                                    model: themes_problems,
                                    attributes: [
                                        "theme_problem_id",
                                        "theme_name",
                                        "problem_statement",
                                        "problem_statement_description",
                                        "status"
                                    ]
                                }],
                                group: groupByClausePart,
                                having: havingClausePart,
                                subQuery: false,
                                limit, offset,
                            });
                            responseOfFindAndCountAll.count = responseOfFindAndCountAll.count.length
                            break;
                        case level !== 'L1' && 'L2':
                            break;
                    }
                } else {
                    let submitedWhereCodition = {}
                    if (whereClauseStatusPart.status === 'SUBMITTED') {
                        submitedWhereCodition = { verified_by: { [Op.ne]: null } }
                    }
                    if (whereClauseStatusPart.status === 'PENDINGFORAPPROVAL') {
                        submitedWhereCodition = { verified_by: { [Op.is]: null } }
                        whereClauseStatusPart.status = 'SUBMITTED'
                    }
                    responseOfFindAndCountAll = await this.crudService.findAndCountAll(ideas, {
                        attributes: [
                            "idea_id",
                            "financial_year_id",
                            "theme_problem_id",
                            "student_id",
                            "idea_title",
                            "solution_statement",
                            "detailed_solution",
                            "prototype_available",
                            "Prototype_file",
                            "idea_available",
                            "self_declaration",
                            "status",
                            "initiated_by",
                            "submitted_at",
                            "created_by",
                            "created_at",
                            "verified_by",
                            "verified_at",
                            "district",
                            "evaluation_status",
                            "evaluated_at",
                            "state",
                            "fpp",
                            "youtubelink",
                            "technology",
                            [
                                db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                            ],
                            [
                                db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                            ]
                        ],
                        include: {
                            model: themes_problems,
                            attributes: [
                                "theme_problem_id",
                                "theme_name",
                                "problem_statement",
                                "problem_statement_description",
                                "status"
                            ]
                        },
                        where: {
                            [Op.and]: [
                                condition,
                                whereClauseStatusPart,
                                additionalFilter,
                                submitedWhereCodition
                            ]
                        }, limit, offset,
                    });
                }
                const result = this.getPagingData(responseOfFindAndCountAll, page, limit);
                data = result;
            } catch (error: any) {
                return res.status(500).send(dispatcher(res, data, 'error'))
            }
            //data.dataValues.forEach((element: any) => { element.dataValues.response = JSON.parse(element.dataValues.response) })
        }
        if (!data || data instanceof Error) {
            if (data != null) {
                throw notFound(data.message)
            } else {
                throw notFound()
            }
            res.status(200).send(dispatcher(res, null, "error", speeches.DATA_NOT_FOUND));
            // (data.message)
        }
        return res.status(200).send(dispatcher(res, data, 'success'));
    };
    protected async initiateIdea(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { student_id, problem_statement_id } = req.body;
            if (!student_id) {
                throw unauthorized(speeches.USER_TEAMID_REQUIRED)
            }
            req.body['financial_year_id'] = 1;

            var dataBodyforThemes = { ...req.body };
            dataBodyforThemes['status'] = 'MANUAL'
            if (problem_statement_id) {
                if (problem_statement_id === 0 || problem_statement_id === '0') {
                    let result: any = await this.crudService.create(themes_problems, dataBodyforThemes);
                    req.body['theme_problem_id'] = result.dataValues.theme_problem_id;
                } else {
                    const where: any = {};
                    where[`theme_problem_id`] = problem_statement_id;
                    where[`status`] = 'MANUAL';
                    const finsThemeStatus: any = await this.crudService.findOne(themes_problems, { where: { 'theme_problem_id': problem_statement_id } })

                    if (finsThemeStatus.dataValues.status === 'MANUAL') {
                        let result: any = await this.crudService.update(themes_problems, dataBodyforThemes, { where: where });
                    }
                    req.body['theme_problem_id'] = problem_statement_id;
                }
            }

            let result: any = await this.crudService.create(ideas, req.body);
            if (!result) {
                throw badRequest(speeches.INVALID_DATA);
            }
            if (result instanceof Error) {
                throw result;
            }
            res.status(200).send(dispatcher(res, result))
            // res.status(400).send(dispatcher(res, '', 'error', 'idea initiation is closed', 400));
        } catch (err) {
            next(err)
        }
    }
    protected async UpdateIdea(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT' && res.locals.role !== 'MENTOR' && res.locals.role !== 'EVALUATOR' && res.locals.role !== 'EADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const { student_id, problem_statement_id, status, initiated_by, idea_id } = req.body;
            if (!student_id) {
                throw unauthorized(speeches.USER_TEAMID_REQUIRED)
            }
            if (!idea_id) {
                throw unauthorized(speeches.USER_IDEAID_REQUIRED)
            }
            var dataBodyforThemes = { ...req.body };
            dataBodyforThemes['status'] = 'MANUAL'
            if (problem_statement_id) {
                if (problem_statement_id === 0 || problem_statement_id === '0') {
                    let result: any = await this.crudService.create(themes_problems, dataBodyforThemes);
                    req.body['theme_problem_id'] = result.dataValues.theme_problem_id;
                } else {
                    const where: any = {};
                    where[`theme_problem_id`] = problem_statement_id;
                    where[`status`] = 'MANUAL';
                    const finsThemeStatus: any = await this.crudService.findOne(themes_problems, { where: { 'theme_problem_id': problem_statement_id } })

                    if (finsThemeStatus.dataValues.status === 'MANUAL') {
                        let result: any = await this.crudService.update(themes_problems, dataBodyforThemes, { where: where });
                    }
                    req.body['theme_problem_id'] = problem_statement_id;
                }
            }
            if (initiated_by) {
                req.body['financial_year_id'] = 1;
            }
            if (status) {
                if (status === 'DRAFT') {
                    req.body['submitted_at'] = null;
                } else {
                    let newDate = new Date();
                    let newFormat = (newDate.getFullYear()) + "-" + (1 + newDate.getMonth()) + "-" + newDate.getUTCDate() + ' ' + newDate.getHours() + ':' + newDate.getMinutes() + ':' + newDate.getSeconds();
                    req.body['submitted_at'] = newFormat;
                }
            }
            const where: any = {};
            const valuebody = req.body;
            where[`idea_id`] = idea_id;
            let result: any = await this.crudService.update(ideas, valuebody, { where: where });
            return res.status(200).send(dispatcher(res, result, 'updated'));
        } catch (err) {
            next(err)
        }
    }
    protected async getResponse(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STATE' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
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
            let data: any;
            const { id } = req.params;

            let condition: any = {};
            if (student_id) {
                condition.student_id = student_id
            }
            data = await this.crudService.findAll(ideas, {
                attributes: [
                    [
                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                    ],
                    "idea_id",
                    "financial_year_id",
                    "theme_problem_id",
                    "student_id",
                    "idea_title",
                    "solution_statement",
                    "detailed_solution",
                    "prototype_available",
                    "Prototype_file",
                    "idea_available",
                    "self_declaration",
                    "status",
                    "initiated_by",
                    "submitted_at",
                    "created_by",
                    "created_at",
                    "verified_by",
                    "verified_at",
                    "evaluated_by",
                    "evaluated_at",
                    "evaluation_status",
                    "rejected_reason",
                    "final_result",
                    "district",
                    "state",
                    "fpp",
                    "youtubelink",
                    "technology"
                ],
                where: {
                    [Op.and]: [
                        condition
                    ]
                },
                include: {
                    model: themes_problems,
                    attributes: [
                        "theme_problem_id",
                        "theme_name",
                        "problem_statement",
                        "problem_statement_description",
                        "status"
                    ]
                }
            })
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error) {
            next(error);
        }
    }
    protected async handleAttachment(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {

            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { student_id } = newREQQuery;
            const rawfiles: any = req.files;
            const files: any = Object.values(rawfiles);
            const allowedTypes = [
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];
            if (!allowedTypes.includes(files[0].type)) {
                return res.status(400).send(dispatcher(res, '', 'error', 'This file type not allowed', 400));
            }
            if (files[0].name.match(/\.exe/)) {
                return res.status(400).send(dispatcher(res, '', 'error', 'This file type not allowed', 400));
            }
            const errs: any = [];
            let attachments: any = [];
            let result: any = {};
            let proxyAgent = new HttpsProxyAgent('http://10.236.241.101:9191');
            let s3
            s3 = new S3({
                apiVersion: '2006-03-01',
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            if (!req.files) {
                return result;
            }
            let file_name_prefix: any;
            if (process.env.DB_HOST?.includes("stage")) {
                file_name_prefix = `ideas/stage/${student_id}`
            } else if (process.env.DB_HOST?.includes("dev")) {
                file_name_prefix = `ideas/dev/${student_id}`
            } else {
                file_name_prefix = `ideas/prod/${student_id}`
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
    protected async getideastatusbyteamid(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const teamId = newREQQuery.student_id;
            const result = await db.query(`select  ifnull((select status  FROM ideas where student_id = ${teamId}),'No Idea')ideaStatus`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, "success"))
        } catch (error) {
            next(error);
        }
    }
    protected async getRandomChallenge(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EVALUATOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let challengeResponse: any;
            let evaluator_id: any;
            let whereClause: any = {};
            let whereClauseStatusPart: any = {}
            let attributesNeedFetch: any;
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }

            let user_id = res.locals.user_id;
            if (!user_id) throw unauthorized(speeches.UNAUTHORIZED_ACCESS);

            let evaluator_user_id = newREQQuery.evaluator_user_id;
            if (!evaluator_user_id) throw unauthorized(speeches.ID_REQUIRED);

            let activeDistrict = await this.crudService.findOne(evaluation_process, {
                attributes: ['district'], where: { [Op.and]: [{ status: 'ACTIVE' }, { level_name: 'L1' }] }
            });
            let districts = activeDistrict.dataValues.district;
            const convertToDistrictArray = districts.split(",");
            const paramStatus: any = newREQQuery.status;
            let boolStatusWhereClauseRequired = false;

            if (paramStatus && (paramStatus in constents.challenges_flags.list)) {
                whereClauseStatusPart = { "status": paramStatus, district: { [Op.in]: convertToDistrictArray } };
                boolStatusWhereClauseRequired = true;
            } else {
                whereClauseStatusPart = { "status": "SUBMITTED", district: { [Op.in]: convertToDistrictArray } };
                boolStatusWhereClauseRequired = true;
            };

            evaluator_id = { evaluated_by: evaluator_user_id }

            let level = newREQQuery.level;
            if (level && typeof level == 'string') {
                let districtsArray = districts.replace(/,/g, "','")
                switch (level) {
                    case 'L1':
                        attributesNeedFetch = [
                            "idea_id",
                            "financial_year_id",
                            "theme_problem_id",
                            "student_id",
                            "idea_title",
                            "solution_statement",
                            "detailed_solution",
                            "prototype_available",
                            "Prototype_file",
                            "idea_available",
                            "self_declaration",
                            "status",
                            "initiated_by",
                            "submitted_at",
                            "created_by",
                            "created_at",
                            "verified_by",
                            "verified_at",
                            "district",
                            "state",
                            "fpp",
                            "youtubelink",
                            "technology",
                            [
                                db.literal(`( SELECT count(*) FROM ideas as idea where idea.verified_by <> 'null')`),
                                'overAllIdeas'
                            ],
                            [
                                db.literal(`(SELECT count(*) FROM ideas as idea where idea.evaluation_status is null AND idea.verified_by <> 'null' AND idea.district IN ('${districtsArray}'))`),
                                'openIdeas'
                            ],
                            [
                                db.literal(`(SELECT count(*) FROM ideas as idea where idea.evaluated_by = ${evaluator_user_id.toString()})`), 'evaluatedIdeas'
                            ],
                        ],
                            whereClause = {
                                [Op.and]: [
                                    whereClauseStatusPart,
                                    { evaluation_status: { [Op.is]: null } },
                                    { verified_by: { [Op.ne]: null } }

                                ]
                            }
                        challengeResponse = await this.crudService.findOne(ideas, {
                            attributes: attributesNeedFetch,
                            where: whereClause,
                            include: {
                                model: themes_problems,
                                attributes: [
                                    "theme_problem_id",
                                    "theme_name",
                                    "problem_statement",
                                    "problem_statement_description",
                                ]
                            },
                            order: db.literal('rand()'), limit: 1
                        });
                        if (challengeResponse instanceof Error) {
                            throw challengeResponse
                        }
                        if (!challengeResponse) {
                            throw notFound("All ideas has been accepted, no more challenge to display");
                        };
                        break;
                    case 'L2':
                        let activeDistrict = await this.crudService.findOne(evaluation_process, {
                            attributes: ['district'], where: { [Op.and]: [{ status: 'ACTIVE' }, { level_name: 'L2' }] }
                        });
                        let districts = activeDistrict.dataValues.district;
                        if (districts !== null) {
                            let districtsArray = districts.replace(/,/g, "','")
                            challengeResponse = await db.query("SELECT theme_name,problem_statement,problem_statement_description,ideas.idea_id, ideas.theme_problem_id, ideas.idea_title, ideas.student_id, ideas.solution_statement, ideas.detailed_solution, ideas.prototype_available, ideas.Prototype_file, ideas.idea_available, ideas.self_declaration, ideas.initiated_by, ideas.created_at, ideas.submitted_at, ideas.status, ideas.district, ideas.verified_by, (SELECT COUNT(*) FROM ideas AS idea WHERE idea.evaluation_status = 'SELECTEDROUND1') AS 'overAllIdeas', (SELECT COUNT(*) - SUM(CASE WHEN FIND_IN_SET('" + evaluator_user_id.toString() + "', evals) > 0 THEN 1 ELSE 0 END) FROM l1_accepted WHERE l1_accepted.district IN ('" + districtsArray + "')) AS 'openIdeas', (SELECT COUNT(*) FROM evaluator_ratings AS A WHERE A.evaluator_id = '" + evaluator_user_id.toString() + "') AS 'evaluatedIdeas' FROM l1_accepted AS l1_accepted LEFT OUTER JOIN ideas ON l1_accepted.idea_id = ideas.idea_id left join themes_problems as the on ideas.theme_problem_id = the.theme_problem_id WHERE l1_accepted.district IN ('" + districtsArray + "') AND NOT FIND_IN_SET('" + evaluator_user_id.toString() + "', l1_accepted.evals) ORDER BY RAND() LIMIT 1", { type: QueryTypes.SELECT });
                        } else {
                            challengeResponse = await db.query(`SELECT theme_name,problem_statement,problem_statement_description,ideas.idea_id, ideas.theme_problem_id, ideas.idea_title, ideas.student_id, ideas.solution_statement, ideas.detailed_solution, ideas.prototype_available, ideas.Prototype_file, ideas.idea_available, ideas.self_declaration, ideas.initiated_by, ideas.created_at, ideas.submitted_at, ideas.status, ideas.district, ideas.verified_by, (SELECT COUNT(*) FROM ideas AS idea WHERE idea.evaluation_status = 'SELECTEDROUND1') AS 'overAllIdeas', (SELECT COUNT(*) - SUM(CASE WHEN FIND_IN_SET(${evaluator_user_id.toString()}, evals) > 0 THEN 1 ELSE 0 END) FROM l1_accepted) AS 'openIdeas', (SELECT COUNT(*) FROM evaluator_ratings AS A WHERE A.evaluator_id = ${evaluator_user_id.toString()}) AS 'evaluatedIdeas' FROM l1_accepted AS l1_accepted LEFT OUTER JOIN ideas ON l1_accepted.idea_id = ideas.idea_id left join themes_problems as the on ideas.theme_problem_id = the.theme_problem_id WHERE NOT FIND_IN_SET(${evaluator_user_id.toString()}, l1_accepted.evals) ORDER BY RAND() LIMIT 1`, { type: QueryTypes.SELECT });
                        }
                        const evaluatedIdeas = await db.query(`SELECT COUNT(*) as evaluatedIdeas FROM evaluator_ratings AS A WHERE A.evaluator_id = ${evaluator_user_id.toString()}`, { type: QueryTypes.SELECT })
                        let throwMessage = {
                            message: 'All ideas has been rated, no more challenge to display',
                            //@ts-ignore
                            evaluatedIdeas: evaluatedIdeas[0].evaluatedIdeas
                        };
                        if (challengeResponse instanceof Error) {
                            throw challengeResponse
                        }
                        if (challengeResponse.length == 0) {
                            // throw notFound("All challenge has been rated, no more challenge to display");
                            return res.status(200).send(dispatcher(res, throwMessage, 'success'));
                        };
                        break;
                    default:
                        break;
                }
            }
            return res.status(200).send(dispatcher(res, challengeResponse, 'success'));
        } catch (error) {
            next(error);
        }
    }
    private async getChallengesForEvaluator(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EVALUATOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            let data: any = [];
            let whereClauseEvaluationStatus: any = {};
            let additionalFilter: any = {};
            let districtFilter: any = {};
            const newParamEvaluatorId = await this.authService.decryptGlobal(req.params.evaluator_id);
            const evaluator_id: any = newParamEvaluatorId
            const evaluation_status: any = newREQQuery.evaluation_status;
            const district: any = newREQQuery.district;
            const rejected_reason: any = newREQQuery.rejected_reason;
            const level: any = newREQQuery.level;
            if (!evaluator_id) {
                throw badRequest(speeches.TEAM_NAME_ID)
            };
            if (evaluation_status) {
                if (evaluation_status in constents.evaluation_status.list) {
                    whereClauseEvaluationStatus = { 'evaluation_status': evaluation_status };
                } else {
                    whereClauseEvaluationStatus['evaluation_status'] = null;
                }
            }
            if (rejected_reason) {
                additionalFilter['rejected_reason'] = rejected_reason && typeof rejected_reason == 'string' ? rejected_reason : {}
            }
            if (district) {
                additionalFilter['district'] = district && typeof district == 'string' ? district : {}
            }
            if (level && typeof level == 'string') {
                switch (level) {
                    case 'L1':
                        data = await this.crudService.findAll(ideas, {
                            attributes: [
                                "idea_id",
                                "financial_year_id",
                                "theme_problem_id",
                                "student_id",
                                "idea_title",
                                "solution_statement",
                                "detailed_solution",
                                "prototype_available",
                                "Prototype_file",
                                "idea_available",
                                "self_declaration",
                                "status",
                                "initiated_by",
                                "submitted_at",
                                "created_by",
                                "created_at",
                                "verified_by",
                                "verified_at",
                                "district",
                                "evaluation_status",
                                "rejected_reason",
                                "evaluated_at",
                                "state",
                                "fpp",
                                "youtubelink",
                                "technology",
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                ],
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`verified_by\` )`), 'verified_name'
                                ],
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                ],
                                // [
                                //     db.literal(`(SELECT team_name FROM teams As t WHERE t.student_id =  \`ideas\`.\`student_id\` )`), 'team_name'
                                // ]
                                // [
                                //     db.literal(`(SELECT JSON_ARRAYAGG(student_full_name) FROM unisolve_db.students  AS s LEFT OUTER JOIN unisolve_db.teams AS t ON s.student_id = t.student_id WHERE t.student_id = \`ideas\`.\`student_id\` )`), 'team_members'
                                // ]
                                // [
                                //     db.literal(`(SELECT mentorTeamOrg.organization_name FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id LEFT OUTER JOIN organizations AS mentorTeamOrg ON mentorTeam.organization_code = mentorTeamOrg.organization_code WHERE challenge_responses.student_id =  \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'organization_name'
                                // ],
                                // [
                                //     db.literal(`(SELECT mentorTeamOrg.organization_code FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id LEFT OUTER JOIN organizations AS mentorTeamOrg ON mentorTeam.organization_code = mentorTeamOrg.organization_code WHERE challenge_responses.student_id = \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'organization_code'
                                // ],
                                // [
                                //     db.literal(`(SELECT full_name FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id WHERE challenge_responses.student_id = \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'mentor_name'
                                // ]
                            ],
                            include: {
                                model: themes_problems,
                                attributes: [
                                    "theme_problem_id",
                                    "theme_name",
                                    "problem_statement",
                                    "problem_statement_description",
                                ]
                            },
                            where: {
                                [Op.and]: [
                                    { evaluated_by: evaluator_id },
                                    whereClauseEvaluationStatus,
                                    additionalFilter,
                                ]
                            }
                        });
                        break;
                    case 'L2': {
                        data = await this.crudService.findAll(ideas, {
                            attributes: [
                                "idea_id",
                                "financial_year_id",
                                "theme_problem_id",
                                "student_id",
                                "idea_title",
                                "solution_statement",
                                "detailed_solution",
                                "prototype_available",
                                "Prototype_file",
                                "idea_available",
                                "self_declaration",
                                "status",
                                "initiated_by",
                                "submitted_at",
                                "created_by",
                                "created_at",
                                "verified_by",
                                "verified_at",
                                "district",
                                "evaluation_status",
                                "evaluated_at",
                                "state",
                                "fpp",
                                "youtubelink",
                                "technology",
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                                ],
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = \`ideas\`.\`verified_by\` )`), 'verified_name'
                                ],
                                [
                                    db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                                ],
                                // [
                                //     db.literal(`(SELECT team_name FROM teams As t WHERE t.student_id =  \`ideas\`.\`student_id\` )`), 'team_name'
                                // ]
                                // [
                                //     db.literal(`(SELECT JSON_ARRAYAGG(student_full_name) FROM unisolve_db.students  AS s LEFT OUTER JOIN unisolve_db.teams AS t ON s.student_id = t.student_id WHERE t.student_id = \`ideas\`.\`student_id\` )`), 'team_members'
                                // ]
                                // [
                                //     db.literal(`(SELECT mentorTeamOrg.organization_name FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id LEFT OUTER JOIN organizations AS mentorTeamOrg ON mentorTeam.organization_code = mentorTeamOrg.organization_code WHERE challenge_responses.student_id =  \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'organization_name'
                                // ],
                                // [
                                //     db.literal(`(SELECT mentorTeamOrg.organization_code FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id LEFT OUTER JOIN organizations AS mentorTeamOrg ON mentorTeam.organization_code = mentorTeamOrg.organization_code WHERE challenge_responses.student_id = \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'organization_code'
                                // ],
                                // [
                                //     db.literal(`(SELECT full_name FROM challenge_responses AS challenge_responses LEFT OUTER JOIN teams AS team ON challenge_response.student_id = team.student_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id WHERE challenge_responses.student_id = \`challenge_response\`.\`student_id\` GROUP BY challenge_response.student_id)`), 'mentor_name'
                                // ]
                            ],
                            where: {
                                [Op.and]: [
                                    whereClauseEvaluationStatus,
                                    additionalFilter,
                                    db.literal('`evaluator_ratings`.`evaluator_id` =' + JSON.stringify(evaluator_id)),
                                ]
                            },
                            include: [{
                                model: evaluator_rating,
                                required: false,
                                where: { evaluator_id },
                                attributes: [
                                    'evaluator_rating_id',
                                    'evaluator_id',
                                    'idea_id',
                                    'status',
                                    'level',
                                    'param_1',
                                    'param_2',
                                    'param_3',
                                    'param_4',
                                    'param_5',
                                    'comments',
                                    'overall',
                                    'submitted_at',
                                    "created_at"
                                ]
                            },
                            {
                                model: themes_problems,
                                attributes: [
                                    "theme_problem_id",
                                    "theme_name",
                                    "problem_statement",
                                    "problem_statement_description",
                                ]
                            }
                            ],
                        });
                    }
                }
            }
            if (!data) {
                throw badRequest(data.message)
            };
            if (data instanceof Error) {
                throw data;
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error) {
            next(error)
        }
    };
    private async finalEvaluation(req: Request, res: Response, next: NextFunction) {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let user_id = res.locals.user_id;
            if (!user_id) {
                throw unauthorized(speeches.UNAUTHORIZED_ACCESS)
            }
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            let key: any = newREQQuery.key;
            let data: any;
            const paramStatus: any = newREQQuery.status;
            const district: any = newREQQuery.district;
            const sdg: any = newREQQuery.sdg;
            const level: any = newREQQuery.level;
            const { page, size } = newREQQuery;
            const { limit, offset } = this.getPagination(page, size);
            const where: any = {};
            let whereClauseStatusPart: any = {}
            let additionalFilter: any = {};
            let districtFilter: any = {};
            let boolStatusWhereClauseEvaluationStatusRequired = false;
            //status filter
            if (paramStatus && (paramStatus in constents.challenges_flags.list)) {
                whereClauseStatusPart = { "status": paramStatus };
                boolStatusWhereClauseEvaluationStatusRequired = true;
            } else if (paramStatus === 'ALL') {
                whereClauseStatusPart = {};
                boolStatusWhereClauseEvaluationStatusRequired = false;
            } else {
                whereClauseStatusPart = { "evaluation_status": "SELECTEDROUND1" };
                boolStatusWhereClauseEvaluationStatusRequired = true;
            };
            if (key) {
                whereClauseStatusPart["final_result"] = key
            } else {
                whereClauseStatusPart["final_result"] = '0'
            }
            if (sdg) {
                whereClauseStatusPart["sdg"] = sdg && typeof sdg == 'string' ? sdg : {}
            }
            if (district) {
                whereClauseStatusPart["district"] = district && typeof district == 'string' ? district : {}
            };
            if (level) {
                where["levelWhere"] = level && typeof level == 'string' ? { level } : {}
                where["liter"] = level ? db.literal('`ideas->evaluator_ratings`.`level` = ' + JSON.stringify(level)) : {}
            }
            data = await this.crudService.findAll(ideas, {
                attributes: [
                    "idea_id",
                    "financial_year_id",
                    "theme_problem_id",
                    "student_id",
                    "idea_title",
                    "solution_statement",
                    "detailed_solution",
                    "prototype_available",
                    "Prototype_file",
                    "idea_available",
                    "self_declaration",
                    "status",
                    "initiated_by",
                    "submitted_at",
                    "created_by",
                    "created_at",
                    "verified_by",
                    "verified_at",
                    "district",
                    "evaluated_by",
                    "evaluated_at",
                    "evaluation_status",
                    "final_result",
                    "rejected_reason",
                    "state",
                    "fpp",
                    "youtubelink",
                    "technology",
                    [
                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`evaluated_by\` )`), 'evaluated_name'
                    ],
                    [
                        db.literal(`(SELECT full_name FROM users As s WHERE s.user_id =  \`ideas\`.\`initiated_by\` )`), 'initiated_name'
                    ]
                ],
                where: {
                    [Op.and]: [
                        whereClauseStatusPart,
                        where.liter,
                    ]
                },
                include: [
                    {
                        model: themes_problems,
                        attributes: [
                            "theme_problem_id",
                            "theme_name",
                            "problem_statement",
                            "problem_statement_description",
                            "status"
                        ]
                    },
                    {
                        model: evaluator_rating,
                        where: where,
                        required: false,
                        attributes: [
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(param_1) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_1'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(param_1 AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_1_avg'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(param_2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_2'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(param_2 AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_2_avg'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(param_3) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_3'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(param_3 AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_3_avg'
                            ],

                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(param_4) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_4'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(param_4 AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_4_avg'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(param_5) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_5'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(param_5 AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'param_5_avg'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(comments) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'comments'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(overall) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'overall'
                            ],
                            [
                                db.literal(`(SELECT ROUND(AVG(CAST(overall AS FLOAT)), 2) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'overall_avg'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(created_at) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'created_at'
                            ],
                            [
                                db.literal(`(SELECT  JSON_ARRAYAGG(evaluator_id) FROM unisolve_db.evaluator_ratings as rating WHERE rating.idea_id = \`ideas\`.\`idea_id\`)`), 'evaluator_id'
                            ],
                            // [
                            //     db.literal(`(SELECT full_name FROM users As s WHERE s.user_id = evaluator_ratings.created_by)`), 'rated_evaluated_name'
                            // ]
                        ]
                    }], limit, offset, subQuery: false
            });
            if (!data) {
                throw badRequest(data.message)
            };
            if (data instanceof Error) {
                throw data;
            }
            return res.status(200).send(dispatcher(res, data, 'success'));
        } catch (error: any) {
            return res.status(500).send(dispatcher(res, error, 'error'))
        }
    };
}