import { sequelize } from "../config/sequelize";
import { User } from "./User";
import { StudyProgram } from "./StudyProgram";
import { ProgramDirection } from "./ProgramDirection";
import { Graduate } from "./Graduate";
import { ActivityLog } from "./ActivityLog";
import { Region } from "./Region";
import { ensurePeripheriesSeeded } from "../seed/peripheries";

// Study Programs / Directions
StudyProgram.hasMany(ProgramDirection, { foreignKey: "study_program_id" });
ProgramDirection.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

// Graduates -> programs/directions
StudyProgram.hasMany(Graduate, { foreignKey: "study_program_id" });
Graduate.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

ProgramDirection.hasMany(Graduate, { foreignKey: "program_direction_id" });
Graduate.belongsTo(ProgramDirection, { foreignKey: "program_direction_id" });

// Regions hierarchy
Region.hasMany(Region, { as: "children", foreignKey: "parent_id" });
Region.belongsTo(Region, { as: "parent", foreignKey: "parent_id" });

// Graduates -> regions
Region.hasMany(Graduate, { foreignKey: "origin_region_id" });
Graduate.belongsTo(Region, { foreignKey: "origin_region_id" });

// Users -> logs
User.hasMany(ActivityLog, { foreignKey: "user_id" });
ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

export async function initDb() {
  await sequelize.authenticate();

  // Public map expects PERIPHERY regions to exist. Seed once if missing.
  try {
    await ensurePeripheriesSeeded();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[db] periphery seed skipped:", (e as any)?.message ?? e);
  }
}
