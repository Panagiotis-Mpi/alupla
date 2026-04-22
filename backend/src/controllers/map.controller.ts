import type { Request, Response } from "express";
import { Graduate } from "../models/Graduate";
import { Region } from "../models/Region";
import { StudyProgram } from "../models/StudyProgram";
import { Op, QueryTypes } from "sequelize";
import { resolveMapLocation } from "../services/mapLocation.service";
import { sequelize } from "../config/sequelize";
import { buildMapWhere, calculateAgeAtDate, isAbroadMapGraduate, isGreekMapGraduate, loadRegions, normalizeKey, pickTopName, toInt } from "./map.helpers";

function mapScopeFromRequest(req: Request) {
  return String(req.query.scope || "greece").trim().toLowerCase() === "abroad" ? "abroad" : "greece";
}

async function loadProgramMetadata() {
  const studyPrograms = await StudyProgram.findAll({ attributes: ["id", "code", "name_el", "name_en"] });

  const studyProgramLabels = new Map<number, string>();

  for (const item of studyPrograms as any[]) {
    studyProgramLabels.set(Number(item.id), String(item.name_el || item.name_en || item.code || ""));
  }

  return { studyProgramLabels };
}

function createMetricsBucket(seed: Record<string, unknown>) {
  return {
    ...seed,
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
  };
}

function applyGraduateMetrics(bucket: any, graduate: any, selectedStudyProgramId: number | null) {
  const studyProgramId = Number(graduate.study_program_id) || 0;
  if (selectedStudyProgramId && studyProgramId !== selectedStudyProgramId) return false;

  bucket.count += 1;
  if (graduate.gender === "M") bucket.male += 1;
  if (graduate.gender === "F") bucket.female += 1;

  if (studyProgramId > 0) {
    bucket.programCounts.set(studyProgramId, (bucket.programCounts.get(studyProgramId) || 0) + 1);
  }

  const graduationAge = calculateAgeAtDate(graduate.birth_date, graduate.graduation_date);
  if (graduationAge !== null) {
    bucket.ageSum += graduationAge;
    bucket.ageCount += 1;
  }

  const degreeGrade = Number(graduate.degree_grade);
  if (Number.isFinite(degreeGrade) && degreeGrade >= 0) {
    bucket.gradeSum += degreeGrade;
    bucket.gradeCount += 1;
  }

  const entryYear = Number(graduate.entry_year);
  const graduationYear = Number(String(graduate.graduation_date ?? "").slice(0, 4));
  if (Number.isFinite(entryYear) && Number.isFinite(graduationYear) && entryYear > 1900 && graduationYear >= entryYear) {
    bucket.graduationDurationSum += graduationYear - entryYear;
    bucket.graduationDurationCount += 1;
  }

  return true;
}

function bucketToMapItem(bucket: any, labels: { studyProgramLabels: Map<number, string> }, nameKeys: { idKey: string; nameKey: string; latitudeKey?: string; longitudeKey?: string }) {
  return {
    [nameKeys.idKey]: bucket[nameKeys.idKey],
    [nameKeys.nameKey]: bucket[nameKeys.nameKey],
    ...(nameKeys.latitudeKey ? { [nameKeys.latitudeKey]: bucket[nameKeys.latitudeKey] ?? null } : {}),
    ...(nameKeys.longitudeKey ? { [nameKeys.longitudeKey]: bucket[nameKeys.longitudeKey] ?? null } : {}),
    count: bucket.count,
    male_count: bucket.male,
    female_count: bucket.female,
    male_pct: bucket.count ? Math.round((bucket.male / bucket.count) * 1000) / 10 : 0,
    female_pct: bucket.count ? Math.round((bucket.female / bucket.count) * 1000) / 10 : 0,
    avg_age: bucket.ageCount ? Math.round((bucket.ageSum / bucket.ageCount) * 10) / 10 : null,
    avg_grade: bucket.gradeCount ? Math.round((bucket.gradeSum / bucket.gradeCount) * 100) / 100 : null,
    avg_graduation_years: bucket.graduationDurationCount ? Math.round((bucket.graduationDurationSum / bucket.graduationDurationCount) * 10) / 10 : null,
    dominant_gender: !bucket.count ? null : bucket.male > bucket.female ? "M" : bucket.female > bucket.male ? "F" : "balanced",
    dominant_study_program: pickTopName(bucket.programCounts, labels.studyProgramLabels),
  };
}

