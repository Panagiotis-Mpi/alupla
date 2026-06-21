import { Router } from "express";
import {
  createGraduate,
  deleteGraduate,
  deleteGraduates,
  getGraduate,
  listGraduates,
  updateGraduate,
  exportGraduates,
  exportGraduatesImportTemplate,
  logGraduatesPdfExport,
  importGraduates,
} from "../controllers/graduates.controller";
import { allowRoles, authRequired } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { routeCache } from "../utils/routeCache";

// Router για όλα τα endpoints αποφοίτων
export const graduatesRouter = Router();

// Απαιτεί login και συγκεκριμένους ρόλους
graduatesRouter.use(authRequired, allowRoles(["secretariat", "super_admin"]));

// Επιστρέφει λίστα αποφοίτων, με σύντομο cache για καλύτερη απόδοση στον πίνακα.
graduatesRouter.get("/", routeCache("graduates", 2 * 60 * 1000), listGraduates);

// Δημιουργεί νέο απόφοιτο από τα στοιχεία που στέλνει η φόρμα.
graduatesRouter.post("/", createGraduate);

// Εξαγωγές και template εισαγωγής αποφοίτων.
graduatesRouter.get("/export", exportGraduates);
graduatesRouter.post("/export", exportGraduates);
graduatesRouter.get("/import-template", exportGraduatesImportTemplate);
graduatesRouter.post("/export-pdf-log", logGraduatesPdfExport);

// Μαζική εισαγωγή αποφοίτων από αρχείο που ανεβαίνει με πεδίο ονόματος "file".
graduatesRouter.post("/import", upload.single("file"), importGraduates);
graduatesRouter.delete("/bulk", deleteGraduates);

// Ενέργειες πάνω σε συγκεκριμένο απόφοιτο, με βάση το id του URL.
graduatesRouter.get("/:id", getGraduate);
graduatesRouter.put("/:id", updateGraduate);
graduatesRouter.delete("/:id", deleteGraduate);
