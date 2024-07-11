import { challenge_response } from "../models/challenge_response.model";
import { dashboard_map_stat } from "../models/dashboard_map_stat.model";
import { student } from "../models/student.model";
import { team } from "../models/team.model";
import BaseService from "./base.service";

export default class DashboardService extends BaseService {
    /**
     * truncates the data in dashboard map stats tables and re entries
     * @returns Object 
     */
    // async resetMapStats() {
    //     try {
    //         let uniqueDistricts: any;
    //         let bulkCreateArray: any = [];
    //         uniqueDistricts = await this.crudService.findAll(organization, { group: ["state"] });
    //         if (!uniqueDistricts || uniqueDistricts.length <= 0) {
    //             console.log("uniqueDistricts", uniqueDistricts)
    //             return
    //         }
    //         if (uniqueDistricts instanceof Error) {
    //             console.log("uniqueDistricts", uniqueDistricts)
    //             return
    //         }
    //         for (const state of uniqueDistricts) {
    //             try {
    //                 if (state.state === null) {
    //                     continue
    //                 }
    //                 const stats: any = await this.getMapStatsForDistrict(state.dataValues.state)

    //                 bulkCreateArray.push({
    //                     overall_schools: stats.schoolIdsInDistrict.length,
    //                     reg_schools: stats.registeredSchoolIdsInDistrict.length,
    //                     teams: stats.teamIdInDistrict.length,
    //                     ideas: stats.challengeInDistrict.length,
    //                     state_name: state.state,
    //                     students: stats.studentsInDistric.length,
    //                     schools_with_teams: stats.schoolIdsInDistrictWithTeams.length
    //                 })
    //             } catch (err) {
    //                 console.log(err)
    //             }
    //         }

    //         const statsForAllDistrics: any = await this.getMapStatsForDistrict(null)

    //         bulkCreateArray.push({
    //             overall_schools: statsForAllDistrics.schoolIdsInDistrict.length,
    //             reg_schools: statsForAllDistrics.registeredSchoolIdsInDistrict.length,
    //             teams: statsForAllDistrics.teamIdInDistrict.length,
    //             ideas: statsForAllDistrics.challengeInDistrict.length,
    //             state_name: "all",
    //             students: statsForAllDistrics.studentsInDistric.length,
    //             schools_with_teams: statsForAllDistrics.schoolIdsInDistrictWithTeams.length
    //         })

    //         await this.crudService.delete(dashboard_map_stat, { where: {}, truncate: true });
    //         const result = await this.crudService.bulkCreate(dashboard_map_stat, bulkCreateArray);
    //         return result;
    //     } catch (err) {
    //         return err
    //     }
    // }
    
    /**
     * Get map stats data with based on state
     * @param argdistric String default set to null
     * @returns object
     */
    // async getMapStatsForDistrict(argdistric: any = null) {
    //     try {
    //         let whereClause = {}
    //         let schoolIdsInDistrict: any = [];
    //         let mentorIdInDistrict: any = [];
    //         let registeredSchoolIdsInDistrict: any = [];
    //         let schoolIdsInDistrictWithTeams: any = [];
    //         let teamIdInDistrict: any = [];
    //         let challengeInDistrict: any = [];
    //         let studentsInDistric: any = [];

    //         if (argdistric) {
    //             whereClause = {
    //                 state: argdistric,
    //             }
    //         }

    //         whereClause = {
    //             ...whereClause,
    //             status: "ACTIVE"
    //         }

    //         const overAllSchool = await this.crudService.findAll(organization, {
    //             where: whereClause
    //         });
    //         if (!overAllSchool || (!overAllSchool.length) || overAllSchool.length == 0) {
    //             return {
    //                 schoolIdsInDistrict: schoolIdsInDistrict,
    //                 registeredSchoolIdsInDistrict: registeredSchoolIdsInDistrict,
    //                 teamIdInDistrict: teamIdInDistrict,
    //                 challengeInDistrict: challengeInDistrict,
    //                 studentsInDistric: studentsInDistric,
    //                 schoolIdsInDistrictWithTeams: schoolIdsInDistrictWithTeams
    //             }
    //         }
    //         schoolIdsInDistrict = overAllSchool.map((Element: any) => Element.dataValues.organization_code);
    //         const mentorReg = await this.crudService.findAll(mentor, {
    //             where: {
    //                 organization_code: schoolIdsInDistrict,
    //                 status: 'ACTIVE'
    //             }
    //         });
    //         if (!mentorReg || (!mentorReg.length) || mentorReg.length == 0) {
    //             return {
    //                 schoolIdsInDistrict: schoolIdsInDistrict,
    //                 registeredSchoolIdsInDistrict: registeredSchoolIdsInDistrict,
    //                 teamIdInDistrict: teamIdInDistrict,
    //                 challengeInDistrict: challengeInDistrict,
    //                 studentsInDistric: studentsInDistric,
    //                 schoolIdsInDistrictWithTeams: schoolIdsInDistrictWithTeams
    //             }
    //         }
    //         mentorIdInDistrict = mentorReg.map((Element: any) => Element.dataValues.mentor_id);//changed this to  user_id from mentor_id, because teams has mentor linked with team via user_id as value in the mentor_id collumn of the teams table

