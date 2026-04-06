import type { Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { StudyProgram } from "../models/StudyProgram";
import { ProgramDirection } from "../models/ProgramDirection";
import { resolveMapLocation } from "../services/mapLocation.service";
import { buildMapWhere, calculateAgeAtDate, collapseCountsByLabel, isDirectionAllowed, isGreekMapGraduate, loadRegions, matchesSelectedStudyProgram, normalizeKey, pickDirectionDisplay, pickTopName, toInt } from "./map.helpers";

export async function getGraduatesMap(req: Request, res: Response) {
  const { where } = buildMapWhere(req);
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { regions, findPeriphery } = await loadRegions();
  const [studyPrograms, programDirections] = await Promise.all([
    StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] }),
    ProgramDirection.findAll({ attributes: ["id", "study_program_id", "code", "name_el", "name_en"] }),
  ]);
  const studyProgramLabels = new Map<number, string>();
  const programDirectionLabels = new Map<number, string>();
  const directionProgramIds = new Map<number, number>();

  for (const item of studyPrograms as any[]) {
    studyProgramLabels.set(Number(item.id), String(item.name_el || item.name_en || item.code || ""));
  }

  for (const item of programDirections as any[]) {
    const id = Number(item.id);
    programDirectionLabels.set(id, String(item.name_el || item.name_en || item.code || ""));
    directionProgramIds.set(id, Number(item.study_program_id) || 0);
  }

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id", "program_direction_id"],
  });

  const groups = new Map<number, any>();

  for (const r of regions as any[]) {
    if (String(r.type) !== "PERIPHERY") continue;
    const id = Number(r.id);
    groups.set(id, {
      periphery_id: id,
      periphery_name: String(r.name),
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
      programCounts: new Map<number, number>(),
      directionCounts: new Map<number, number>(),
    });
  }

  for (const g of grads as any[]) {
    if (!isGreekMapGraduate(g)) continue;
    const resolvedLocation = await resolveMapLocation({
      origin_country_region_id: Number(g.origin_country_region_id) || null,
      origin_periphery_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_city_region_id: Number(g.origin_city_region_id) || null,
      origin_municipality: g.origin_municipality || null,
    });
    const per = resolvedLocation?.peripheryId ? findPeriphery(resolvedLocation.peripheryId) : null;
    if (!per) continue;

    const id = Number(per.id);
    const cur = groups.get(id) || {
      periphery_id: id,
      periphery_name: String(per.name),
      latitude: per.latitude ?? null,
      longitude: per.longitude ?? null,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
      programCounts: new Map<number, number>(),
      directionCounts: new Map<number, number>(),
    };

    const studyProgramId = Number(g.study_program_id) || 0;
    const programDirectionId = Number(g.program_direction_id) || 0;
    if (!matchesSelectedStudyProgram(studyProgramId, programDirectionId, selectedStudyProgramId, directionProgramIds)) continue;

    cur.count += 1;
    if (g.gender === "M") cur.male += 1;
    if (g.gender === "F") cur.female += 1;

    if (studyProgramId > 0) {
      cur.programCounts.set(studyProgramId, (cur.programCounts.get(studyProgramId) || 0) + 1);
    }

    if (isDirectionAllowed(programDirectionId, studyProgramId, selectedStudyProgramId, directionProgramIds)) {
      cur.directionCounts.set(programDirectionId, (cur.directionCounts.get(programDirectionId) || 0) + 1);
    }

    const graduationAge = calculateAgeAtDate(g.birth_date, g.graduation_date);
    if (graduationAge !== null) {
      cur.ageSum += graduationAge;
      cur.ageCount += 1;
    }

    const degreeGrade = Number(g.degree_grade);
    if (Number.isFinite(degreeGrade) && degreeGrade >= 0) {
      cur.gradeSum += degreeGrade;
      cur.gradeCount += 1;
    }

    const entryYear = Number(g.entry_year);
    const graduationYear = Number(String(g.graduation_date ?? "").slice(0, 4));
    if (Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear) {
      cur.graduationDurationSum += graduationYear - entryYear;
      cur.graduationDurationCount += 1;
    }

    groups.set(id, cur);
  }

  const items = Array.from(groups.values())
    .map((x) => {
      const directionTotal = collapseCountsByLabel(x.directionCounts, programDirectionLabels).reduce((sum, entry) => sum + entry.count, 0);
      const directionDisplay = pickDirectionDisplay(x.directionCounts, programDirectionLabels, directionTotal || x.count);
      return {
        periphery_id: x.periphery_id,
        periphery_name: x.periphery_name,
        latitude: x.latitude,
        longitude: x.longitude,
        count: x.count,
        male_count: x.male,
        female_count: x.female,
        male_pct: x.count ? Math.round((x.male / x.count) * 1000) / 10 : 0,
        female_pct: x.count ? Math.round((x.female / x.count) * 1000) / 10 : 0,
        avg_age: x.ageCount ? Math.round((x.ageSum / x.ageCount) * 10) / 10 : null,
        avg_grade: x.gradeCount ? Math.round((x.gradeSum / x.gradeCount) * 100) / 100 : null,
        avg_graduation_years: x.graduationDurationCount ? Math.round((x.graduationDurationSum / x.graduationDurationCount) * 10) / 10 : null,
        dominant_gender: !x.count ? null : x.male > x.female ? "M" : x.female > x.male ? "F" : "balanced",
        dominant_study_program: pickTopName(x.programCounts, studyProgramLabels),
        dominant_direction: pickTopName(x.directionCounts, programDirectionLabels),
        dominant_recent_direction: directionDisplay.label,
        dominant_recent_direction_count: directionDisplay.count,
        recent_directions: directionDisplay.entries,
      };
    })
    .sort((a, b) => b.count - a.count);

  const total = items.reduce((s, it) => s + (Number(it.count) || 0), 0);
  return res.json({ ok: true, items, total });
}

