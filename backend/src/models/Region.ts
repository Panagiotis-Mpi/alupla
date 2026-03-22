import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export type RegionType = "PERIPHERY" | "NOMOS" | "DIMOS" | "CITY";

export class Region extends Model {
  declare id: number;
  declare name: string;
  declare type: RegionType;
  declare parent_id: number | null;
  declare latitude: number | null;
  declare longitude: number | null;
}

Region.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM("PERIPHERY", "NOMOS", "DIMOS", "CITY"), allowNull: false },
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
