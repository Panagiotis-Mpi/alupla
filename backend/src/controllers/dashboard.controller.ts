import type { NextFunction, Request, Response } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/sequelize";

type DashboardSummaryRow = {
  total_graduates: number;
  current_year_graduates: number;
  study_programs: number;
  last_data_update: string | Date | null;
};

type ProgramDistributionRow = {
  study_program_id: number;
  name_el: string;
  name_en: string | null;
  count: number;
};

type DataQualityRow = {
  missing_program_translations: number;
  missing_region_translations: number;
};

type ActivityRow = {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string | Date;
  actor_name: string | null;
  actor_email: string | null;
};

type AdminSummaryRow = {
  total_users: number;
  active_users: number;
  actions_last_24h: number;
  failed_imports_30d: number;
};

const dataActions = [
  "import_graduates",
  "create_graduate",
  "update_graduate",
  "delete_graduate",
  "bulk_delete_graduates",
  "import_study_programs",
  "create_study_program",
  "update_study_program",
  "delete_study_program",
];

function activityQuery(whereClause: string, limit: number) {
  return `
    SELECT
      al.id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.details,
      al.created_at,
      NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS actor_name,
      u.email AS actor_email
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ${limit}
  `;
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;
    const currentYear = new Date().getUTCFullYear();
    const activityFilter = role === "super_admin" ? "TRUE" : "al.user_id = :userId";

    const [summaryRows, programDistribution, dataQualityRows, recentDataActivity] = await Promise.all([
      sequelize.query<DashboardSummaryRow>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM graduates) AS total_graduates,
            (SELECT COUNT(*)::int FROM graduates WHERE graduation_date >= :yearStart AND graduation_date < :nextYearStart) AS current_year_graduates,
            (SELECT COUNT(*)::int FROM study_programs) AS study_programs,
            (SELECT MAX(updated_at) FROM graduates) AS last_data_update
        `,
        {
          replacements: {
            yearStart: `${currentYear}-01-01`,
            nextYearStart: `${currentYear + 1}-01-01`,
          },
          type: QueryTypes.SELECT,
        },
      ),
      sequelize.query<ProgramDistributionRow>(
        `
          SELECT
            sp.id AS study_program_id,
            sp.name_el,
            sp.name_en,
            COUNT(g.id)::int AS count
          FROM study_programs sp
          LEFT JOIN graduates g ON g.study_program_id = sp.id
          GROUP BY sp.id, sp.name_el, sp.name_en
          ORDER BY COUNT(g.id) DESC, sp.id ASC
        `,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query<DataQualityRow>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM study_programs WHERE name_en IS NULL OR BTRIM(name_en) = '') AS missing_program_translations,
            (SELECT COUNT(DISTINCT r.id)::int FROM regions r JOIN graduates g ON g.origin_location_id = r.id WHERE r.name_en IS NULL OR BTRIM(r.name_en) = '') AS missing_region_translations
        `,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query<ActivityRow>(
        activityQuery(`al.action IN (:dataActions) AND ${activityFilter}`, 6),
        {
          replacements: { dataActions, userId },
          type: QueryTypes.SELECT,
        },
      ),
    ]);

    const response: Record<string, unknown> = {
      ok: true,
      role,
      current_year: currentYear,
      summary: summaryRows[0],
      program_distribution: programDistribution,
      data_quality: dataQualityRows[0],
      recent_data_activity: recentDataActivity,
    };

    if (role === "super_admin") {
      const [adminSummaryRows, recentLogins, recentOperations] = await Promise.all([
        sequelize.query<AdminSummaryRow>(
          `
            SELECT
              (SELECT COUNT(*)::int FROM users) AS total_users,
              (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE) AS active_users,
              (SELECT COUNT(*)::int FROM activity_logs WHERE created_at >= NOW() - INTERVAL '24 hours') AS actions_last_24h,
              (
                SELECT COUNT(*)::int
                FROM activity_logs
                WHERE action IN ('import_graduates', 'import_study_programs')
                  AND created_at >= NOW() - INTERVAL '30 days'
                  AND CASE
                    WHEN COALESCE(details ->> 'errors', '') ~ '^[0-9]+$' THEN (details ->> 'errors')::int
                    ELSE 0
                  END > 0
              ) AS failed_imports_30d
          `,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query<ActivityRow>(
          activityQuery("al.action = 'login' AND al.user_id IS NOT NULL", 5),
          { type: QueryTypes.SELECT },
        ),
        sequelize.query<ActivityRow>(
          activityQuery(
            "(al.action LIKE 'import_%' OR al.action LIKE 'export_%' OR al.action IN ('statistics_export', 'map_export'))",
            6,
          ),
          { type: QueryTypes.SELECT },
        ),
      ]);

      response.admin = {
        summary: adminSummaryRows[0],
        recent_logins: recentLogins,
        recent_operations: recentOperations,
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
}
