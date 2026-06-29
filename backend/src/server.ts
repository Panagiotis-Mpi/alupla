import { createApp } from "./app";
import { env } from "./config/env";
import { initDb } from "./models";

async function start() {
  await initDb();
  const app = createApp();
  app.listen(env.port);
}

void start().catch((error) => {
  console.error("[startup] failed:", error);
  process.exitCode = 1;
});
