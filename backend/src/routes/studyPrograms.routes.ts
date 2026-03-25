import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createStudyProgram, deleteStudyProgram, downloadStudyProgramsTemplate, importStudyPrograms, listStudyPrograms, updateStudyProgram } from "../controllers/studyPrograms.controller";
import { upload } from "../middleware/upload";

export const studyProgramsRouter = Router();

studyProgramsRouter.use(authRequired);
studyProgramsRouter.get("/", allowRoles(["secretariat", "super_admin"]), listStudyPrograms);
studyProgramsRouter.get("/import-template", allowRoles(["secretariat", "super_admin"]), downloadStudyProgramsTemplate);
studyProgramsRouter.post("/import", allowRoles(["secretariat", "super_admin"]), upload.single("file"), importStudyPrograms);
studyProgramsRouter.post("/", allowRoles(["super_admin"]), createStudyProgram);
studyProgramsRouter.put("/:id", allowRoles(["super_admin"]), updateStudyProgram);
studyProgramsRouter.delete("/:id", allowRoles(["super_admin"]), deleteStudyProgram);
