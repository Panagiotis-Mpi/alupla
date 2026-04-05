import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/sequelize";

export class UnresolvedRegion extends Model {
  declare id: number;
  declare raw_name: string;
  declare normalized_raw_name: string;
  declare country_region_id: number | null;
  declare periphery_id: number | null;
  declare count: number;
  declare status: string;
  declare canonical_region_id: number | null;
  declare resolved_by_user_id: number | null;
}

UnresolvedRegion.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    raw_name: { type: DataTypes.STRING(255), allowNull: false },
    normalized_raw_name: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
    country_region_id: { type: DataTypes.INTEGER, allowNull: true },
    periphery_id: { type: DataTypes.INTEGER, allowNull: true },
    count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
    canonical_region_id: { type: DataTypes.INTEGER, allowNull: true },
    resolved_by_user_id: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    sequelize,
    tableName: "unresolved_regions",
    modelName: "UnresolvedRegion"
  }
);
