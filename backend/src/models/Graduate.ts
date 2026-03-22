import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type Gender = "M" | "F";

export class Graduate extends Model {
  declare id: number;
  declare ad_code: string;
  declare last_name: string;
  declare first_name: string;
  declare father_name: string;
  declare degree_grade: number;
  declare graduation_date: string;
  declare oath_date: string;
  declare entry_year: number;
  declare student_number: string;
  declare birth_date: string;
  declare gender: Gender;
  declare study_program_id: number;
  declare program_direction_id: number | null;

  // NEW: hierarchical region id (nullable)
  declare origin_region_id: number | null;
  declare origin_municipality: string | null;
}

Graduate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ad_code: { type: DataTypes.STRING(20), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    father_name: { type: DataTypes.STRING(100), allowNull: false },
    degree_grade: { type: DataTypes.DECIMAL(4, 2), allowNull: false },
    graduation_date: { type: DataTypes.DATEONLY, allowNull: false },
    oath_date: { type: DataTypes.DATEONLY, allowNull: false },
    entry_year: { type: DataTypes.SMALLINT, allowNull: false },
    student_number: { type: DataTypes.STRING(50), allowNull: false },
    // DB column: birth_date (DATE)
    birth_date: { type: DataTypes.DATEONLY, allowNull: false },
    gender: { type: DataTypes.ENUM("M", "F"), allowNull: false },
    study_program_id: { type: DataTypes.INTEGER, allowNull: false },
    program_direction_id: { type: DataTypes.INTEGER, allowNull: true },

    origin_region_id: { type: DataTypes.INTEGER, allowNull: true },

    origin_municipality: { type: DataTypes.STRING(150), allowNull: true }
  },
  {
    sequelize,
    tableName: "graduates",
    modelName: "Graduate"
  }
);
