import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./User";
import { StudyProgram } from "./StudyProgram";
import { ProgramDirection } from "./ProgramDirection";
import { Graduate } from "./Graduate";
import { ActivityLog } from "./ActivityLog";
import { Region } from "./Region";
import { RegionAlias } from "./RegionAlias";
import { UnresolvedRegion } from "./UnresolvedRegion";
import { ensurePeripheriesSeeded } from "../seed/peripheries";
import { ensureRegionCitiesSeeded } from "../seed/regionCities";
import { normalizeRegionText } from "../utils/regionText";
import { normalizeOriginLocation } from "../utils/resolvePeripheryRegionId";

function setupAssociations() {
  StudyProgram.hasMany(ProgramDirection, { foreignKey: "study_program_id" });
  ProgramDirection.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

  StudyProgram.hasMany(Graduate, { foreignKey: "study_program_id" });
  Graduate.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

  ProgramDirection.hasMany(Graduate, { foreignKey: "program_direction_id" });
  Graduate.belongsTo(ProgramDirection, { foreignKey: "program_direction_id" });

  Region.hasMany(Region, { as: "children", foreignKey: "parent_id" });
  Region.belongsTo(Region, { as: "parent", foreignKey: "parent_id" });

  Region.hasMany(Graduate, { foreignKey: "origin_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_region_id", as: "originPeriphery" });
  Region.hasMany(Graduate, { foreignKey: "origin_city_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_city_region_id", as: "originCity" });

  Region.hasMany(RegionAlias, { foreignKey: "region_id", as: "aliases" });
  RegionAlias.belongsTo(Region, { foreignKey: "region_id", as: "region" });

  Region.hasMany(UnresolvedRegion, { foreignKey: "periphery_id", as: "unresolvedEntries" });
  UnresolvedRegion.belongsTo(Region, { foreignKey: "periphery_id", as: "periphery" });
  Region.hasMany(UnresolvedRegion, { foreignKey: "canonical_region_id", as: "resolvedEntries" });
  UnresolvedRegion.belongsTo(Region, { foreignKey: "canonical_region_id", as: "canonicalRegion" });

  User.hasMany(ActivityLog, { foreignKey: "user_id" });
  ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
}

setupAssociations();

async function ensureColumn(table: string, column: string, definition: any) {
  const qi = sequelize.getQueryInterface();
  const tableInfo = await qi.describeTable(table);
  if (!tableInfo[column]) {
    await qi.addColumn(table, column, definition);
  }
}

async function ensureIndex(table: string, fields: string[], name: string, options: Record<string, unknown> = {}) {
  const qi = sequelize.getQueryInterface();
  const rawIndexes = await qi.showIndex(table);
  const indexes = Array.isArray(rawIndexes) ? rawIndexes : [];
  if (!indexes.some((item: any) => item.name === name)) {
    await qi.addIndex(table, fields, { name, ...options });
  }
}