export async function getMapCities(req: Request, res: Response) {
  const { where } = buildMapWhere(req);
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const groups = new Map<string, any>();
  const directions = selectedStudyProgramId
    ? await ProgramDirection.findAll({ attributes: ["id", "study_program_id"] })
    : [];
  const directionProgramIds = new Map<number, number>();

  for (const item of directions as any[]) {
    directionProgramIds.set(Number(item.id), Number(item.study_program_id) || 0);
  }

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_city_region_id", "origin_municipality", "study_program_id", "program_direction_id"],
  });

  for (const g of grads as any[]) {
    const studyProgramId = Number(g.study_program_id) || 0;
    const programDirectionId = Number(g.program_direction_id) || 0;
    if (!matchesSelectedStudyProgram(studyProgramId, programDirectionId, selectedStudyProgramId, directionProgramIds)) continue;
    const resolvedLocation = await resolveMapLocation({
      origin_country_region_id: Number(g.origin_country_region_id) || null,
      origin_periphery_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_city_region_id: Number(g.origin_city_region_id) || null,
      origin_municipality: g.origin_municipality || null,
    });
    if (!resolvedLocation?.cityName || resolvedLocation.latitude === null || resolvedLocation.longitude === null) continue;
    const key = `${resolvedLocation.cityId || normalizeKey(resolvedLocation.cityName)}::${resolvedLocation.peripheryId || "none"}`;
    const cur = groups.get(key) || {
      city_id: resolvedLocation.cityId || 0,
      city_name: resolvedLocation.cityName,
      periphery_id: resolvedLocation.peripheryId,
      periphery_name: resolvedLocation.peripheryName || "",
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
      count: 0,
    };
    cur.count += 1;
    groups.set(key, cur);
  }

  const items = Array.from(groups.values())
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.periphery_name !== b.periphery_name) return a.periphery_name.localeCompare(b.periphery_name, "el");
      return a.city_name.localeCompare(b.city_name, "el");
    });

  return res.json({ ok: true, items });
}