export async function getGraduatesMap(req: Request, res: Response) {
  const scope = mapScopeFromRequest(req);
  const { where } = buildMapWhere(req);
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { regions, findPeriphery, findRegion } = await loadRegions();
  const labels = await loadProgramMetadata();

  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id"],
  });

  if (scope === "abroad") {
    const groups = new Map<number, any>();

    for (const graduate of grads as any[]) {
      if (!isAbroadMapGraduate(graduate)) continue;
      const resolvedLocation = await resolveMapLocation({
        origin_country: graduate.origin_country || null,
        origin_country_region_id: Number(graduate.origin_country_region_id) || null,
        origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_city_region_id: Number(graduate.origin_city_region_id) || null,
        origin_municipality: graduate.origin_foreign_city || graduate.origin_municipality || null,
      });
      const countryId = Number(resolvedLocation?.countryId || graduate.origin_country_region_id || 0);
      const country = countryId ? findRegion(countryId) : null;
      if (!countryId || !country || String((country as any).type) !== "COUNTRY") continue;
      const bucket = groups.get(countryId) || createMetricsBucket({
        periphery_id: countryId,
        periphery_name: String((country as any).name || resolvedLocation?.countryName || graduate.origin_country || ""),
        latitude: resolvedLocation?.latitude ?? (country as any).latitude ?? null,
        longitude: resolvedLocation?.longitude ?? (country as any).longitude ?? null,
      });
      if (!applyGraduateMetrics(bucket, graduate, selectedStudyProgramId)) continue;
      groups.set(countryId, bucket);
    }

    const items = Array.from(groups.values())
      .map((bucket) => bucketToMapItem(bucket, labels, { idKey: "periphery_id", nameKey: "periphery_name", latitudeKey: "latitude", longitudeKey: "longitude" }))
      .sort((left, right) => right.count - left.count);

    return res.json({ ok: true, items, total: items.reduce((sum, item) => sum + (Number(item.count) || 0), 0) });
  }

  const groups = new Map<number, any>();
  for (const region of regions as any[]) {
    if (String(region.type) !== "PERIPHERY") continue;
    const id = Number(region.id);
    groups.set(id, createMetricsBucket({
      periphery_id: id,
      periphery_name: String(region.name),
      latitude: region.latitude ?? null,
      longitude: region.longitude ?? null,
    }));
  }

  for (const graduate of grads as any[]) {
    if (!isGreekMapGraduate(graduate)) continue;
    const resolvedLocation = await resolveMapLocation({
      origin_country: graduate.origin_country || null,
      origin_country_region_id: Number(graduate.origin_country_region_id) || null,
      origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
      origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
      origin_city_region_id: Number(graduate.origin_city_region_id) || null,
      origin_municipality: graduate.origin_municipality || null,
    });
    const periphery = resolvedLocation?.peripheryId ? findPeriphery(resolvedLocation.peripheryId) : null;
    if (!periphery) continue;
    const bucket = groups.get(Number(periphery.id)) || createMetricsBucket({
      periphery_id: Number(periphery.id),
      periphery_name: String(periphery.name),
      latitude: (periphery as any).latitude ?? null,
      longitude: (periphery as any).longitude ?? null,
    });
    if (!applyGraduateMetrics(bucket, graduate, selectedStudyProgramId)) continue;
    groups.set(Number(periphery.id), bucket);
  }

  const items = Array.from(groups.values())
    .map((bucket) => bucketToMapItem(bucket, labels, { idKey: "periphery_id", nameKey: "periphery_name", latitudeKey: "latitude", longitudeKey: "longitude" }))
    .sort((left, right) => right.count - left.count);

  return res.json({ ok: true, items, total: items.reduce((sum, item) => sum + (Number(item.count) || 0), 0) });
}

export async function getMapYearRange(req: Request, res: Response) {
  try {
    const rows = await sequelize.query<{ year: number | null }>(
      `SELECT DISTINCT EXTRACT(YEAR FROM graduation_date)::int AS year
       FROM graduates
       WHERE graduation_date IS NOT NULL
       ORDER BY year ASC`,
      { type: QueryTypes.SELECT }
    );

    const years = rows
      .map((row) => Number(row.year))
      .filter((year) => Number.isFinite(year) && year > 1900)
      .sort((left, right) => left - right);

    return res.json({ ok: true, years, min_year: years[0] ?? null, max_year: years.length ? years[years.length - 1] : null });
  } catch (error) {
    console.error("[map] failed to load year range:", (error as Error)?.message ?? error);
    return res.status(500).json({ ok: false, message: "Failed to load map years" });
  }
}

