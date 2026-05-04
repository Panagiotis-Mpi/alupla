import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

// Model για εναλλακτικά ονόματα περιοχών που βοηθούν στο matching.
export class RegionAlias extends Model {
  declare id: number;
  declare region_id: number;
  declare alias: string;
  declare normalized_alias: string;
  declare alias_type: string;
}

// Αντιστοίχιση του model με τον πίνακα region_aliases.
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