export async function getRegionCities(req: Request, res: Response) {
  const peripheryId = toInt(req.query.periphery_id);
  if (!peripheryId) return res.status(400).json({ ok: false, error: "periphery_id is required" });

  const { where } = buildMapWhere(req);
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { findPeriphery, findRegion } = await loadRegions();
  const directions = await ProgramDirection.findAll({ attributes: ["id", "study_program_id", "code", "name_el", "name_en"] });
  const programDirectionLabels = new Map<number, string>();
  const directionProgramIds = new Map<number, number>();

  for (const item of directions as any[]) {
    const id = Number(item.id);
    programDirectionLabels.set(id, String(item.name_el || item.name_en || item.code || ""));
    directionProgramIds.set(id, Number(item.study_program_id) || 0);
  }

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id", "program_direction_id"],
  });

  const groups = new Map<string, any>();

  for (const g of grads as any[]) {
    if (!isGreekMapGraduate(g)) continue;
    const resolvedLocation = await resolveMapLocation({
      origin_country_region_id: Number(g.origin_country_region_id) || null,
      origin_periphery_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_region_id: Number(g.origin_periphery_region_id) || Number(g.origin_region_id) || null,
      origin_city_region_id: Number(g.origin_city_region_id) || null,
      origin_municipality: g.origin_municipality || null,
    });
    if (!resolvedLocation?.peripheryId || Number(resolvedLocation.peripheryId) !== peripheryId) continue;

    const regionCity = resolvedLocation.cityId ? findRegion(resolvedLocation.cityId) : null;
    const name = String(regionCity?.type === "CITY" ? regionCity.name : resolvedLocation.cityName || g.origin_municipality || "").trim();
    if (!name) continue;

    const key = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    const cur = groups.get(key) || {
      city: name,
      count: 0,
      male: 0,
      female: 0,
      ageSum: 0,
      ageCount: 0,
      gradeSum: 0,
      gradeCount: 0,
      graduationDurationSum: 0,
      graduationDurationCount: 0,
      directionCounts: new Map<number, number>(),
    };

    const studyProgramId = Number(g.study_program_id) || 0;
    const programDirectionId = Number(g.program_direction_id) || 0;
    if (!matchesSelectedStudyProgram(studyProgramId, programDirectionId, selectedStudyProgramId, directionProgramIds)) continue;

    cur.count += 1;
    if (g.gender === "M") cur.male += 1;
    if (g.gender === "F") cur.female += 1;

    const graduationAge = calculateAgeAtDate(g.birth_date, g.graduation_date);
    if (graduationAge !== null) {
      cur.ageSum += graduationAge;
      cur.ageCount += 1;
    }

    const degreeGrade = Number(g.degree_grade);
    if (Number.isFinite(degreeGrade) && degreeGrade >= 0) {
      cur.gradeSum += degreeGrade;
      cur.gradeCount += 1;
    }

    const entryYear = Number(g.entry_year);
    const graduationYear = Number(String(g.graduation_date ?? "").slice(0, 4));
    if (Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear) {
      cur.graduationDurationSum += graduationYear - entryYear;
      cur.graduationDurationCount += 1;
    }

    if (isDirectionAllowed(programDirectionId, studyProgramId, selectedStudyProgramId, directionProgramIds)) {
      cur.directionCounts.set(programDirectionId, (cur.directionCounts.get(programDirectionId) || 0) + 1);
    }

    groups.set(key, cur);
  }

  const items = Array.from(groups.values())
    .map((x) => {
      const directionTotal = collapseCountsByLabel(x.directionCounts, programDirectionLabels).reduce((sum, entry) => sum + entry.count, 0);
      const directionDisplay = pickDirectionDisplay(x.directionCounts, programDirectionLabels, directionTotal || x.count);
      return {
        city: x.city,
        count: x.count,
        male_count: x.male,
        female_count: x.female,
        male_pct: x.count ? Math.round((x.male / x.count) * 1000) / 10 : 0,
        female_pct: x.count ? Math.round((x.female / x.count) * 1000) / 10 : 0,
        avg_age: x.ageCount ? Math.round((x.ageSum / x.ageCount) * 10) / 10 : null,
        avg_grade: x.gradeCount ? Math.round((x.gradeSum / x.gradeCount) * 100) / 100 : null,
        avg_graduation_years: x.graduationDurationCount ? Math.round((x.graduationDurationSum / x.graduationDurationCount) * 10) / 10 : null,
        dominant_gender: !x.count ? null : x.male > x.female ? "M" : x.female > x.male ? "F" : "balanced",
        dominant_recent_direction: directionDisplay.label,
        dominant_recent_direction_count: directionDisplay.count,
        recent_directions: directionDisplay.entries,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.city.localeCompare(b.city, "el");
    });

  return res.json({ ok: true, items });
}

