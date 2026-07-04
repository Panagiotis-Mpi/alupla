// Στήνει το Express app: ασφάλεια, CORS, JSON body, routes και error handling.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { studyProgramsRouter } from "./routes/studyPrograms.routes";
import { graduatesRouter } from "./routes/graduates.routes";
import { regionsRouter } from "./routes/regions.routes";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { activityLogsRouter } from "./routes/activityLogs.routes";
import { presenceRouter } from "./routes/presence.routes";
import mapRouter from "./routes/map.routes";
import { publicRouter } from "./routes/public.routes";
import { dashboardRouter } from "./routes/dashboard.routes";

// Συγκεντρώνει όλα τα frontend URLs που επιτρέπεται να κάνουν requests στο backend.
function collectAllowedOrigins() {
  const values = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.ALLOWED_ORIGINS,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://alupla.vercel.app"
  ];

  // Καθαρίζει τη λίστα: χωρίζει comma-separated τιμές, αφαιρεί κενά και διπλότυπα.
  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value || "").split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

// Ρυθμίζει το Express app (middleware, routes, error handler)
export function createApp() {
  // Δημιουργεί το βασικό Express app.
  const app = express();
  app.set("trust proxy", 1);
  const allowedOrigins = collectAllowedOrigins();

  // Προσθέτει βασικά security headers.
  app.use(helmet());

  // Ρυθμίζει ποια frontend origins επιτρέπεται να επικοινωνούν με το backend.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );

  // Επιτρέπει στο backend να διαβάζει JSON bodies από requests.
  app.use(express.json({ limit: "2mb" }));

  // Εκτυπώνει σύντομα logs για κάθε HTTP request στο terminal.
  app.use(morgan("dev"));

  // Απλό endpoint ελέγχου ότι ο server λειτουργεί.
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Συνδέει τα βασικά route groups του backend.
  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/activity-logs", activityLogsRouter);
  app.use("/presence", presenceRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/map", mapRouter);

  // Public routes που μπορούν να χρησιμοποιηθούν χωρίς πλήρες admin flow.
  app.use("/public", publicRouter);

  // Routes για προγράμματα σπουδών.
  app.use("/study-programs", studyProgramsRouter);

  // Routes για αποφοίτους και γεωγραφικές περιοχές.
  app.use("/graduates", graduatesRouter);
  app.use("/regions", regionsRouter);

  // Κεντρικός error handler, μπαίνει τελευταίος για να πιάνει σφάλματα από τα προηγούμενα routes.
  app.use(errorHandler);

  return app;
}
