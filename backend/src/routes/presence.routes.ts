// Ορίζει το route που ενημερώνει παρουσία/last seen χρήστη.
import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { pingPresence } from "../controllers/presence.controller";
import { asyncHandler } from "../utils/asyncHandler";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
export const presenceRouter = Router();

// Ping από frontend για να ενημερώνεται το online status.
presenceRouter.post("/ping", authRequired, asyncHandler(pingPresence));
