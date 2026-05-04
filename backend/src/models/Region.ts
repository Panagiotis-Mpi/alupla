import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type RegionType = "COUNTRY" | "PERIPHERY" | "CITY" | "FOREIGN_CITY";

// Model περιοχής: χρησιμοποιείται για χώρα, περιφέρεια, πόλη και χάρτη.
export class Region extends Model {
  declare id: number;
  declare name: string;
  declare name_el: string | null;
  declare name_en: string | null;
  declare normalized_name: string;
  declare external_ref_id: string | null;
  declare type: RegionType;
  declare parent_id: number | null;
  declare latitude: number | null;
  declare longitude: number | null;
}

// Ορισμός πεδίων περιοχής και σύνδεση με τον πίνακα regions.
Region.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    name_el: { type: DataTypes.STRING(255), allowNull: true },
    name_en: { type: DataTypes.STRING(255), allowNull: true },
    normalized_name: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    external_ref_id: { type: DataTypes.STRING(255), allowNull: true },
    type: { type: DataTypes.ENUM("COUNTRY", "PERIPHERY", "CITY", "FOREIGN_CITY"), allowNull: false },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true }
  },
  {
    sequelize,
    tableName: "regions",
    modelName: "Region"
  }
);
