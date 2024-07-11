import { Request, Response, NextFunction } from 'express';
import { speeches } from '../configs/speeches.config';
import dispatcher from '../utils/dispatch.util';
import BaseController from './base.controller';
import ValidationsHolder from '../validations/validationHolder';
import db from "../utils/dbconnection.util";
import { Op, QueryTypes } from 'sequelize';
import { dashboard_map_stat } from '../models/dashboard_map_stat.model';
import DashboardService from '../services/dashboard.service';
import { constents } from '../configs/constents.config';
import { badData, notFound } from 'boom';
import { student } from '../models/student.model';
import { challenge_response } from '../models/challenge_response.model';
//import StudentService from '../services/students.service';
import { user } from '../models/user.model';
import { baseConfig } from "../configs/base.config";


export default class DashboardController extends BaseController {
    model = ""; ///this u will override in every function in this controller ...!!!

    protected initializePath(): void {
        this.path = '/dashboard';
    }
    protected initializeValidations(): void {
        this.validations = new ValidationsHolder(null, null);
    }
    protected initializeRoutes(): void {
        //example route to add
        //this.router.get(`${this.path}/`, this.getData);

        // ///map stats
        // this.router.get(`${this.path}/refreshMapStatsLive`, this.getMapStatsLive.bind(this))
        // this.router.get(`${this.path}/mapStats`, this.getMapStats.bind(this))
        // this.router.get(`${this.path}/refreshMapStats`, this.refreshMapStats.bind(this))

        // //student Stats...
        // this.router.get(`${this.path}/studentStats/:student_user_id`, this.getStudentStats.bind(this))
        // this.router.get(`${this.path}/studentStats/:student_user_id/challenges`, this.getStudentChallengeDetails.bind(this))

        // //evaluator stats..
        // this.router.get(`${this.path}/evaluatorStats`, this.getEvaluatorStats.bind(this));
        // //loggedInUserCount
        // this.router.get(`${this.path}/loggedInUserCount`, this.getLoggedInUserCount.bind(this));
        // //quizscore
        // this.router.get(`${this.path}/quizscores`, this.getUserQuizScores.bind(this));
        // //singledashboard mentor api's 
        // this.router.get(`${this.path}/ideaCount`, this.getideaCount.bind(this));
        // this.router.get(`${this.path}/mentorpercentage`, this.getmentorpercentage.bind(this));
        // //singledashboard common api's 
        // this.router.get(`${this.path}/teamCount`, this.getteamCount.bind(this));
        // this.router.get(`${this.path}/studentCount`, this.getstudentCount.bind(this));
        // //singledashboard admin api's
        // //this.router.get(`${this.path}/studentCourseCount`,this.getstudentCourseCount.bind(this));
        // this.router.get(`${this.path}/ideasCount`, this.getideasCount.bind(this));
        // this.router.get(`${this.path}/mentorCount`, this.getmentorCount.bind(this));
        // this.router.get(`${this.path}/studentCountbygender`, this.getstudentCountbygender.bind(this));
        // this.router.get(`${this.path}/schoolCount`, this.getSchoolCount.bind(this));
        // this.router.get(`${this.path}/schoolRegCount`, this.getschoolRegCount.bind(this));
        // this.router.get(`${this.path}/invalidInst`, this.getinvalidInst.bind(this));
        // //this.router.get(`${this.path}/mentorCourseCount`,this.getmentorCourseCount.bind(this));
        // //this.router.get(`${this.path}/ATLNonATLRegCount`,this.getATLNonATLRegCount.bind(this));

        // //State DashBoard stats
        // this.router.get(`${this.path}/StateDashboard`, this.getStateDashboard.bind(this));


        super.initializeRoutes();
    }


  

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////// STUDENT STATS
    ///////// PS: this assumes that there is only course in the systems and hence alll topics inside topics table are taken for over counts
    ///////////////////////////////////////////////////////////////////////////////////////////////////
   
   

