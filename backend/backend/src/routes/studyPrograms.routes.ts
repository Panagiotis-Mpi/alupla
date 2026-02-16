import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { listStudyPrograms } from "../controllers/studyPrograms.controller";

export const studyProgramsRouter = Router();

studyProgramsRouter.use(authRequired, allowRoles(["secretariat","super_admin"]));

studyProgramsRouter.get("/", listStudyPrograms);
