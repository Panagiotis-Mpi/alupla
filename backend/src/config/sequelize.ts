// Φτιάχνει τη σύνδεση Sequelize με τη PostgreSQL βάση.
import { Sequelize } from "sequelize";
import { env } from "./env";

const databaseUrl = env.db.url ? new URL(env.db.url) : null;
// Στο production/Neon η σύνδεση PostgreSQL χρειάζεται συνήθως SSL.
const useSsl = env.db.ssl || Boolean(databaseUrl?.searchParams.get("sslmode"));

if (databaseUrl) {
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("channel_binding");
}

const commonOptions = {
  dialect: "postgres" as const,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  },
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : undefined
};

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl.toString(), commonOptions)
  : new Sequelize(env.db.name, env.db.user, env.db.pass, {
      ...commonOptions,
      host: env.db.host,
      port: env.db.port
    });
