import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createStudyProgram, deleteStudyProgram, listStudyPrograms, updateStudyProgram } from "../controllers/studyPrograms.controller";

export const studyProgramsRouter = Router();

studyProgramsRouter.use(authRequired);
studyProgramsRouter.get("/", allowRoles(["secretariat", "super_admin"]), listStudyPrograms);
studyProgramsRouter.post("/", allowRoles(["super_admin"]), createStudyProgram);
studyProgramsRouter.put("/:id", allowRoles(["super_admin"]), updateStudyProgram);
studyProgramsRouter.delete("/:id", allowRoles(["super_admin"]), deleteStudyProgram);
