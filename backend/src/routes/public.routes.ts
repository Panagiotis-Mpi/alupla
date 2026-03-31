import express from "express";
import { publicStudyPrograms } from "../controllers/public.controller";

const publicRouter = express.Router();

publicRouter.get("/study-programs", publicStudyPrograms);

export { publicRouter };
export default publicRouter;
