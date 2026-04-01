import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class RegionAlias extends Model {
  declare id: number;
  declare region_id: number;
  declare alias: string;
  declare normalized_alias: string;
  declare alias_type: string;
}

RegionAlias.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    region_id: { type: DataTypes.INTEGER, allowNull: false },
    alias: { type: DataTypes.STRING(255), allowNull: false },
    normalized_alias: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    alias_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "manual" }
  },
  {
    sequelize,
    tableName: "region_aliases",
    modelName: "RegionAlias"
  }
);