    // private async getStudentChallengeDetails(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STUDENT') {
    //         return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
    //     }
    //     try {
    //         let newREParams: any = {};
    //         const newParams: any = await this.authService.decryptGlobal(req.params);
    //         newREParams = JSON.parse(newParams);
    //         const { student_user_id } = newREParams;
    //         let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
    //         const newREQQuery = JSON.parse(newQuery);
    //         const paramStatus: any = newREQQuery.status;
    //         let whereClauseStatusPart: any = {};
    //         let whereClauseStatusPartLiteral = "1=1";
    //         let addWhereClauseStatusPart = false
    //         if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
    //             whereClauseStatusPart = { "status": paramStatus }
    //             whereClauseStatusPartLiteral = `status = "${paramStatus}"`
    //             addWhereClauseStatusPart = true;
    //         }
    //         const studentService = new StudentService();
    //         const endDate = "20th November 2022 at 12pm"
    //         let challenge_submission_status = false
    //         let result: any = {
    //             end_date: "20th November 2022 at 12pm"
    //         }
    //         let teamMembers: any = null
    //         teamMembers = await studentService.getTeamMembersForUserId(student_user_id)
    //         if (!teamMembers) {
    //             teamMembers = []
    //         }
    //         if (teamMembers instanceof Error) {
    //             throw teamMembers
    //         }
    //         result = {
    //             ...result,
    //             "challenge_submission_status": challenge_submission_status,
    //             // "team_members": teamMembers
    //         }
    //         // console.log("teamMembers",teamMembers)
    //         if (teamMembers.length <= 0) {
    //             res.status(200).send(dispatcher(res, result, "success"))
    //             return;
    //         }

    //         const studentChallengeSubmission = await challenge_response.findAll({
    //             where: {
    //                 team_id: teamMembers[0].team_id
    //             }
    //         })

    //         if (!studentChallengeSubmission) {
    //             res.status(200).send(dispatcher(res, result, "success"))
    //             return;
    //         }
    //         if (studentChallengeSubmission instanceof Error) {
    //             throw studentChallengeSubmission
    //         }

