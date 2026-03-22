import { sequelize } from "../config/sequelize";
import { User } from "./User";
import { StudyProgram } from "./StudyProgram";
import { ProgramDirection } from "./ProgramDirection";
import { Graduate } from "./Graduate";
import { ActivityLog } from "./ActivityLog";
import { Region } from "./Region";
import { ensurePeripheriesSeeded } from "../seed/peripheries";
import { ensureRegionCitiesSeeded } from "../seed/regionCities";

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
  Graduate.belongsTo(Region, { foreignKey: "origin_region_id" });

  User.hasMany(ActivityLog, { foreignKey: "user_id" });
  ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });
}

setupAssociations();

async function seedRegions() {
  try {
    await ensurePeripheriesSeeded();
    await ensureRegionCitiesSeeded();
  } catch (error) {
    console.warn("[db] periphery seed skipped:", (error as any)?.message ?? error);
  }
}

export async function initDb() {
  await sequelize.authenticate();
  await sequelize.sync();
  await seedRegions();
}
