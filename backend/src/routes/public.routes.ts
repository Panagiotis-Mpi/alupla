// Ορίζει δημόσια routes που δουλεύουν χωρίς login.
import express from "express";
import {
  publicAnonymousGraduatesCsv,
  publicExportActivity,
  publicMap,
  publicStats,
  publicStudyPrograms,
} from "../controllers/public.controller";

// Δημιουργεί router που ομαδοποιεί τα σχετικά endpoints.
const publicRouter = express.Router();

// Δημόσια λίστα προγραμμάτων για φίλτρα.
publicRouter.get("/study-programs", publicStudyPrograms);
// Δημόσια ανώνυμα στατιστικά.
publicRouter.get("/stats", publicStats);
// Δημόσια ανώνυμα δεδομένα χάρτη.
publicRouter.get("/map", publicMap);
publicRouter.get("/anonymous-graduates.xls", publicAnonymousGraduatesCsv);
publicRouter.post("/activity-export", publicExportActivity);

export { publicRouter };