export async function getMapCities(req: Request, res: Response) {
  const scope = mapScopeFromRequest(req);
  const { where } = buildMapWhere(req);
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { findRegion } = await loadRegions();
  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id"],
  });

  const groups = new Map<string, any>();

  for (const graduate of grads as any[]) {
    const studyProgramId = Number(graduate.study_program_id) || 0;
    if (selectedStudyProgramId && studyProgramId !== selectedStudyProgramId) continue;
    if (scope === "abroad" && !isAbroadMapGraduate(graduate)) continue;
    if (scope === "greece" && !isGreekMapGraduate(graduate)) continue;

    const resolvedLocation = await resolveMapLocation({
      origin_country: graduate.origin_country || null,
      origin_country_region_id: Number(graduate.origin_country_region_id) || null,
      origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
      origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
      origin_city_region_id: Number(graduate.origin_city_region_id) || null,
      origin_municipality: scope === "abroad" ? (graduate.origin_foreign_city || graduate.origin_municipality || null) : (graduate.origin_municipality || null),
    });

    if (!resolvedLocation?.cityName || resolvedLocation.latitude === null || resolvedLocation.longitude === null) continue;

    const country = resolvedLocation.countryId ? findRegion(Number(resolvedLocation.countryId)) : (Number(graduate.origin_country_region_id) ? findRegion(Number(graduate.origin_country_region_id)) : null);
    const key = scope === "abroad"
      ? `${normalizeKey(String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""))}::${normalizeKey(resolvedLocation.cityName)}`
      : `${resolvedLocation.cityId || normalizeKey(resolvedLocation.cityName)}::${resolvedLocation.peripheryId || "none"}`;

    const bucket = groups.get(key) || createMetricsBucket({
      city_id: resolvedLocation.cityId || 0,
      city_name: resolvedLocation.cityName,
      periphery_id: scope === "greece" ? resolvedLocation.peripheryId : (resolvedLocation.countryId || Number(graduate.origin_country_region_id) || null),
      periphery_name: scope === "greece"
        ? (resolvedLocation.peripheryName || "")
        : String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      country_region_id: resolvedLocation.countryId || Number(graduate.origin_country_region_id) || null,
      country_name: String(country?.name || resolvedLocation.countryName || graduate.origin_country || ""),
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
    });

    applyGraduateMetrics(bucket, graduate, selectedStudyProgramId);
    groups.set(key, bucket);
  }

  const items = Array.from(groups.values())
    .filter((item) => item.count > 0)
    .map((item) => ({
      city_id: item.city_id,
      city_name: item.city_name,
      periphery_id: item.periphery_id,
      periphery_name: item.periphery_name,
      country_region_id: item.country_region_id,
      country_name: item.country_name,
      latitude: item.latitude,
      longitude: item.longitude,
      count: item.count,
      male_count: item.male,
      female_count: item.female,
      male_pct: item.count ? Math.round((item.male / item.count) * 1000) / 10 : 0,
      female_pct: item.count ? Math.round((item.female / item.count) * 1000) / 10 : 0,
      avg_age: item.ageCount ? Math.round((item.ageSum / item.ageCount) * 10) / 10 : null,
      avg_grade: item.gradeCount ? Math.round((item.gradeSum / item.gradeCount) * 100) / 100 : null,
      avg_graduation_years: item.graduationDurationCount ? Math.round((item.graduationDurationSum / item.graduationDurationCount) * 10) / 10 : null,
      dominant_gender: !item.count ? null : item.male > item.female ? "M" : item.female > item.male ? "F" : "balanced",
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      if (left.periphery_name !== right.periphery_name) return String(left.periphery_name || "").localeCompare(String(right.periphery_name || ""), "el");
      return String(left.city_name || "").localeCompare(String(right.city_name || ""), "el");
    });

  return res.json({ ok: true, items });
}

