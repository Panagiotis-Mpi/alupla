import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { pingPresence } from "../controllers/presence.controller";

export const presenceRouter = Router();

presenceRouter.post("/ping", authRequired, pingPresence);
