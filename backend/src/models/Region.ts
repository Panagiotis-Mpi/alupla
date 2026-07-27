import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type RegionType = "COUNTRY" | "PERIPHERY" | "NOMOS" | "CITY";

export class Region extends Model {
  declare id: number;
  declare name: string;
  declare name_el: string;
  declare name_en: string;
  declare type: RegionType;
  declare parent_id: number | null;
  declare latitude: number | null;
  declare longitude: number | null;
}

Region.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue("name_el");
      }
    },
    name_el: { type: DataTypes.STRING(255), allowNull: false },
    name_en: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    type: { type: DataTypes.ENUM("COUNTRY", "PERIPHERY", "NOMOS", "CITY"), allowNull: false },
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
