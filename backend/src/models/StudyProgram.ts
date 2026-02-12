import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class StudyProgram extends Model {
  declare id: number;
  declare code: string;
  declare name_el: string;
  declare name_en: string | null;
  declare is_active: boolean;
}

StudyProgram.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name_el: { type: DataTypes.STRING(255), allowNull: false },
    name_en: { type: DataTypes.STRING(255), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    sequelize,
    tableName: "study_programs",
    modelName: "StudyProgram"
  }
);
