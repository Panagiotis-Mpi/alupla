import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class ProgramDirection extends Model {
  declare id: number;
  declare study_program_id: number;
  declare code: string;
  declare name_el: string;
  declare name_en: string | null;
  declare is_active: boolean;
}

ProgramDirection.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    study_program_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    name_el: { type: DataTypes.STRING(255), allowNull: false },
    name_en: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize,
    tableName: "program_directions",
    modelName: "ProgramDirection",
    timestamps: false,
    indexes: [{ unique: true, fields: ["study_program_id", "code"] }]
  }
);
