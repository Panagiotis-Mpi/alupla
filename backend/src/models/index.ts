import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize";
import { User } from "./User";
import { StudyProgram } from "./StudyProgram";
import { Graduate } from "./Graduate";
import { ActivityLog } from "./ActivityLog";
import { Region } from "./Region";
import { ensureCountriesSeeded } from "../seed/countries";
import { ensurePeripheriesSeeded } from "../seed/peripheries";
import { ensureRegionCitiesSeeded } from "../seed/regionCities";
import { normalizeRegionText } from "../utils/regionText";
import { normalizeOriginLocation } from "../services/regionResolver.service";

// Ορίζει τις σχέσεις ανάμεσα στα models.
function setupAssociations() {
  StudyProgram.hasMany(Graduate, { foreignKey: "study_program_id" });
  Graduate.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

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

  User.hasMany(ActivityLog, { foreignKey: "user_id" });
  ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
}

setupAssociations();

// Προσθέτει στήλη μόνο αν δεν υπάρχει ήδη.
async function ensureColumn(table: string, column: string, definition: any) {
  const qi = sequelize.getQueryInterface();
  const tableInfo = await qi.describeTable(table);
  if (!tableInfo[column]) {
    await qi.addColumn(table, column, definition);
  }
}

// Προσθέτει index μόνο αν δεν υπάρχει ήδη.
async function ensureIndex(table: string, fields: string[], name: string, options: Record<string, unknown> = {}) {
  const qi = sequelize.getQueryInterface();
  const rawIndexes = await qi.showIndex(table);
  const indexes = Array.isArray(rawIndexes) ? rawIndexes : [];
  if (!indexes.some((item: any) => item.name === name)) {
    await qi.addIndex(table, fields, { name, ...options });
  }
}

async function ensureRegionTypeEnum() {
  const values = ["COUNTRY", "PERIPHERY", "NOMOS", "DIMOS", "CITY", "FOREIGN_CITY"];
  for (const value of values) {
    await sequelize.query(`ALTER TYPE public.enum_regions_type ADD VALUE IF NOT EXISTS '${value}'`);
  }
}

// Κρατά τη βάση συμβατή με την τρέχουσα έκδοση του κώδικα.
async function ensureSchema() {
  await ensureColumn("regions", "normalized_name", { type: DataTypes.STRING(255), allowNull: false, defaultValue: "" });
  await ensureColumn("regions", "name_el", { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn("regions", "name_en", { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn("regions", "external_ref_id", { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn("graduates", "origin_country_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("graduates", "origin_periphery_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("graduates", "origin_city_region_id", { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn("users", "password_reset_token_hash", { type: DataTypes.STRING(128), allowNull: true });
  await ensureColumn("users", "password_reset_expires_at", { type: DataTypes.DATE, allowNull: true });
}

async function ensureAppIndexes() {
  await ensureIndex("regions", ["type", "normalized_name"], "regions_type_normalized_name_idx");
  await ensureIndex("regions", ["normalized_name", "parent_id", "type"], "regions_city_scope_idx", { unique: true, where: { type: ["CITY", "FOREIGN_CITY"] } as any });
}

// Γεμίζει βασικές χώρες/περιφέρειες/πόλεις αν λείπουν.
async function seedRegions() {
  try {
    await ensureCountriesSeeded();
    await ensurePeripheriesSeeded();
    await ensureRegionCitiesSeeded();
  } catch (error) {
    console.warn("[db] region seed skipped:", (error as any)?.message ?? error);
  }
}

// Καθαρίζει και συμπληρώνει παλιά δεδομένα περιοχών.
async function backfillRegions() {
  const rows = await Region.findAll({ attributes: ["id", "name", "name_el", "name_en", "normalized_name", "type", "parent_id"] });
  const byId = new Map(rows.map((item: any) => [Number(item.id), item]));
  const greece = rows.find((item: any) => String(item.type) === "COUNTRY" && normalizeRegionText(item.name) === normalizeRegionText("Ελλάδα")) as any;

  for (const row of rows as any[]) {
    const normalized = normalizeRegionText(row.name);
    const payload: Record<string, unknown> = {};
    if (normalized && normalized !== String(row.normalized_name || "")) payload.normalized_name = normalized;
    if (row.type === "PERIPHERY" && greece && row.parent_id == null) payload.parent_id = Number(greece.id);
    if (Object.keys(payload).length) await row.update(payload, { silent: true });
  }

  for (const row of rows as any[]) {
    if (String(row.type) !== "CITY" || !row.parent_id) continue;
    const parent = byId.get(Number(row.parent_id));
    if (parent && String(parent.type) === "COUNTRY") {
      await row.update({ type: "FOREIGN_CITY" }, { silent: true });
    }
  }
}

// Ευθυγραμμίζει παλιές καταγωγές αποφοίτων με το νέο μοντέλο περιοχών.
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
      allowOnlineLookup: false,
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

// Αρχικοποιεί σύνδεση, schema, seed και backfills στην εκκίνηση.
export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureRegionTypeEnum();
  await ensureSchema();
  await seedRegions();
  await backfillRegions();
  await ensureAppIndexes();
  await backfillGraduateOrigins();
}
