import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

// Model για τις καταγραφές ενεργειών του συστήματος.
export class ActivityLog extends Model {
  declare id: number;
  declare user_id: number | null;
  declare action: string;
  declare entity_type: string | null;
  declare entity_id: number | null;
  declare details: object | null;
}

// Αντιστοίχιση του model με τον πίνακα activity_logs.
ActivityLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity_type: { type: DataTypes.STRING(50), allowNull: true },
    entity_id: { type: DataTypes.INTEGER, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true }
  },
  {
    sequelize,
    tableName: "activity_logs",
    modelName: "ActivityLog",
    updatedAt: false
  }
);
