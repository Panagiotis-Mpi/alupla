import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { pingPresence } from "../controllers/presence.controller";

export const presenceRouter = Router();

// POST /presence/ping
presenceRouter.post("/ping", authRequired, pingPresence);
