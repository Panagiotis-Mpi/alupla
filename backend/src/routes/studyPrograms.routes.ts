// Ορίζει routes για προγράμματα σπουδών, κατευθύνσεις και imports.
import { Router } from "express";
import { allowRoles, authRequired } from "../middleware/auth";
import { createStudyProgram, deleteStudyProgram, downloadStudyProgramsTemplate, importStudyPrograms, listStudyPrograms, updateStudyProgram } from "../controllers/studyPrograms.controller";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const studyProgramsRouter = Router();

// Όλα τα routes εδώ θέλουν login γραμματείας ή super admin.
studyProgramsRouter.use(authRequired);
// Λίστα προγραμμάτων/κατευθύνσεων.
studyProgramsRouter.get("/", allowRoles(["secretariat", "super_admin"]), asyncHandler(listStudyPrograms));
studyProgramsRouter.get("/import-template", allowRoles(["secretariat", "super_admin"]), asyncHandler(downloadStudyProgramsTemplate));
// Ανεβάζει αρχείο import προγραμμάτων.
studyProgramsRouter.post("/import", allowRoles(["secretariat", "super_admin"]), upload.single("file"), asyncHandler(importStudyPrograms));
// Δημιουργία προγράμματος σπουδών.
studyProgramsRouter.post("/", allowRoles(["super_admin"]), asyncHandler(createStudyProgram));
studyProgramsRouter.put("/:id", allowRoles(["super_admin"]), asyncHandler(updateStudyProgram));
studyProgramsRouter.delete("/:id", allowRoles(["super_admin"]), asyncHandler(deleteStudyProgram));
