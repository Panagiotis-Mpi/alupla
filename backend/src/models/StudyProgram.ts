import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class StudyProgram extends Model {
  declare id: number;
  declare name_el: string;
  declare name_en: string | null;
}

StudyProgram.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name_el: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    name_en: { type: DataTypes.STRING(255), allowNull: true }
  },
  {
    sequelize,
    tableName: "study_programs",
    modelName: "StudyProgram"
  }
);
