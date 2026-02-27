import multer from "multer";

// Memory storage for small XLSX uploads
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Only accept .xlsx files (graduates import)
    const name = (file.originalname || "").toLowerCase();
    const okExt = name.endsWith(".xlsx");

    // Common xlsx MIME types (browsers/clients may vary)
    const okMime =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/octet-stream";

    if (!okExt || !okMime) {
      return cb(new Error("Only .xlsx files are allowed"));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});
