import { Sequelize } from "sequelize";
import { env } from "./env";

export const sequelize = env.db.url
  ? new Sequelize(env.db.url, {
      dialect: "postgres",
      logging: false,
      dialectOptions: env.db.ssl
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false
            }
          }
        : undefined,
      define: {
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    })
  : new Sequelize(env.db.name, env.db.user, env.db.pass, {
      host: env.db.host,
      port: env.db.port,
      dialect: "postgres",
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    });
