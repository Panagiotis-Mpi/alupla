import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type UserRole = "super_admin" | "secretariat";

export class User extends Model {
  declare id: number;
  declare first_name: string;
  declare last_name: string;
  declare email: string;
  declare password_hash: string;
  declare role: UserRole;
  declare is_active: boolean;
  declare email_verified: boolean;
  declare admin_approved: boolean;
  declare email_verification_token: string | null;
  declare email_verification_expires: Date | null;
  declare password_reset_token: string | null;
  declare password_reset_expires: Date | null;
  declare last_seen_at: Date | null;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM("super_admin", "secretariat"), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    admin_approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    email_verification_token: { type: DataTypes.CHAR(64), allowNull: true },
    email_verification_expires: { type: DataTypes.DATE, allowNull: true },
    password_reset_token: { type: DataTypes.CHAR(64), allowNull: true },
    password_reset_expires: { type: DataTypes.DATE, allowNull: true },
    last_seen_at: { type: DataTypes.DATE, allowNull: true }
  },
  {
    sequelize,
    tableName: "users",
    modelName: "User"
  }
);