async function ensureSchema() {
  const qi = sequelize.getQueryInterface();

  await ensureColumn("regions", "normalized_name", { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" });
  await ensureColumn("regions", "external_ref_id", { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn("graduates", "origin_city_region_id", { type: DataTypes.INTEGER, allowNull: true });

  const tables = await qi.showAllTables();
  const tableNames = tables.map((item: any) => (typeof item === "string" ? item : item.tableName || item.toString()));

  if (!tableNames.includes("region_aliases")) {
    await qi.createTable("region_aliases", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      region_id: { type: DataTypes.INTEGER, allowNull: false },
      alias: { type: DataTypes.STRING(255), allowNull: false },
      normalized_alias: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
      alias_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "manual" },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") },
    });
  }

  if (!tableNames.includes("unresolved_regions")) {
    await qi.createTable("unresolved_regions", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      raw_name: { type: DataTypes.STRING(255), allowNull: false },
      normalized_raw_name: { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" },
      periphery_id: { type: DataTypes.INTEGER, allowNull: true },
      count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
      canonical_region_id: { type: DataTypes.INTEGER, allowNull: true },
      resolved_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal("CURRENT_TIMESTAMP") },
    });
  }
}

async function ensureAppIndexes() {
  await ensureIndex("regions", ["type", "normalized_name"], "regions_type_normalized_name_idx");
  await ensureIndex("regions", ["normalized_name", "parent_id", "type"], "regions_city_scope_idx", { unique: true, where: { type: "CITY" } as any });
  await ensureIndex("region_aliases", ["normalized_alias", "region_id"], "region_aliases_normalized_alias_region_id_idx", { unique: true });
  await ensureIndex("unresolved_regions", ["normalized_raw_name", "periphery_id"], "unresolved_regions_key_idx", { unique: true });
}

async function seedRegions() {
  try {
    await ensurePeripheriesSeeded();
    await ensureRegionCitiesSeeded();
  } catch (error) {
    console.warn("[db] periphery seed skipped:", (error as any)?.message ?? error);
  }
}

async function backfillRegions() {
  const rows = await Region.findAll({ attributes: ["id", "name", "normalized_name"] });
  for (const row of rows as any[]) {
    const normalized = normalizeRegionText(row.name);
    if (normalized && normalized !== String(row.normalized_name || "")) {
      await row.update({ normalized_name: normalized }, { silent: true });
    }
  }

  const aliases = await RegionAlias.findAll({ attributes: ["id", "alias", "normalized_alias"] });
  for (const row of aliases as any[]) {
    const normalized = normalizeRegionText(row.alias);
    if (normalized && normalized !== String(row.normalized_alias || "")) {
      await row.update({ normalized_alias: normalized }, { silent: true });
    }
  }
}

async function dedupeCityRegions() {
  const rows = await Region.findAll({
    where: { type: "CITY" as any },
    attributes: ["id", "name", "normalized_name", "parent_id", "latitude", "longitude", "external_ref_id"],
    order: [["id", "ASC"]],
  });

  type CityRow = {
    id: number;
    name: string;
    normalized_name: string;
    parent_id: number | null;
    latitude: number | null;
    longitude: number | null;
    external_ref_id: string | null;
  };

  const groups = new Map<string, CityRow[]>();

  for (const row of rows as any[]) {
    const normalizedName = normalizeRegionText(row.normalized_name || row.name);
    const parentId = row.parent_id != null ? Number(row.parent_id) : null;

    if (!normalizedName) continue;

    if (String(row.normalized_name || "") !== normalizedName) {
      await row.update({ normalized_name: normalizedName }, { silent: true });
    }

    const item: CityRow = {
      id: Number(row.id),
      name: String(row.name || ""),
      normalized_name: normalizedName,
      parent_id: parentId,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      external_ref_id: row.external_ref_id != null ? String(row.external_ref_id) : null,
    };

    const key = `${parentId ?? "root"}::${normalizedName}`;
    const current = groups.get(key);
    if (current) current.push(item);
    else groups.set(key, [item]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const keeper = [...group].sort((left, right) => {
      const leftScore = (left.latitude != null && left.longitude != null ? 2 : 0) + (left.external_ref_id ? 1 : 0);
      const rightScore = (right.latitude != null && right.longitude != null ? 2 : 0) + (right.external_ref_id ? 1 : 0);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.id - right.id;
    })[0]!;

    const duplicates = group.filter((item) => item.id !== keeper.id);
    if (!duplicates.length) continue;

    const keeperPayload: Record<string, unknown> = {};
    if ((!keeper.latitude && keeper.latitude !== 0) || (!keeper.longitude && keeper.longitude !== 0)) {
      const withCoords = duplicates.find((item) => item.latitude != null && item.longitude != null);
      if (withCoords) {
        keeperPayload.latitude = withCoords.latitude;
        keeperPayload.longitude = withCoords.longitude;
      }
    }
    if (!keeper.external_ref_id) {
      const withExternal = duplicates.find((item) => item.external_ref_id);
      if (withExternal) keeperPayload.external_ref_id = withExternal.external_ref_id;
    }
    if (Object.keys(keeperPayload).length) {
      await Region.update(keeperPayload, { where: { id: keeper.id } });
    }

    const duplicateIds = duplicates.map((item) => item.id);
    await Graduate.update({ origin_city_region_id: keeper.id }, { where: { origin_city_region_id: duplicateIds as any } });
    await UnresolvedRegion.update({ canonical_region_id: keeper.id }, { where: { canonical_region_id: duplicateIds as any } });

    const aliasRows = await RegionAlias.findAll({ where: { region_id: duplicateIds as any } });
    const keeperAliases = new Set(
      (await RegionAlias.findAll({ where: { region_id: keeper.id }, attributes: ["normalized_alias"] }) as any[])
        .map((row) => String(row.normalized_alias || ""))
        .filter(Boolean)
    );

    for (const alias of aliasRows as any[]) {
      const normalizedAlias = String(alias.normalized_alias || normalizeRegionText(alias.alias));
      if (!normalizedAlias || keeperAliases.has(normalizedAlias)) {
        await alias.destroy();
        continue;
      }
      await alias.update({ region_id: keeper.id, normalized_alias: normalizedAlias }, { silent: true });
      keeperAliases.add(normalizedAlias);
    }

    await Region.destroy({ where: { id: duplicateIds as any } });
  }
}

async function backfillGraduateOrigins() {
  const rows = await Graduate.findAll({ attributes: ["id", "origin_region_id", "origin_city_region_id", "origin_municipality"] });
  for (const row of rows as any[]) {
    const normalized = await normalizeOriginLocation({
      origin_region_id: row.origin_region_id != null ? Number(row.origin_region_id) : null,
      origin_city_region_id: row.origin_city_region_id != null ? Number(row.origin_city_region_id) : null,
      origin_municipality: row.origin_municipality ?? null,
    });

    const nextPayload = {
      origin_region_id: normalized.origin_region_id,
      origin_city_region_id: normalized.origin_city_region_id,
      origin_municipality: normalized.origin_municipality,
    };

    if (
      Number(row.origin_region_id || 0) !== Number(nextPayload.origin_region_id || 0) ||
      Number(row.origin_city_region_id || 0) !== Number(nextPayload.origin_city_region_id || 0) ||
      String(row.origin_municipality || "") !== String(nextPayload.origin_municipality || "")
    ) {
      await row.update(nextPayload, { silent: true });
    }
  }
}

export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureSchema();
  await seedRegions();
  await backfillRegions();
  await dedupeCityRegions();
  await ensureAppIndexes();
  await backfillGraduateOrigins();
}