    //         challenge_submission_status = true;
    //         result = {
    //             ...result,
    //             "challenge_submission_status": challenge_submission_status,
    //             // "team_members": teamMembers
    //         }
    //         res.status(200).send(dispatcher(res, result, "success"))
    //         return;
    //     } catch (err) {
    //         next(err)
    //     }
    // }
   


    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////// MAPP STATS
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    private async refreshMapStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const service = new DashboardService()
           // const result = await service.resetMapStats()
           // res.status(200).json(dispatcher(res, result, "success"))
        } catch (err) {
            next(err);
        }
    }
    private async getMapStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            this.model = dashboard_map_stat.name
            return await this.getData(req, res, next, [],
                [
                    [db.fn('DISTINCT', db.col('state_name')), 'state_name'],
                    `dashboard_map_stat_id`,
                    `overall_schools`, `reg_schools`, `schools_with_teams`, `teams`, `ideas`, `students`, `status`, `created_by`, `created_at`, `updated_by`, `updated_at`
                ]
            )
        } catch (error) {
            next(error);
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////// EVALUATOR STATS
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    protected async getEvaluatorStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let response: any = {};
            const PendingForApproval = await db.query("SELECT count(idea_id) as 'submitted_count' FROM ideas where status = 'SUBMITTED' && verified_by IS NULL", { type: QueryTypes.SELECT });
            const submitted_count = await db.query("SELECT count(idea_id) as 'submitted_count' FROM ideas where status = 'SUBMITTED' && verified_by IS NOT NULL", { type: QueryTypes.SELECT });
            const selected_round_one_count = await db.query("SELECT count(idea_id) as 'selected_round_one_count' FROM ideas where evaluation_status = 'SELECTEDROUND1'", { type: QueryTypes.SELECT });
            const rejected_round_one_count = await db.query("SELECT count(idea_id) as 'rejected_round_one_count' FROM ideas where evaluation_status = 'REJECTEDROUND1'", { type: QueryTypes.SELECT });
            const l2_yet_to_processed = await db.query("SELECT COUNT(*) AS l2_yet_to_processed FROM l1_accepted;", { type: QueryTypes.SELECT });
            const l2_processed = await db.query("SELECT idea_id, count(idea_id) AS l2_processed FROM unisolve_db.evaluator_ratings group by idea_id HAVING COUNT(idea_id) > 2", { type: QueryTypes.SELECT });
            const draft_count = await db.query("SELECT count(idea_id) as 'draft_count' FROM ideas where status = 'DRAFT' ", { type: QueryTypes.SELECT });
            const final_challenges = await db.query("SELECT count(idea_id) as 'final_challenges' FROM evaluation_results where status = 'ACTIVE'", { type: QueryTypes.SELECT });
            const l1_yet_to_process = await db.query(`SELECT COUNT(idea_id) AS l1YetToProcess FROM unisolve_db.ideas WHERE (status = 'SUBMITTED' AND verified_by IS NOT NULL) AND evaluation_status IS NULL OR evaluation_status = '';`, { type: QueryTypes.SELECT });
            const final_evaluation_challenge = await db.query(`SELECT COUNT(idea_id) FROM unisolve_db.ideas WHERE final_result = '0'`, { type: QueryTypes.SELECT });
            const final_evaluation_final = await db.query(`SELECT COUNT(idea_id) FROM unisolve_db.ideas WHERE final_result = '1'`, { type: QueryTypes.SELECT });
            if (submitted_count instanceof Error) {
                throw submitted_count
            }
            if (PendingForApproval instanceof Error) {
                throw PendingForApproval
            }
            if (selected_round_one_count instanceof Error) {
                throw selected_round_one_count
            }
            if (rejected_round_one_count instanceof Error) {
                throw rejected_round_one_count
            };
            if (l2_yet_to_processed instanceof Error) {
                throw l2_yet_to_processed
            };
            if (l2_processed instanceof Error) {
                throw l2_processed
            };
            if (draft_count instanceof Error) {
                throw draft_count
            };
            if (final_challenges instanceof Error) {
                throw final_challenges
            };
            if (l1_yet_to_process instanceof Error) {
                throw l1_yet_to_process
            };
            if (final_evaluation_challenge instanceof Error) {
                throw final_evaluation_challenge
            };
            if (final_evaluation_final instanceof Error) {
                throw final_evaluation_final
            };
            response['PendingForApproval'] = Object.values(PendingForApproval[0]).toString();
            response['draft_count'] = Object.values(draft_count[0]).toString();
            response['submitted_count'] = Object.values(submitted_count[0]).toString()
            response['l1_yet_to_process'] = Object.values(l1_yet_to_process[0]).toString();
            response['selected_round_one_count'] = Object.values(selected_round_one_count[0]).toString()
            response["rejected_round_one_count"] = Object.values(rejected_round_one_count[0]).toString()
            response["l2_processed"] = (l2_processed.length).toString()
            response["l2_yet_to_processed"] = Object.values(l2_yet_to_processed[0]).toString()
            response['final_challenges'] = Object.values(final_challenges[0]).toString();
            response['final_evaluation_challenge'] = Object.values(final_evaluation_challenge[0]).toString();
            response['final_evaluation_final'] = Object.values(final_evaluation_final[0]).toString();
            res.status(200).send(dispatcher(res, response, "success"))
        } catch (err) {
            next(err)
        }
    }

    //loggedUserCount
    protected async getLoggedInUserCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let response: any;
            let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
            const newREQQuery = JSON.parse(newQuery);
            const paramStatus: any = newREQQuery.status;
            // let  timer: any = req.body.time;
            let whereClauseStatusPart: any = {};
            let whereClauseStatusPartLiteral = "1=1";
            let addWhereClauseStatusPart = false
            if (paramStatus && (paramStatus in constents.common_status_flags.list)) {
                whereClauseStatusPart = { "status": paramStatus }
                whereClauseStatusPartLiteral = `status = "${paramStatus}"`
                addWhereClauseStatusPart = true;
            }
            // timer = new Date(timer);
            // const modifiedTime: any = timer.setSeconds(timer.getSeconds() + 5);
            response = await this.crudService.findAndCountAll(user, {
                attributes: [
                    "full_name",
                    [
                        db.literal(`(SELECT mentorTeamOrg.organization_name FROM unisolve_db.students AS student LEFT OUTER JOIN teams AS team ON student.team_id = team.team_id LEFT OUTER JOIN mentors AS mentorTeam ON team.mentor_id = mentorTeam.mentor_id LEFT OUTER JOIN organizations AS mentorTeamOrg ON mentorTeam.organization_code = mentorTeamOrg.organization_code WHERE student.user_id = \`user\`.\`user_id\`)`), 'organization_name'
                    ],
                ],
                where: {
                    [Op.and]: [
                        { is_loggedin: 'YES' },
                        { role: 'STUDENT' },
                        // { last_login: { [Op.between]: [req.body.time, modifiedTime] } }
                    ]
                }
            })
            res.status(200).send(dispatcher(res, response, "success"))
        } catch (err) {
            next(err)
        }
    }
    protected async getUserQuizScores(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'STATE') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let result: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { user_id, role } = newREQQuery
            const quizscores = await db.query(`SELECT user_id,quiz_id,attempts,score FROM unisolve_db.quiz_responses where user_id = ${user_id}`, { type: QueryTypes.SELECT })
            result['scores'] = quizscores
            if (role === "MENTOR") {
                const currentProgress = await db.query(`SELECT count(*)as currentValue FROM unisolve_db.mentor_topic_progress where user_id = ${user_id}`, { type: QueryTypes.SELECT })
                result['currentProgress'] = Object.values(currentProgress[0]).toString()
                result['totalProgress'] = baseConfig.MENTOR_COURSE
            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getteamCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let result: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { mentor_id, institution_id, district } = newREQQuery
            if (mentor_id) {
                result = await db.query(`SELECT count(*) as teams_count FROM teams where mentor_id = ${mentor_id}`, { type: QueryTypes.SELECT });
            } else if (institution_id) {
                result = await db.query(`SELECT 
                COUNT(*) AS teamCount
            FROM
                teams
                    JOIN
                mentors ON teams.mentor_id = mentors.mentor_id
            WHERE
                institution_id = ${institution_id};
                `, { type: QueryTypes.SELECT });
            }
            else if (district) {
                result = await db.query(`SELECT 
                COUNT(t.team_id) AS teams_count
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}';`, { type: QueryTypes.SELECT });
            }
            else {
                result = await db.query(`SELECT 
                COUNT(t.team_id) AS teams_count
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
            WHERE
                ins.status = 'ACTIVE';`, { type: QueryTypes.SELECT });

            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getstudentCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let result: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { mentor_id, institution_id, district } = newREQQuery
            if (mentor_id) {
                result = await db.query(`SELECT count(*) as student_count FROM students join teams on students.team_id = teams.team_id  where mentor_id = ${mentor_id};`, { type: QueryTypes.SELECT });
            } else if (institution_id) {
                result = await db.query(`SELECT 
                COUNT(*) AS student_count
            FROM
                students
                    JOIN
                teams ON students.team_id = teams.team_id
                    JOIN
                mentors ON teams.mentor_id = mentors.mentor_id
            WHERE
                institution_id = ${institution_id};`, { type: QueryTypes.SELECT });
            } else if (district) {
                result = await db.query(`SELECT 
                COUNT(st.student_id) AS student_count
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    INNER JOIN
                students AS st ON st.team_id = t.team_id
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}';`, { type: QueryTypes.SELECT });
            }
            else {
                result = await db.query(`SELECT 
                COUNT(st.student_id) AS student_count
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    INNER JOIN
                students AS st ON st.team_id = t.team_id
            WHERE
                ins.status = 'ACTIVE';`, { type: QueryTypes.SELECT });

            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getideaCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR' && res.locals.role !== 'INSTITUTION') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let result: any = {};
            let PendingForApproval: any = {};
            let submited: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { mentor_id, institution_id } = newREQQuery
            if (mentor_id) {
                PendingForApproval = await db.query(`SELECT count(*) as idea_count FROM ideas join teams on ideas.team_id = teams.team_id where mentor_id = ${mentor_id} && ideas.status = 'SUBMITTED' && ideas.verified_by IS NULL;`, { type: QueryTypes.SELECT });
                submited = await db.query(`SELECT count(*) as idea_count FROM ideas join teams on ideas.team_id = teams.team_id where mentor_id = ${mentor_id} && ideas.status = 'SUBMITTED' && ideas.verified_by IS NOT NULL;`, { type: QueryTypes.SELECT });
            }
            if (institution_id) {
                PendingForApproval = await db.query(`SELECT 
                COUNT(*) AS idea_count
            FROM
                ideas
                    JOIN
                teams ON ideas.team_id = teams.team_id
                    JOIN
                mentors ON teams.mentor_id = mentors.mentor_id
            WHERE
                institution_id = ${institution_id}
                    && ideas.status = 'SUBMITTED' && ideas.verified_by IS NULL;`, { type: QueryTypes.SELECT });
                submited = await db.query(`SELECT 
                COUNT(*) AS idea_count
            FROM
                ideas
                    JOIN
                teams ON ideas.team_id = teams.team_id
                    JOIN
                mentors ON teams.mentor_id = mentors.mentor_id
            WHERE
                institution_id = ${institution_id}
                    && ideas.status = 'SUBMITTED' && ideas.verified_by IS NOT NULL;`, { type: QueryTypes.SELECT });
            }
            result['PendingForApproval'] = Object.values(PendingForApproval[0]).toString();
            result['idea_count'] = Object.values(submited[0]).toString();
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getmentorpercentage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'MENTOR') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let result: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { user_id } = newREQQuery
            if (user_id) {
                const currentProgress = await db.query(`SELECT count(*) as course_completed_count FROM mentor_topic_progress where user_id = ${user_id};`, { type: QueryTypes.SELECT });
                result['currentProgress'] = Object.values(currentProgress[0]).toString()
                result['totalProgress'] = baseConfig.MENTOR_COURSE
            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }

    // protected async getstudentCourseCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     if(res.locals.role !== 'ADMIN'  && res.locals.role !== 'MENTOR'){
    //         return res.status(401).send(dispatcher(res,'','error', speeches.ROLE_ACCES_DECLINE,401));
    //     }
    //     try{
    //         let result :any = {};

    //         const StudentCoursesCompletedCount = await db.query(`SELECT 
    //         count(st.student_id) as studentCourseCMP
    //     FROM
    //         students AS st
    //             JOIN
    //         teams AS te ON st.team_id = te.team_id
    //             JOIN
    //         mentors AS mn ON te.mentor_id = mn.mentor_id
    //             JOIN
    //         organizations AS og ON mn.organization_code = og.organization_code
    //             JOIN
    //         (SELECT 
    //             user_id, COUNT(*)
    //         FROM
    //             user_topic_progress
    //         GROUP BY user_id
    //         HAVING COUNT(*) >= 31) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE';`,{ type: QueryTypes.SELECT });
    //         const started = await db.query(`SELECT 
    //         count(st.student_id) as studentCoursestartted
    //     FROM
    //         students AS st
    //             JOIN
    //         teams AS te ON st.team_id = te.team_id
    //             JOIN
    //         mentors AS mn ON te.mentor_id = mn.mentor_id
    //             JOIN
    //         organizations AS og ON mn.organization_code = og.organization_code
    //             JOIN
    //         (SELECT 
    //             DISTINCT user_id
    //         FROM
    //             user_topic_progress ) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE';`,{ type: QueryTypes.SELECT });
    //         result['StudentCoursesCompletedCount'] = Object.values(StudentCoursesCompletedCount[0]).toString()
    //         result['started'] = Object.values(started[0]).toString()
    //         res.status(200).send(dispatcher(res,result,'done'))
    //     }
    //     catch(err){
    //         next(err)
    //     }
    // }
    protected async getideasCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            if (district) {
                const fullCount = await db.query(`
                SELECT 
    COUNT(te.team_id) AS initiated
FROM
    teams AS te
        JOIN
    mentors AS mn ON te.mentor_id = mn.mentor_id
        JOIN
    institutions AS ins ON ins.institution_id = mn.institution_id
        JOIN
    (SELECT 
        team_id, status
    FROM
        ideas) AS temp ON te.team_id = temp.team_id
        JOIN
    places AS p ON ins.place_id = p.place_id
        JOIN
    blocks AS b ON p.block_id = b.block_id
        JOIN
    districts AS d ON b.district_id = d.district_id
WHERE
    ins.status = 'ACTIVE'
        AND d.district_name = '${district}';`, { type: QueryTypes.SELECT });
                const submittedCount = await db.query(`SELECT 
                COUNT(te.team_id) AS submittedCount
            FROM
                teams AS te
                    JOIN
                mentors AS mn ON te.mentor_id = mn.mentor_id
                    JOIN
                institutions AS ins ON ins.institution_id = mn.institution_id
                    JOIN
                (SELECT 
                    team_id, status
                FROM
                    ideas
                WHERE
                    status = 'SUBMITTED'
                        && verified_by IS NOT NULL) AS temp ON te.team_id = temp.team_id
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}';`, { type: QueryTypes.SELECT })
                const PFACount = await db.query(`
                SELECT 
    COUNT(te.team_id) AS submittedCount
FROM
    teams AS te
        JOIN
    mentors AS mn ON te.mentor_id = mn.mentor_id
        JOIN
    institutions AS ins ON ins.institution_id = mn.institution_id
        JOIN
    (SELECT 
        team_id, status
    FROM
        ideas
    WHERE
        status = 'SUBMITTED'
            && verified_by IS NULL) AS temp ON te.team_id = temp.team_id
        JOIN
    places AS p ON ins.place_id = p.place_id
        JOIN
    blocks AS b ON p.block_id = b.block_id
        JOIN
    districts AS d ON b.district_id = d.district_id
WHERE
    ins.status = 'ACTIVE'
        AND d.district_name = '${district}';`, { type: QueryTypes.SELECT })
                result['PFACount'] = Object.values(PFACount[0]).toString()
                result['initiated_ideas'] = Object.values(fullCount[0]).toString()
                result['submitted_ideas'] = Object.values(submittedCount[0]).toString()
            } else {
                const fullCount = await db.query(`SELECT 
            COUNT(te.team_id) AS initiated
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            institutions AS ins ON ins.institution_id = mn.institution_id
                JOIN
            (SELECT 
                team_id, status
            FROM
                ideas) AS temp ON te.team_id = temp.team_id
        WHERE
            ins.status = 'ACTIVE'`, { type: QueryTypes.SELECT });
                const submittedCount = await db.query(`SELECT 
            COUNT(te.team_id) AS submittedCount
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            institutions AS ins ON ins.institution_id = mn.institution_id
                JOIN
            (SELECT 
                team_id, status
            FROM
                ideas
            WHERE
                status = 'SUBMITTED'
                    && verified_by IS NOT NULL) AS temp ON te.team_id = temp.team_id
        WHERE
            ins.status = 'ACTIVE'`, { type: QueryTypes.SELECT })
                const PFACount = await db.query(`SELECT 
            COUNT(te.team_id) AS PFACountCount
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            institutions AS ins ON ins.institution_id = mn.institution_id
                JOIN
            (SELECT 
                team_id, status
            FROM
                ideas
            WHERE
                status = 'SUBMITTED'
                    && verified_by IS NULL) AS temp ON te.team_id = temp.team_id
        WHERE
            ins.status = 'ACTIVE'`, { type: QueryTypes.SELECT })
                result['PFACount'] = Object.values(PFACount[0]).toString()
                result['initiated_ideas'] = Object.values(fullCount[0]).toString()
                result['submitted_ideas'] = Object.values(submittedCount[0]).toString()
            }

            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }

    protected async getmentorCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            let mentorCount: any = {};
            let mentorMale: any = {};
            if (district) {
                mentorCount = await db.query(`SELECT 
                COUNT(mn.mentor_id) AS totalmentor
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}';`, { type: QueryTypes.SELECT });
                mentorMale = await db.query(`
            SELECT 
    COUNT(mn.mentor_id) AS mentorMale
FROM
    institutions AS ins
        LEFT JOIN
    mentors AS mn ON ins.institution_id = mn.institution_id
        JOIN
    places AS p ON ins.place_id = p.place_id
        JOIN
    blocks AS b ON p.block_id = b.block_id
        JOIN
    districts AS d ON b.district_id = d.district_id
WHERE
    ins.status = 'ACTIVE'
        AND mn.gender = 'Male'
        AND d.district_name = '${district}';`, { type: QueryTypes.SELECT })
            } else {
                mentorCount = await db.query(`SELECT 
            COUNT(mn.mentor_id) AS totalmentor
        FROM
            institutions AS ins
                LEFT JOIN
            mentors AS mn ON ins.institution_id = mn.institution_id
        WHERE
            ins.status = 'ACTIVE';`, { type: QueryTypes.SELECT });
                mentorMale = await db.query(`SELECT 
            COUNT(mn.mentor_id) AS mentorMale
        FROM
            institutions AS ins
                LEFT JOIN
            mentors AS mn ON ins.institution_id = mn.institution_id
        WHERE
            ins.status = 'ACTIVE'
                && mn.gender = 'Male';`, { type: QueryTypes.SELECT })
            }

            result['mentorCount'] = Object.values(mentorCount[0]).toString()
            result['mentorMale'] = Object.values(mentorMale[0]).toString()
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getstudentCountbygender(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            if (district) {
                const student = await db.query(`SELECT 
                COALESCE(SUM(CASE
                    WHEN st.gender = 'MALE' THEN 1
                    ELSE 0
                END),0) AS male,
                COALESCE(SUM(CASE
                    WHEN st.gender = 'FEMALE' THEN 1
                    ELSE 0
                END) ,0)AS female
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    INNER JOIN
                students AS st ON st.team_id = t.team_id
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}';
            `, { type: QueryTypes.SELECT });
                result['studentMale'] = Object.values(student[0])[0].toString();
                result['studentFemale'] = Object.values(student[0])[1].toString();
            } else {
                const student = await db.query(`SELECT 
                COALESCE(SUM(CASE
                    WHEN st.gender = 'MALE' THEN 1
                    ELSE 0
                END),0)AS male,
                COALESCE(SUM(CASE
                    WHEN st.gender = 'FEMALE' THEN 1
                    ELSE 0
                END),0) AS female
            FROM
                institutions AS ins
                    LEFT JOIN
                mentors AS mn ON ins.institution_id = mn.institution_id
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    INNER JOIN
                students AS st ON st.team_id = t.team_id
            WHERE
                ins.status = 'ACTIVE';
            `, { type: QueryTypes.SELECT });
                result['studentMale'] = Object.values(student[0])[0].toString();
                result['studentFemale'] = Object.values(student[0])[1].toString();
            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getSchoolCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            if (district) {
                result = await db.query(`SELECT 
                COUNT(*) AS schoolCount
            FROM
                institutions AS ins
                    JOIN
                places AS p ON ins.place_id = p.place_id
                    JOIN
                blocks AS b ON p.block_id = b.block_id
                    JOIN
                districts AS d ON b.district_id = d.district_id
            WHERE
                ins.status = 'ACTIVE'
                    AND d.district_name = '${district}'`, { type: QueryTypes.SELECT })
            } else {
                result = await db.query(`SELECT count(*) as schoolCount FROM institutions WHERE status='ACTIVE';`, { type: QueryTypes.SELECT })
            }
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getschoolRegCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            if (district) {
                result = await db.query(`
                SELECT 
    COUNT(DISTINCT mn.institution_id) AS RegSchools
FROM
    mentors AS mn
        JOIN
    institutions AS ins ON mn.institution_id = ins.institution_id
        JOIN
    places AS p ON ins.place_id = p.place_id
        JOIN
    blocks AS b ON p.block_id = b.block_id
        JOIN
    districts AS d ON b.district_id = d.district_id
WHERE
    ins.status = 'ACTIVE'
        AND d.district_name = '${district}'`, { type: QueryTypes.SELECT })
            } else {
                result = await db.query(`SELECT 
                COUNT(DISTINCT mn.institution_id) AS RegSchools
            FROM
                mentors AS mn
                    JOIN
                institutions AS ins ON mn.institution_id = ins.institution_id
            WHERE
                ins.status = 'ACTIVE';`, { type: QueryTypes.SELECT });
            }

            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getinvalidInst(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
            const district = newREQQuery.district;
            let result: any = {};
            if (district) {
                result = {InvalidInstitutions : 0 }
            } else {
                result = await db.query(`select count(*) InvalidInstitutions from institutions where place_id = 0;`, { type: QueryTypes.SELECT })
            }

            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    // protected async getmentorCourseCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     if(res.locals.role !== 'ADMIN'  && res.locals.role !== 'MENTOR'){
    //         return res.status(401).send(dispatcher(res,'','error', speeches.ROLE_ACCES_DECLINE,401));
    //     }
    //     try{
    //         let result :any = {};
    //        result = await db.query(`select count(*) as mentorCoursesCompletedCount from (SELECT 
    //         district,cou
    //     FROM
    //         unisolve_db.organizations AS og
    //             LEFT JOIN
    //         (SELECT 
    //             organization_code, cou
    //         FROM
    //             unisolve_db.mentors AS mn
    //         LEFT JOIN (SELECT 
    //             user_id, COUNT(*) AS cou
    //         FROM
    //             unisolve_db.mentor_topic_progress
    //         GROUP BY user_id having count(*)>=8) AS t ON mn.user_id = t.user_id ) AS c ON c.organization_code = og.organization_code WHERE og.status='ACTIVE'
    //     group by organization_id having cou>=8) as final`,{ type: QueryTypes.SELECT })
    //         res.status(200).send(dispatcher(res,result,'done'))
    //     }
    //     catch(err){
    //         next(err)
    //     }
    // }
    // protected async getATLNonATLRegCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     if(res.locals.role !== 'ADMIN'  && res.locals.role !== 'MENTOR'){
    //         return res.status(401).send(dispatcher(res,'','error', speeches.ROLE_ACCES_DECLINE,401));
    //     }
    //     try{
    //         let result :any = {};
    //         const ATLCount = await db.query(`SELECT 
    //         COUNT(DISTINCT mn.organization_code) AS RegSchools
    //     FROM
    //         organizations AS og
    //             LEFT JOIN
    //         mentors AS mn ON og.organization_code = mn.organization_code
    //     WHERE
    //         og.status = 'ACTIVE' and og.category = 'ATL';`,{ type: QueryTypes.SELECT });
    //         const NONATLCount = await db.query(`SELECT 
    //         COUNT(DISTINCT mn.organization_code) AS RegSchools
    //     FROM
    //         organizations AS og
    //             LEFT JOIN
    //         mentors AS mn ON og.organization_code = mn.organization_code
    //     WHERE
    //         og.status = 'ACTIVE' and og.category = 'Non ATL';`,{ type: QueryTypes.SELECT });
    //         result['ATLCount']=Object.values(ATLCount[0]).toString();
    //         result['NONATLCount']=Object.values(NONATLCount[0]).toString();
    //         res.status(200).send(dispatcher(res,result,'done'))
    //     }
    //     catch(err){
    //         next(err)
    //     }
    // }
    protected async getStateDashboard(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STATE') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let data: any = {}
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const state = newREQQuery.state;
            let wherefilter = `&& og.state= '${state}'`;
            const summary = await db.query(`SELECT 
                org.state,
                org.ATL_Count,
                org.ATL_Reg_Count,
                org.NONATL_Reg_Count,
                org.male_mentor_count + org.female_mentor_count AS total_registered_teachers
            FROM
                (SELECT 
                    o.state,
                        COUNT(CASE
                            WHEN o.category = 'ATL' THEN 1
                        END) AS ATL_Count,
                        COUNT(CASE
                            WHEN
                                m.mentor_id <> 'null'
                                    AND o.category = 'ATL'
                            THEN
                                1
                        END) AS ATL_Reg_Count,
                        COUNT(CASE
                            WHEN
                                m.mentor_id <> 'null'
                                    AND o.category = 'Non ATL'
                            THEN
                                1
                        END) AS NONATL_Reg_Count,
                        SUM(CASE
                            WHEN m.gender = 'Male' THEN 1
                            ELSE 0
                        END) AS male_mentor_count,
                        SUM(CASE
                            WHEN m.gender = 'Female' THEN 1
                            ELSE 0
                        END) AS female_mentor_count
                FROM
                    organizations o
                LEFT JOIN mentors m ON o.organization_code = m.organization_code
                WHERE
                    o.status = 'ACTIVE' && o.state= '${state}'
                GROUP BY o.state) AS org`, { type: QueryTypes.SELECT });

            const teamCount = await db.query(`SELECT 
                og.state, COUNT(t.team_id) AS totalTeams
            FROM
                organizations AS og
                    LEFT JOIN
                mentors AS mn ON og.organization_code = mn.organization_code
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                WHERE og.status='ACTIVE' ${wherefilter}
            GROUP BY og.state;`, { type: QueryTypes.SELECT });
            const studentCountDetails = await db.query(`SELECT 
                og.state,
                COUNT(st.student_id) AS totalstudent
            FROM
                organizations AS og
                    LEFT JOIN
                mentors AS mn ON og.organization_code = mn.organization_code
                    INNER JOIN
                teams AS t ON mn.mentor_id = t.mentor_id
                    INNER JOIN
                students AS st ON st.team_id = t.team_id
                WHERE og.status='ACTIVE' ${wherefilter}
            GROUP BY og.state;`, { type: QueryTypes.SELECT });
            const courseCompleted = await db.query(`select state,count(*) as courseCMP from (SELECT 
                state,cou
            FROM
                unisolve_db.organizations AS og
                    LEFT JOIN
                (SELECT 
                    organization_code, cou
                FROM
                    unisolve_db.mentors AS mn
                LEFT JOIN (SELECT 
                    user_id, COUNT(*) AS cou
                FROM
                    unisolve_db.mentor_topic_progress
                GROUP BY user_id having count(*)>=8) AS t ON mn.user_id = t.user_id ) AS c ON c.organization_code = og.organization_code WHERE og.status='ACTIVE' ${wherefilter}
            group by organization_id having cou>=8) as final group by state`, { type: QueryTypes.SELECT });
            const StudentCourseCompleted = await db.query(`SELECT 
            og.state,count(st.student_id) as studentCourseCMP
        FROM
            students AS st
                JOIN
            teams AS te ON st.team_id = te.team_id
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                user_id, COUNT(*)
            FROM
                user_topic_progress
            GROUP BY user_id
            HAVING COUNT(*) >= 31) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE' ${wherefilter} group by og.state`, { type: QueryTypes.SELECT });
            const submittedCount = await db.query(`SELECT 
            og.state,count(te.team_id) as submittedCount
        FROM
            teams AS te
                JOIN
            mentors AS mn ON te.mentor_id = mn.mentor_id
                JOIN
            organizations AS og ON mn.organization_code = og.organization_code
                JOIN
            (SELECT 
                team_id, status
            FROM
                challenge_responses
            WHERE
                status = 'SUBMITTED') AS temp ON te.team_id = temp.team_id WHERE og.status='ACTIVE' ${wherefilter} group by og.state`, { type: QueryTypes.SELECT });

            data['orgdata'] = summary;
            data['teamCount'] = teamCount;
            data['studentCountDetails'] = studentCountDetails;
            data['courseCompleted'] = courseCompleted;
            data['StudentCourseCompleted'] = StudentCourseCompleted;
            data['submittedCount'] = submittedCount;
            if (!data) {
                throw notFound(speeches.DATA_NOT_FOUND)
            }
            if (data instanceof Error) {
                throw data
            }
            res.status(200).send(dispatcher(res, data, "success"))
        } catch (err) {
            next(err)
        }
    }
};