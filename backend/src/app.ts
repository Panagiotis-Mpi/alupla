import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import { initDb } from "./models";
import { studyProgramsRouter } from "./routes/studyPrograms.routes";
import { graduatesRouter } from "./routes/graduates.routes";
import { regionsRouter } from "./routes/regions.routes";
import { programDirectionsRouter } from "./routes/programDirections.routes";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { activityLogsRouter } from "./routes/activityLogs.routes";
import { presenceRouter } from "./routes/presence.routes";
import mapRouter from "./routes/map.routes";
import { publicRouter } from "./routes/public.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        origin === "http://localhost:5173" ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  initDb()
    .then(() => console.log("[db] connected"))
    .catch((e) => console.error("[db] connection failed:", e));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/activity-logs", activityLogsRouter);
  app.use("/presence", presenceRouter);
  app.use("/map", mapRouter);

  // Public (no-auth) endpoints for anonymous statistics/map + anonymous CSV export
  app.use("/public", publicRouter);

  app.use("/study-programs", studyProgramsRouter);
  app.use("/program-directions", programDirectionsRouter);

  app.use("/graduates", graduatesRouter);
  app.use("/regions", regionsRouter);

  app.use(errorHandler);

  return app;
}