export async function getMapCityDetail(req: Request, res: Response) {
  const cityId = toInt(req.query.city_id);
  if (!cityId) return res.status(400).json({ ok: false, error: "city_id is required" });

  const mode = String(req.query.mode || "count");
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { where, currentYear } = buildMapWhere(req);
  const { findRegion } = await loadRegions();
  const city = findRegion(cityId);

  if (!city || String((city as any).type) !== "CITY") {
    return res.status(404).json({ ok: false, error: "city not found" });
  }

  const [studyPrograms, programDirections] = await Promise.all([
    StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] }),
    ProgramDirection.findAll({ attributes: ["id", "study_program_id", "code", "name_el", "name_en"] }),
  ]);

  const studyProgramLabels = new Map<number, string>();
  const directionLabels = new Map<number, string>();
  const directionProgramIds = new Map<number, number>();

  for (const item of studyPrograms as any[]) {
    studyProgramLabels.set(Number(item.id), String(item.name_el || item.name_en || item.code || ""));
  }

  for (const item of programDirections as any[]) {
    const id = Number(item.id);
    directionLabels.set(id, String(item.name_el || item.name_en || item.code || ""));
    directionProgramIds.set(id, Number(item.study_program_id) || 0);
  }

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "graduation_date", "entry_year", "study_program_id", "program_direction_id"],
  });

  const matching: any[] = [];
  for (const graduate of grads as any[]) {
    const resolvedLocation = await resolveMapLocation({
      origin_region_id: Number(graduate.origin_region_id) || null,
      origin_city_region_id: Number(graduate.origin_city_region_id) || null,
      origin_municipality: graduate.origin_municipality || null,
    });
    if (Number(resolvedLocation?.cityId || 0) === cityId) matching.push(graduate);
  }

  if (mode === "dominant_gender") {
    const male = matching.filter((graduate) => graduate.gender === "M").length;
    const female = matching.filter((graduate) => graduate.gender === "F").length;
    const totalGender = male + female;

    return res.json({
      ok: true,
      city_id: cityId,
      city_name: String((city as any).name || ""),
      mode,
      total: matching.length,
      male_count: male,
      female_count: female,
      male_pct: totalGender ? Math.round((male / totalGender) * 1000) / 10 : 0,
      female_pct: totalGender ? Math.round((female / totalGender) * 1000) / 10 : 0,
    });
  }

  if (mode === "dominant_direction") {
    const byProgram = new Map<number, Map<number, number>>();

    for (const graduate of matching) {
      const directionId = Number(graduate.program_direction_id) || 0;
      const studyProgramId = Number(graduate.study_program_id) || 0;
      if (!isDirectionAllowed(directionId, studyProgramId, selectedStudyProgramId, directionProgramIds)) continue;
      const programId = directionProgramIds.get(directionId) || studyProgramId || 0;
      if (!programId) continue;

      const programMap = byProgram.get(programId) || new Map<number, number>();
      programMap.set(directionId, (programMap.get(directionId) || 0) + 1);
      byProgram.set(programId, programMap);
    }

    const programs = Array.from(byProgram.entries())
      .map(([programId, counts]) => {
        const directions = collapseCountsByLabel(counts, directionLabels).map((entry) => ({
          id: entry.id,
          label: entry.label,
          count: entry.count,
        }));

        return {
          program_id: programId,
          program_label: studyProgramLabels.get(programId) || String(programId),
          total: directions.reduce((sum, item) => sum + item.count, 0),
          directions,
        };
      })
      .filter((item) => item.directions.length > 0)
      .sort((left, right) => {
        if (right.total !== left.total) return right.total - left.total;
        return left.program_label.localeCompare(right.program_label, "el");
      });

    return res.json({
      ok: true,
      city_id: cityId,
      city_name: String((city as any).name || ""),
      mode,
      total: matching.length,
      programs,
    });
  }

  const startYear = 2010;
  const endYear = Math.max(currentYear, startYear);
  const labels = Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
  const yearIndex = new Map(labels.map((label, index) => [Number(label), index]));
  const counts = labels.map(() => 0);

  for (const graduate of matching) {
    const year = Number(String(graduate.graduation_date || "").slice(0, 4));
    const index = yearIndex.get(year);
    if (index === undefined) continue;
    counts[index] += 1;
  }

  return res.json({
    ok: true,
    city_id: cityId,
    city_name: String((city as any).name || ""),
    mode: "count",
    total: matching.length,
    labels,
    datasets: [{ key: "count", label: "Απόφοιτοι", values: counts }],
  });
}
