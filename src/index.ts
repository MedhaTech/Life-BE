import "dotenv/config";
import validateEnv from "./utils/validate_env";
import App from "./app";

import TeamController from "./controllers/team.controller";
import FaqCategoryController from "./controllers/faq_category.controller";
import FaqController from "./controllers/faq.controller";
import AdminController from "./controllers/admin.controller";
import EvaluatorController from "./controllers/evulator.controller";
import ChallengeController from "./controllers/challenges.controller";
import DashboardController from "./controllers/dashboard.controller";
import TranslationController from "./controllers/translation.controller";
import ReportController from "./controllers/report.controller";
//import ChallengeResponsesController from "./controllers/challenge_response.controller";
import EvaluatorRatingController from "./controllers/evaluator_rating.controller";
import InstructionController from "./controllers/instructions.controller";
import EvaluationProcess from "./controllers/evaluation_process.controller";
import ResourceController from "./controllers/resource.controller";
import LatestNewsController from "./controllers/latest_news.controller";
import popupController from "./controllers/popup.controller";
import ideasController from "./controllers/ideas.controller";
import themes_problemsController from "./controllers/themes_problems.controller";

// validating env variables
validateEnv();

try {
    // initializing app
    const app = new App([
        new TeamController,
        new FaqCategoryController,
        new FaqController,
        new AdminController,
        new EvaluatorController,
        new ChallengeController,
        //new ChallengeResponsesController,
        new DashboardController,
        new TranslationController,
        new ReportController,
        new EvaluatorRatingController,
        new InstructionController,
        new EvaluationProcess,
        new ResourceController,
        new LatestNewsController,
        new popupController,
        new ideasController,
        new themes_problemsController
    ], Number(process.env.APP_PORT));
    // starting app
    app.listen();
} catch (error) {
    console.log(error);
}