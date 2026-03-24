import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),

  db: {
    url: process.env.DATABASE_URL,

    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DATABASE_URL ? "" : required("DB_NAME"),
    user: process.env.DATABASE_URL ? "" : required("DB_USER"),
    pass: process.env.DB_PASS ?? "",

    ssl: (process.env.DB_SSL ?? "").toLowerCase() === "true"
  },

  jwtSecret: required("JWT_SECRET")
};
