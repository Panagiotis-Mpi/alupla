// Μαζεύει τις βασικές ρυθμίσεις περιβάλλοντος που χρειάζεται το backend.
import dotenv from "dotenv";
dotenv.config();

// Διαβάζει υποχρεωτική μεταβλητή περιβάλλοντος και σταματά αν λείπει.
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

  jwtSecret: required("JWT_SECRET"),
  appUrl: (process.env.APP_URL ?? "http://localhost:5173").replace(/\/$/, ""),
  mail: {
    user: process.env.SMTP_USER ?? process.env.MAIL_USER ?? "",
    pass: process.env.SMTP_PASS ?? process.env.MAIL_PASS ?? "",
    from: process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.MAIL_USER ?? "",
    gmailClientId: process.env.GMAIL_CLIENT_ID ?? "",
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
    gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN ?? "",
    gmailUser: process.env.GMAIL_USER ?? process.env.SMTP_USER ?? process.env.MAIL_USER ?? ""
  }
};
