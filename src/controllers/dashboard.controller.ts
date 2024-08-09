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

        // ///map stats
        // this.router.get(`${this.path}/refreshMapStatsLive`, this.getMapStatsLive.bind(this))
        //this.router.get(`${this.path}/mapStats`, this.getMapStats.bind(this))
        this.router.get(`${this.path}/mapStatsCount`, this.getMapStatsCount.bind(this))
        //this.router.get(`${this.path}/refreshMapStats`, this.refreshMapStats.bind(this))

        //evaluator stats..
        this.router.get(`${this.path}/evaluatorStats`, this.getEvaluatorStats.bind(this));


        //singledashboard student api's 
        this.router.get(`${this.path}/ideaCount`, this.getideaCount.bind(this));

        //singledashboard admin api's
        this.router.get(`${this.path}/studentCount`, this.getstudentCount.bind(this));
        this.router.get(`${this.path}/ideasCount`, this.getideasCount.bind(this));
        this.router.get(`${this.path}/studentCountbygender`, this.getstudentCountbygender.bind(this));
        this.router.get(`${this.path}/Overallideas`, this.getOverallideas.bind(this));
        this.router.get(`${this.path}/OverallStudent`, this.getOverallStudent.bind(this));
        this.router.get(`${this.path}/allCategorys`, this.getcategory.bind(this));
        this.router.get(`${this.path}/allInstitutions`, this.gettype.bind(this));
        this.router.get(`${this.path}/allGenders`, this.getgender.bind(this));
        this.router.get(`${this.path}/StudentStateWise`, this.getStudentState.bind(this));
        this.router.get(`${this.path}/themeWise`, this.getthemeCount.bind(this));
        this.router.get(`${this.path}/HavingPrototype`, this.getHavingPrototype.bind(this));
        this.router.get(`${this.path}/detailsStudents`, this.getdetailsofstudent.bind(this));
        this.router.get(`${this.path}/detailsIdeas`, this.getdeatailsofIdeas.bind(this));

        // //State DashBoard stats
        // this.router.get(`${this.path}/StateDashboard`, this.getStateDashboard.bind(this));


        super.initializeRoutes();
    }








    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////// MAPP STATS
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // private async refreshMapStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     try {
    //         const service = new DashboardService()
    //         const student_count = await db.query(`SELECT 
    //             state, COUNT(idea_id) as idea_Cout
    //         FROM
    //             Life_db.ideas
    //         GROUP BY state;`, { type: QueryTypes.SELECT });
    //         const result = await service.resetMapStats(student_count)

    //         res.status(200).json(dispatcher(res, result, "success"))
    //     } catch (err) {
    //         next(err);
    //     }
    // }
    // private async getMapStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     try {
    //         //this.model = dashboard_map_stat.name
    //         const student_count = await db.query(`SELECT 
    //             state, COUNT(idea_id) as idea_Cout
    //         FROM
    //             Life_db.ideas
    //         GROUP BY state;`, { type: QueryTypes.SELECT });

    //         return await this.getData(req, res, next, [],
    //             [
    //                 [db.fn('DISTINCT', db.col('state_name')), 'state_name'],
    //                 `dashboard_map_stat_id`,`ideas`, `students`, `status`, `created_by`, `created_at`, `updated_by`, `updated_at`
    //             ]
    //         )
    //     } catch (error) {
    //         next(error);
    //     }
    // };

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////// EVALUATOR STATS
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    protected async getEvaluatorStats(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'EADMIN') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            let response: any = {};
            const submitted_count = await db.query("SELECT count(idea_id) as 'submitted_count' FROM ideas where status = 'SUBMITTED'", { type: QueryTypes.SELECT });
            const selected_round_one_count = await db.query("SELECT count(idea_id) as 'selected_round_one_count' FROM ideas where evaluation_status = 'SELECTEDROUND1'", { type: QueryTypes.SELECT });
            const rejected_round_one_count = await db.query("SELECT count(idea_id) as 'rejected_round_one_count' FROM ideas where evaluation_status = 'REJECTEDROUND1'", { type: QueryTypes.SELECT });
            const l2_yet_to_processed = await db.query("SELECT COUNT(*) AS l2_yet_to_processed FROM l1_accepted;", { type: QueryTypes.SELECT });
            const l2_processed = await db.query("SELECT idea_id, count(idea_id) AS l2_processed FROM unisolve_db.evaluator_ratings group by idea_id HAVING COUNT(idea_id) > 2", { type: QueryTypes.SELECT });
            const draft_count = await db.query("SELECT count(idea_id) as 'draft_count' FROM ideas where status = 'DRAFT' ", { type: QueryTypes.SELECT });
            const final_challenges = await db.query("SELECT count(idea_id) as 'final_challenges' FROM evaluation_results where status = 'ACTIVE'", { type: QueryTypes.SELECT });
            const l1_yet_to_process = await db.query(`SELECT COUNT(idea_id) AS l1YetToProcess FROM unisolve_db.ideas WHERE (status = 'SUBMITTED') AND evaluation_status IS NULL OR evaluation_status = '';`, { type: QueryTypes.SELECT });
            const final_evaluation_challenge = await db.query(`SELECT COUNT(idea_id) FROM unisolve_db.ideas WHERE final_result = '0'`, { type: QueryTypes.SELECT });
            const final_evaluation_final = await db.query(`SELECT COUNT(idea_id) FROM unisolve_db.ideas WHERE final_result = '1'`, { type: QueryTypes.SELECT });
            if (submitted_count instanceof Error) {
                throw submitted_count
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
            result = await db.query(`SELECT 
                COUNT(st.student_id) AS student_count
            FROM
                students AS st
            WHERE
                ins.status = 'ACTIVE';`, { type: QueryTypes.SELECT });

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
            let submited: any = {};
            let newREQQuery: any = {}
            if (req.query.Data) {
                let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
                newREQQuery = JSON.parse(newQuery);
            } else if (Object.keys(req.query).length !== 0) {
                return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
            }
            const { student_id } = newREQQuery
            if (student_id) {
                submited = await db.query(`SELECT count(*) as idea_count FROM ideas where student_id = ${student_id} && ideas.status = 'SUBMITTED';`, { type: QueryTypes.SELECT });
            }
            result['idea_count'] = Object.values(submited[0]).toString();
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
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
            let result: any = {};
            const fullCount = await db.query(`SELECT count(*) as idea_count FROM ideas`, { type: QueryTypes.SELECT });
            const submittedCount = await db.query(`SELECT count(*) as idea_count FROM ideas where ideas.status = 'SUBMITTED';`, { type: QueryTypes.SELECT })
            result['initiated_ideas'] = Object.values(fullCount[0]).toString()
            result['submitted_ideas'] = Object.values(submittedCount[0]).toString()
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
            let result: any = {}
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
                students AS st ;`, { type: QueryTypes.SELECT });
            result['studentMale'] = Object.values(student[0])[0].toString();
            result['studentFemale'] = Object.values(student[0])[1].toString();
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }

    // protected async getStateDashboard(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    //     if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STATE') {
    //         return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
    //     }
    //     try {
    //         let data: any = {}
    //         let newREQQuery: any = {}
    //         if (req.query.Data) {
    //             let newQuery: any = await this.authService.decryptGlobal(req.query.Data);
    //             newREQQuery = JSON.parse(newQuery);
    //         } else if (Object.keys(req.query).length !== 0) {
    //             return res.status(400).send(dispatcher(res, '', 'error', 'Bad Request', 400));
    //         }
    //         const state = newREQQuery.state;
    //         let wherefilter = `&& og.state= '${state}'`;
    //         const summary = await db.query(`SELECT 
    //             org.state,
    //             org.ATL_Count,
    //             org.ATL_Reg_Count,
    //             org.NONATL_Reg_Count,
    //             org.male_mentor_count + org.female_mentor_count AS total_registered_teachers
    //         FROM
    //             (SELECT 
    //                 o.state,
    //                     COUNT(CASE
    //                         WHEN o.category = 'ATL' THEN 1
    //                     END) AS ATL_Count,
    //                     COUNT(CASE
    //                         WHEN
    //                             m.mentor_id <> 'null'
    //                                 AND o.category = 'ATL'
    //                         THEN
    //                             1
    //                     END) AS ATL_Reg_Count,
    //                     COUNT(CASE
    //                         WHEN
    //                             m.mentor_id <> 'null'
    //                                 AND o.category = 'Non ATL'
    //                         THEN
    //                             1
    //                     END) AS NONATL_Reg_Count,
    //                     SUM(CASE
    //                         WHEN m.gender = 'Male' THEN 1
    //                         ELSE 0
    //                     END) AS male_mentor_count,
    //                     SUM(CASE
    //                         WHEN m.gender = 'Female' THEN 1
    //                         ELSE 0
    //                     END) AS female_mentor_count
    //             FROM
    //                 organizations o
    //             LEFT JOIN mentors m ON o.organization_code = m.organization_code
    //             WHERE
    //                 o.status = 'ACTIVE' && o.state= '${state}'
    //             GROUP BY o.state) AS org`, { type: QueryTypes.SELECT });

    //         const teamCount = await db.query(`SELECT 
    //             og.state, COUNT(t.team_id) AS totalTeams
    //         FROM
    //             organizations AS og
    //                 LEFT JOIN
    //             mentors AS mn ON og.organization_code = mn.organization_code
    //                 INNER JOIN
    //             teams AS t ON mn.mentor_id = t.mentor_id
    //             WHERE og.status='ACTIVE' ${wherefilter}
    //         GROUP BY og.state;`, { type: QueryTypes.SELECT });
    //         const studentCountDetails = await db.query(`SELECT 
    //             og.state,
    //             COUNT(st.student_id) AS totalstudent
    //         FROM
    //             organizations AS og
    //                 LEFT JOIN
    //             mentors AS mn ON og.organization_code = mn.organization_code
    //                 INNER JOIN
    //             teams AS t ON mn.mentor_id = t.mentor_id
    //                 INNER JOIN
    //             students AS st ON st.team_id = t.team_id
    //             WHERE og.status='ACTIVE' ${wherefilter}
    //         GROUP BY og.state;`, { type: QueryTypes.SELECT });
    //         const courseCompleted = await db.query(`select state,count(*) as courseCMP from (SELECT 
    //             state,cou
    //         FROM
    //             unisolve_db.organizations AS og
    //                 LEFT JOIN
    //             (SELECT 
    //                 organization_code, cou
    //             FROM
    //                 unisolve_db.mentors AS mn
    //             LEFT JOIN (SELECT 
    //                 user_id, COUNT(*) AS cou
    //             FROM
    //                 unisolve_db.mentor_topic_progress
    //             GROUP BY user_id having count(*)>=8) AS t ON mn.user_id = t.user_id ) AS c ON c.organization_code = og.organization_code WHERE og.status='ACTIVE' ${wherefilter}
    //         group by organization_id having cou>=8) as final group by state`, { type: QueryTypes.SELECT });
    //         const StudentCourseCompleted = await db.query(`SELECT 
    //         og.state,count(st.student_id) as studentCourseCMP
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
    //         HAVING COUNT(*) >= 31) AS temp ON st.user_id = temp.user_id WHERE og.status='ACTIVE' ${wherefilter} group by og.state`, { type: QueryTypes.SELECT });
    //         const submittedCount = await db.query(`SELECT 
    //         og.state,count(te.team_id) as submittedCount
    //     FROM
    //         teams AS te
    //             JOIN
    //         mentors AS mn ON te.mentor_id = mn.mentor_id
    //             JOIN
    //         organizations AS og ON mn.organization_code = og.organization_code
    //             JOIN
    //         (SELECT 
    //             team_id, status
    //         FROM
    //             challenge_responses
    //         WHERE
    //             status = 'SUBMITTED') AS temp ON te.team_id = temp.team_id WHERE og.status='ACTIVE' ${wherefilter} group by og.state`, { type: QueryTypes.SELECT });

    //         data['orgdata'] = summary;
    //         data['teamCount'] = teamCount;
    //         data['studentCountDetails'] = studentCountDetails;
    //         data['courseCompleted'] = courseCompleted;
    //         data['StudentCourseCompleted'] = StudentCourseCompleted;
    //         data['submittedCount'] = submittedCount;
    //         if (!data) {
    //             throw notFound(speeches.DATA_NOT_FOUND)
    //         }
    //         if (data instanceof Error) {
    //             throw data
    //         }
    //         res.status(200).send(dispatcher(res, data, "success"))
    //     } catch (err) {
    //         next(err)
    //     }
    // }
    protected async getMapStatsCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            let result: any = {};
            let submited: any = {};
            const ideas_count = await db.query(`SELECT 
                state, COUNT(idea_id) as idea_Cout
            FROM
                Life_db.ideas
            GROUP BY state;`, { type: QueryTypes.SELECT });
            const student_count = await db.query(`SELECT 
    state, COUNT(student_id) as student_Cout
FROM
    Life_db.students
GROUP BY state;`, { type: QueryTypes.SELECT });
            const student_team_count = await db.query(`SELECT 
    students.state,
    COALESCE(COUNT(teams.team_id), 0) AS teams_cnt
FROM
    students
        LEFT JOIN
    teams ON students.student_id = teams.student_id
GROUP BY students.state`, { type: QueryTypes.SELECT });
            const combined: any = {};
            result = await this.authService.combinearrayfordashboard(ideas_count, student_count, student_team_count)
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            console.log(err);
            next(err)
        }
    }
    protected async getOverallStudent(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`select (select count(*) from students)+
(select count(*) from teams) as "overall students"`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getOverallideas(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`select count(*) as "overall ideas"  from ideas;`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getcategory(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`SELECT
    COUNT(CASE WHEN year_of_study = 'Student' THEN 1 END) AS student_count,
    COUNT(CASE WHEN year_of_study = 'Faculty' THEN 1 END) AS faculty_count,
    COUNT(CASE WHEN year_of_study = 'Research Scholar' THEN 1 END) AS RS_count,
    COUNT(CASE WHEN year_of_study = 'Others' THEN 1 END) AS others_count
FROM Life_db.students;
`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async gettype(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`SELECT
    COUNT(CASE WHEN s.group = 'Engineering' THEN 1 END) AS Engineering_count,
    COUNT(CASE WHEN s.group = 'Law' THEN 1 END) AS Law_count,
    COUNT(CASE WHEN s.group = 'Life Sciences' THEN 1 END) AS Life_Sciences_count,
    COUNT(CASE WHEN s.group = 'Medical' THEN 1 END) AS Medical_count,
    COUNT(CASE WHEN s.group = 'Ayurveda' THEN 1 END) AS Ayurveda_count,
    COUNT(CASE WHEN s.group = 'Others' THEN 1 END) AS Others_count
FROM students as s
`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getgender(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`SELECT
    COUNT(CASE WHEN Gender = 'MALE' THEN 1 END) AS male_count,
    COUNT(CASE WHEN Gender = 'FEMALE' THEN 1 END) AS female_count,
    COUNT(CASE WHEN Gender = 'OTHERS' THEN 1 END) AS others_count
FROM Life_db.students;
`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getStudentState(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`SELECT 
    state,
    COUNT(*) AS state_count
FROM Life_db.students
GROUP BY state
ORDER BY state_count DESC;
`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getthemeCount(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`SELECT
    COUNT(CASE WHEN theme_problem_id = 1 THEN 1 END) AS "Save Energy",
     COUNT(CASE WHEN theme_problem_id = 2 THEN 1 END) AS "Save Water",
      COUNT(CASE WHEN theme_problem_id = 3 THEN 1 END) AS "Say No to Single Use Plastic",
       COUNT(CASE WHEN theme_problem_id = 4 THEN 1 END) AS "Reduce E-waste",
        COUNT(CASE WHEN theme_problem_id = 5 THEN 1 END) AS "Adopt Sustainable Food Systems",
         COUNT(CASE WHEN theme_problem_id = 6 THEN 1 END) AS "Reduce Waste",
          COUNT(CASE WHEN theme_problem_id = 7 THEN 1 END) AS "Adopt Healthy Lifestyles",
           COUNT(CASE WHEN theme_problem_id = 8 THEN 1 END) AS "Others (Any other theme related to environment-friendly lifestyle) "
FROM ideas where ideas.status = "SUBMITTED";
`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getHavingPrototype(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const result = await db.query(`select count(*) as "Having Prototype" from ideas where prototype_available = "YES";`, { type: QueryTypes.SELECT });
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getdetailsofstudent(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const resultquery = await db.query(`SELECT 
    state,
    COUNT(*) AS reg_student,
    (SELECT 
            teams_cnt
        FROM
            (SELECT 
                students.state,
                    COALESCE(COUNT(teams.team_id), 0) AS teams_cnt
            FROM
                students
            LEFT JOIN teams ON students.student_id = teams.student_id
            GROUP BY students.state) AS tt
        WHERE
            tt.state = s.state) AS 'team members',
    COUNT(CASE
        WHEN Gender = 'MALE' THEN 1
    END) AS male_count,
    COUNT(CASE
        WHEN Gender = 'FEMALE' THEN 1
    END) AS female_count,
    COUNT(CASE
        WHEN Gender = 'OTHERS' THEN 1
    END) AS others_count,
    COUNT(CASE
        WHEN year_of_study = 'Student' THEN 1
    END) AS student_count,
    COUNT(CASE
        WHEN year_of_study = 'Faculty' THEN 1
    END) AS faculty_count,
    COUNT(CASE
        WHEN year_of_study = 'Research Scholar' THEN 1
    END) AS RS_count,
    COUNT(CASE
        WHEN year_of_study = 'Others' THEN 1
    END) AS others_count,
    COUNT(CASE
        WHEN s.group = 'Engineering' THEN 1
    END) AS Engineering_count,
    COUNT(CASE
        WHEN s.group = 'Law' THEN 1
    END) AS Law_count,
    COUNT(CASE
        WHEN s.group = 'Life Sciences' THEN 1
    END) AS Life_Sciences_count,
    COUNT(CASE
        WHEN s.group = 'Medical' THEN 1
    END) AS Medical_count,
    COUNT(CASE
        WHEN s.group = 'Ayurveda' THEN 1
    END) AS Ayurveda_count,
    COUNT(CASE
        WHEN s.group = 'Others' THEN 1
    END) AS Others_count
FROM
    Life_db.students AS s
GROUP BY state
ORDER BY state`, { type: QueryTypes.SELECT });
            const result = await this.authService.addingstatesodstudent(resultquery);
            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }
    protected async getdeatailsofIdeas(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        if (res.locals.role !== 'ADMIN' && res.locals.role !== 'STUDENT') {
            return res.status(401).send(dispatcher(res, '', 'error', speeches.ROLE_ACCES_DECLINE, 401));
        }
        try {
            const resultquery = await db.query(`SELECT 
state,
    COUNT(*) AS 'submited',
    COUNT(CASE
        WHEN theme_problem_id = 1 THEN 1
    END) AS 'Save Energy',
    COUNT(CASE
        WHEN theme_problem_id = 2 THEN 1
    END) AS 'Save Water',
    COUNT(CASE
        WHEN theme_problem_id = 3 THEN 1
    END) AS 'Say No to Single Use Plastic',
    COUNT(CASE
        WHEN theme_problem_id = 4 THEN 1
    END) AS 'Reduce E-waste',
    COUNT(CASE
        WHEN theme_problem_id = 5 THEN 1
    END) AS 'Adopt Sustainable Food Systems',
    COUNT(CASE
        WHEN theme_problem_id = 6 THEN 1
    END) AS 'Reduce Waste',
    COUNT(CASE
        WHEN theme_problem_id = 7 THEN 1
    END) AS 'Adopt Healthy Lifestyles',
    COUNT(CASE
        WHEN theme_problem_id = 8 THEN 1
    END) AS 'Others (Any other theme related to environment-friendly lifestyle) '
FROM
    Life_db.ideas
WHERE
    ideas.status = 'SUBMITTED'
GROUP BY state`, { type: QueryTypes.SELECT });
            const result = await this.authService.addingstates(resultquery);

            res.status(200).send(dispatcher(res, result, 'done'))
        }
        catch (err) {
            next(err)
        }
    }

};