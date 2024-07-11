import { teamSchema, teamUpdateSchema } from "../validations/team.validationa";
import ValidationsHolder from "../validations/validationHolder";
import BaseController from "./base.controller";
import authService from '../services/auth.service';

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

}