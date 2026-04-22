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
import { ensureCountriesSeeded } from "../seed/countries";
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

  Region.hasMany(Graduate, { foreignKey: "origin_country_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_country_region_id", as: "originCountry" });
  Region.hasMany(Graduate, { foreignKey: "origin_periphery_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_periphery_region_id", as: "originPeriphery" });
  Region.hasMany(Graduate, { foreignKey: "origin_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_region_id", as: "originRegion" });
  Region.hasMany(Graduate, { foreignKey: "origin_city_region_id" });
  Graduate.belongsTo(Region, { foreignKey: "origin_city_region_id", as: "originCity" });

  Region.hasMany(RegionAlias, { foreignKey: "region_id", as: "aliases" });
  RegionAlias.belongsTo(Region, { foreignKey: "region_id", as: "region" });

  Region.hasMany(UnresolvedRegion, { foreignKey: "country_region_id", as: "countryUnresolvedEntries" });
  UnresolvedRegion.belongsTo(Region, { foreignKey: "country_region_id", as: "country" });
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

async function ensureRegionTypeEnum() {
  const values = ["COUNTRY", "PERIPHERY", "CITY", "FOREIGN_CITY"];
  for (const value of values) {
    await sequelize.query(`ALTER TYPE public.enum_regions_type ADD VALUE IF NOT EXISTS '${value}'`);
  }
}

async function ensureSchema() {
  const qi = sequelize.getQueryInterface();

  await ensureColumn("regions", "normalized_name", { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" });
  await ensureColumn("regions", "external_ref_id", { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn("graduates", "origin_country_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("graduates", "origin_periphery_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("graduates", "origin_city_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("unresolved_regions", "country_region_id", { type: DataTypes.INTEGER, allowNull: true });

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
      country_region_id: { type: DataTypes.INTEGER, allowNull: true },
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
  await ensureIndex("regions", ["normalized_name", "parent_id", "type"], "regions_city_scope_idx", { unique: true, where: { type: ["CITY", "FOREIGN_CITY"] } as any });
  await ensureIndex("region_aliases", ["normalized_alias", "region_id"], "region_aliases_normalized_alias_region_id_idx", { unique: true });
  await ensureIndex("unresolved_regions", ["normalized_raw_name", "country_region_id", "periphery_id"], "unresolved_regions_key_idx", { unique: true });
}

async function seedRegions() {
  try {
    await ensureCountriesSeeded();
    await ensurePeripheriesSeeded();
    await ensureRegionCitiesSeeded();
  } catch (error) {
    console.warn("[db] region seed skipped:", (error as any)?.message ?? error);
  }
}

async function backfillRegions() {
  const rows = await Region.findAll({ attributes: ["id", "name", "normalized_name", "type", "parent_id"] });
  const byId = new Map(rows.map((item: any) => [Number(item.id), item]));
  const greece = rows.find((item: any) => String(item.type) === "COUNTRY" && normalizeRegionText(item.name) === normalizeRegionText("Ελλάδα")) as any;

  for (const row of rows as any[]) {
    const normalized = normalizeRegionText(row.name);
    const payload: Record<string, unknown> = {};
    if (normalized && normalized !== String(row.normalized_name || "")) payload.normalized_name = normalized;
    if (row.type === "NOMOS" || row.type === "DIMOS") payload.type = "CITY";
    if (row.type === "PERIPHERY" && greece && row.parent_id == null) payload.parent_id = Number(greece.id);
    if (Object.keys(payload).length) await row.update(payload, { silent: true });
  }

  const aliases = await RegionAlias.findAll({ attributes: ["id", "alias", "normalized_alias"] });
  for (const row of aliases as any[]) {
    const normalized = normalizeRegionText(row.alias);
    if (normalized && normalized !== String(row.normalized_alias || "")) {
      await row.update({ normalized_alias: normalized }, { silent: true });
    }
  }

  for (const row of rows as any[]) {
    if (String(row.type) !== "CITY" || !row.parent_id) continue;
    const parent = byId.get(Number(row.parent_id));
    if (parent && String(parent.type) === "COUNTRY") {
      await row.update({ type: "FOREIGN_CITY" }, { silent: true });
    }
  }
}

async function backfillGraduateOrigins() {
  const rows = await Graduate.findAll({
    attributes: [
      "id",
      "origin_country_region_id",
      "origin_periphery_region_id",
      "origin_region_id",
      "origin_city_region_id",
      "origin_municipality"
    ]
  });

  for (const row of rows as any[]) {
    const normalized = await normalizeOriginLocation({
      origin_country_region_id: row.origin_country_region_id != null ? Number(row.origin_country_region_id) : null,
      origin_periphery_region_id: row.origin_periphery_region_id != null ? Number(row.origin_periphery_region_id) : null,
      origin_region_id: row.origin_region_id != null ? Number(row.origin_region_id) : null,
      origin_city_region_id: row.origin_city_region_id != null ? Number(row.origin_city_region_id) : null,
      origin_municipality: row.origin_municipality ?? null,
    });

    const changed =
      Number(row.origin_country_region_id || 0) !== Number(normalized.origin_country_region_id || 0) ||
      Number(row.origin_periphery_region_id || 0) !== Number(normalized.origin_periphery_region_id || 0) ||
      Number(row.origin_region_id || 0) !== Number(normalized.origin_region_id || 0) ||
      Number(row.origin_city_region_id || 0) !== Number(normalized.origin_city_region_id || 0) ||
      String(row.origin_municipality || "") !== String(normalized.origin_municipality || "");

    if (changed) await row.update(normalized, { silent: true });
  }
}

async function backfillUnresolvedRegions() {
  const rows = await UnresolvedRegion.findAll({ attributes: ["id", "country_region_id", "periphery_id", "canonical_region_id"] });
  const regions = await Region.findAll({ attributes: ["id", "type", "parent_id", "normalized_name"] });
  const byId = new Map(regions.map((item: any) => [Number(item.id), item]));
  const greece = regions.find((item: any) => String(item.type) === "COUNTRY" && String(item.normalized_name) === normalizeRegionText("Ελλάδα")) as any;

  function findCountry(regionId: number | null | undefined): number | null {
    let current = regionId ? byId.get(Number(regionId)) ?? null : null;
    let steps = 0;
    while (current && steps < 20) {
      if (String(current.type) === "COUNTRY") return Number(current.id);
      current = current.parent_id ? byId.get(Number(current.parent_id)) ?? null : null;
      steps += 1;
    }
    return null;
  }

  for (const row of rows as any[]) {
    if (row.country_region_id != null) continue;
    const countryId = findCountry(row.periphery_id) ?? findCountry(row.canonical_region_id) ?? (greece ? Number(greece.id) : null);
    if (countryId != null) {
      await row.update({ country_region_id: countryId }, { silent: true });
    }
  }
}

export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureRegionTypeEnum();
  await ensureSchema();
  await seedRegions();
  await backfillRegions();
  await ensureAppIndexes();
  await backfillGraduateOrigins();
  await backfillUnresolvedRegions();
}
