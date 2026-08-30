import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type RegionType = "COUNTRY" | "PERIPHERY" | "NOMOS" | "CITY";

export class Region extends Model {
  declare id: number;
  declare name: string;
  declare name_el: string;
  declare name_en: string;
  declare code: string | null;
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
    code: { type: DataTypes.STRING(2), allowNull: true },
    type: { type: DataTypes.ENUM("COUNTRY", "PERIPHERY", "NOMOS", "CITY"), allowNull: false },
    parent_id: { type: DataTypes.INTEGER, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true }
  },
  {
    sequelize,
    tableName: "regions",
    modelName: "Region",
    validate: {
      coordinatesRequiredForCityAndCountry() {
        const region = this as unknown as Region;
        if (
          (region.type === "CITY" || region.type === "COUNTRY") &&
          (region.latitude == null || region.longitude == null)
        ) {
          throw new Error("latitude and longitude are required for CITY and COUNTRY regions");
        }
      }
    }
  }
);