export async function getMapCityDetail(req: Request, res: Response) {
  const scope = mapScopeFromRequest(req);
  const cityId = toInt(req.query.city_id);
  const cityNameQuery = String(req.query.city_name || "").trim();
  const countryRegionId = toInt(req.query.country_region_id) || toInt(req.query.periphery_id);
  const mode = String(req.query.mode || "count");
  const selectedStudyProgramId = toInt(req.query.study_program_id);
  const { where, currentYear } = buildMapWhere(req);
  const { findRegion } = await loadRegions();


  const grads = await Graduate.findAll({
    where,
    attributes: ["origin_country", "origin_foreign_city", "origin_country_region_id", "origin_periphery_region_id", "origin_region_id", "origin_city_region_id", "origin_municipality", "gender", "birth_date", "degree_grade", "entry_year", "graduation_date", "study_program_id"],
  });

  const matching: any[] = [];
  let cityLabel = cityNameQuery;

  if (scope === "abroad") {
    const hasCityFilter = Boolean(cityId || cityNameQuery);
    const country = countryRegionId ? findRegion(countryRegionId) : null;
    if (!hasCityFilter && country) cityLabel = String((country as any).name || cityNameQuery || "");
    for (const graduate of grads as any[]) {
      if (!isAbroadMapGraduate(graduate)) continue;
      const resolvedLocation = await resolveMapLocation({
        origin_country: graduate.origin_country || null,
        origin_country_region_id: Number(graduate.origin_country_region_id) || null,
        origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_city_region_id: Number(graduate.origin_city_region_id) || null,
        origin_municipality: graduate.origin_foreign_city || graduate.origin_municipality || null,
      });
      const sameCountry = countryRegionId ? Number(resolvedLocation?.countryId || graduate.origin_country_region_id || 0) === countryRegionId : true;
      if (!sameCountry) continue;
      if (hasCityFilter) {
        const sameCity = cityId
          ? Number(resolvedLocation?.cityId || 0) === cityId
          : normalizeKey(String(resolvedLocation?.cityName || "")) === normalizeKey(cityNameQuery);
        if (!sameCity) continue;
        cityLabel = String(resolvedLocation?.cityName || cityNameQuery || "");
      } else if (!cityLabel) {
        cityLabel = String(resolvedLocation?.countryName || graduate.origin_country || cityNameQuery || "");
      }
      matching.push(graduate);
    }
  } else {
    const city = cityId ? findRegion(cityId) : null;
    if (!cityId || !city || String((city as any).type) !== "CITY") {
      return res.status(404).json({ ok: false, error: "city not found" });
    }
    cityLabel = String((city as any).name || cityNameQuery || "");
    for (const graduate of grads as any[]) {
      if (!isGreekMapGraduate(graduate)) continue;
      const resolvedLocation = await resolveMapLocation({
        origin_country: graduate.origin_country || null,
        origin_country_region_id: Number(graduate.origin_country_region_id) || null,
        origin_periphery_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_region_id: Number(graduate.origin_periphery_region_id) || Number(graduate.origin_region_id) || null,
        origin_city_region_id: Number(graduate.origin_city_region_id) || null,
        origin_municipality: graduate.origin_municipality || null,
      });
      if (Number(resolvedLocation?.cityId || 0) === cityId) matching.push(graduate);
    }
  }

  const metricBucket = createMetricsBucket({});
  for (const graduate of matching) {
    applyGraduateMetrics(metricBucket, graduate, selectedStudyProgramId);
  }

  if (mode === "dominant_gender") {
    const male = matching.filter((graduate) => graduate.gender === "M").length;
    const female = matching.filter((graduate) => graduate.gender === "F").length;
    const totalGender = male + female;
    return res.json({
      ok: true,
      city_id: cityId || 0,
      city_name: cityLabel,
      mode,
      total: matching.length,
      avg_age: metricBucket.ageCount ? Math.round((metricBucket.ageSum / metricBucket.ageCount) * 10) / 10 : null,
      avg_grade: metricBucket.gradeCount ? Math.round((metricBucket.gradeSum / metricBucket.gradeCount) * 100) / 100 : null,
      avg_graduation_years: metricBucket.graduationDurationCount ? Math.round((metricBucket.graduationDurationSum / metricBucket.graduationDurationCount) * 10) / 10 : null,
      male_count: male,
      female_count: female,
      male_pct: totalGender ? Math.round((male / totalGender) * 1000) / 10 : 0,
      female_pct: totalGender ? Math.round((female / totalGender) * 1000) / 10 : 0,
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
    city_id: cityId || 0,
    city_name: cityLabel,
    mode: "count",
    total: matching.length,
    avg_age: metricBucket.ageCount ? Math.round((metricBucket.ageSum / metricBucket.ageCount) * 10) / 10 : null,
    avg_grade: metricBucket.gradeCount ? Math.round((metricBucket.gradeSum / metricBucket.gradeCount) * 100) / 100 : null,
    avg_graduation_years: metricBucket.graduationDurationCount ? Math.round((metricBucket.graduationDurationSum / metricBucket.graduationDurationCount) * 10) / 10 : null,
    male_count: metricBucket.male,
    female_count: metricBucket.female,
    male_pct: metricBucket.count ? Math.round((metricBucket.male / metricBucket.count) * 1000) / 10 : 0,
    female_pct: metricBucket.count ? Math.round((metricBucket.female / metricBucket.count) * 1000) / 10 : 0,
    labels,
    datasets: [{ key: "count", label: "Απόφοιτοι", values: counts }],
  });
}
