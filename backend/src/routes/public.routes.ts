import express from "express";
import { publicStudyPrograms } from "../controllers/public.controller";

const router = express.Router();

router.get("/study-programs", publicStudyPrograms);

export default router;