    //         const schoolRegistered = await this.crudService.findAll(mentor, {
    //             where: {
    //                 mentor_id: mentorIdInDistrict,
    //                 status: 'ACTIVE'
    //             },
    //             group: ['organization_code']
    //         });
    //         if (!schoolRegistered || (!schoolRegistered.length) || schoolRegistered.length == 0) {
    //             registeredSchoolIdsInDistrict = []
    //         } else {
    //             registeredSchoolIdsInDistrict = schoolRegistered.map((Element: any) => Element.dataValues.organization_code);
    //         }


    //         const teamReg = await this.crudService.findAll(team, {
    //             where: {
    //                 mentor_id: mentorIdInDistrict,
    //                 status: 'ACTIVE'
    //             }
    //         });
    //         if (!teamReg || (!teamReg.length) || teamReg.length == 0) {
    //             return {
    //                 schoolIdsInDistrict: schoolIdsInDistrict,
    //                 registeredSchoolIdsInDistrict: registeredSchoolIdsInDistrict,
    //                 teamIdInDistrict: teamIdInDistrict,
    //                 challengeInDistrict: challengeInDistrict,
    //                 studentsInDistric: studentsInDistric,
    //                 schoolIdsInDistrictWithTeams: schoolIdsInDistrictWithTeams
    //             }
    //         }
    //         teamIdInDistrict = teamReg.map((Element: any) => Element.dataValues.team_id);

    //         //u could call below as schools with teams since one school can have only one mentor 
    //         const distinctMentorsWithTeams = await team.findAll({
    //             attributes: [
    //                 "mentor_id",
    //             ],
    //             where: {
    //                 mentor_id: mentorIdInDistrict,
    //                 status: 'ACTIVE'
    //             },
    //             group: ['mentor_id'],
    //         })
    //         if (!distinctMentorsWithTeams || (!distinctMentorsWithTeams.length) || distinctMentorsWithTeams.length == 0) {
    //             schoolIdsInDistrictWithTeams = []
    //         } else {
    //             schoolIdsInDistrictWithTeams = distinctMentorsWithTeams.map((Element: any) => Element.dataValues.mentor_id);
    //         }


    //         const challengeReg = await this.crudService.findAll(challenge_response, {
    //             where: {
    //                 team_id: teamIdInDistrict,
    //                 status: 'SUBMITTED'
    //             }
    //         });

    //         if (!challengeReg || (!challengeReg.length) || challengeReg.length == 0) {
    //             challengeInDistrict = []
    //         } else {
    //             challengeInDistrict = challengeReg.map((Element: any) => Element.dataValues.challenge_response_id);
    //         }


    //         const studentsResult = await student.findAll({
    //             attributes: [
    //                 "user_id",
    //                 "student_id"
    //             ],
    //             where: {
    //                 team_id: teamIdInDistrict,
    //                 status: 'ACTIVE'
    //             }
    //         })
    //         if (!studentsResult || (!studentsResult.length) || studentsResult.length == 0) {
    //             studentsInDistric = []
    //         } else {
    //             studentsInDistric = studentsResult.map((Element: any) => Element.dataValues.student_id);
    //         }
    //         studentsInDistric = studentsResult.map((Element: any) => Element.dataValues.student_id);

    //         return {
    //             schoolIdsInDistrict: schoolIdsInDistrict,
    //             registeredSchoolIdsInDistrict: registeredSchoolIdsInDistrict,
    //             teamIdInDistrict: teamIdInDistrict,
    //             challengeInDistrict: challengeInDistrict,
    //             studentsInDistric: studentsInDistric,
    //             schoolIdsInDistrictWithTeams: schoolIdsInDistrictWithTeams
    //         }
    //     } catch (err) {
    //         return err
    //     }
    // }
   
    
   
    

    /**
     * count for idea submission for student
     * @param addWhereClauseStatusPart String
     * @param whereClauseStatusPartLiteral String
     * @returns Object
     */
    getDbLieralIdeaSubmission(addWhereClauseStatusPart: any, whereClauseStatusPartLiteral: any) {
        return `
        select count(*) from ideas as idea where idea.team_id = \`student\`.\`team_id\` and status = "SUBMITTED" and verified_by IS NOT NULL
        `
    }
    getDbLieralPFA(addWhereClauseStatusPart: any, whereClauseStatusPartLiteral: any) {
        return `
        select count(*) from ideas as idea where idea.team_id = \`student\`.\`team_id\` and status = "SUBMITTED"
        `
    }
   
    
   
    
    
}