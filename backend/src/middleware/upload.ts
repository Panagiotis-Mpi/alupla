import multer from "multer";
import path from "path";

// Επιτρεπόμενοι τύποι αρχείων για import αποφοίτων.
const allowedExtensions = new Set([".xlsx", ".xls", ".csv", ".tsv", ".txt"]);
const allowedMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/octet-stream",
]);

// Ελέγχει extension και mimetype πριν γίνει δεκτό το αρχείο.
function isAllowedSpreadsheetFile(file: Express.Multer.File) {
  const extension = path.extname(String(file.originalname ?? "")).toLowerCase();
  const mimetype = String(file.mimetype ?? "").toLowerCase();
  return allowedExtensions.has(extension) && (!mimetype || allowedMimeTypes.has(mimetype));
}

// Upload στη μνήμη, χωρίς αποθήκευση αρχείου στον δίσκο.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    callback(null, isAllowedSpreadsheetFile(file));
  },
});
