import { sequelize } from "../config/sequelize";
import { User } from "./User";
import { StudyProgram } from "./StudyProgram";
import { Graduate } from "./Graduate";
import { ActivityLog } from "./ActivityLog";
import { Region } from "./Region";
import { initializeSharedState } from "../services/sharedState.service";

StudyProgram.hasMany(Graduate, { foreignKey: "study_program_id" });
Graduate.belongsTo(StudyProgram, { foreignKey: "study_program_id" });

Region.hasMany(Region, { as: "children", foreignKey: "parent_id" });
Region.belongsTo(Region, { as: "parent", foreignKey: "parent_id" });
Region.hasMany(Graduate, { foreignKey: "origin_location_id" });
Graduate.belongsTo(Region, { foreignKey: "origin_location_id", as: "originLocation" });

User.hasMany(ActivityLog, { foreignKey: "user_id" });
ActivityLog.belongsTo(User, { foreignKey: "user_id", as: "user" });

export async function initDb() {
  await sequelize.authenticate();
  await initializeSharedState();
}
