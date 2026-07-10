// Συγκεντρώνει τις κλήσεις προς το backend API που χρησιμοποιούν οι σελίδες.
export type { QueryParams } from "./apiCore";
import {
  API_URL,
  api,
  fetchBlob,
  getToken,
  handleUnauthorizedResponse,
  parseJsonSafe,
  postBlob,
  toQueryString,
  type QueryParams,
} from "./apiCore";
import {
  clearCachedValues,
  privateApiMemoryCache,
  readCachedValue,
  writeCachedValue,
  type CacheStore,
} from "./cache";
import { getUser } from "./auth";

type UserRole = "super_admin" | "secretariat";
export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: 0 | 1 | boolean;
  created_at?: string;
  updated_at?: string;
  is_online?: boolean;
  last_seen_at?: string | null;
};

export type StudyProgram = {
  id: number;
  name_el: string;
  name_en?: string | null;
};

type RegionType = "COUNTRY" | "PERIPHERY" | "NOMOS" | "CITY";
export type Region = {
  id: number;
  name: string;
  name_el?: string | null;
  name_en?: string | null;
  type: RegionType;
  parent_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Graduate = {
  id: number;
  ad_code: string;
  last_name: string;
  first_name: string;
  father_name: string;
  degree_grade: number;
  graduation_date: string;
  oath_date: string;
  entry_year: number;
  student_number: string;
  birth_date: string;
  gender: "M" | "F";
  study_program_id: number;
  origin_location_id?: number | null;
  origin_country?: string | null;
  origin_foreign_city?: string | null;
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
  origin_country_name_en?: string | null;
  origin_region_name_en?: string | null;
  origin_nomos_name_en?: string | null;
  origin_city_name_en?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ActivityLog = {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user_email?: string | null;
};

export type AdminUser = User;

export type GraduatesMapItem = {
  periphery_id: number;
  periphery_name: string;
  periphery_name_el?: string | null;
  periphery_name_en?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  male_count?: number;
  female_count?: number;
  male_pct: number;
  female_pct: number;
  avg_age: number | null;
  min_age?: number | null;
  max_age?: number | null;
  avg_grade: number | null;
  avg_graduation_years: number | null;
  dominant_gender?: "M" | "F" | "balanced" | null;
  dominant_study_program?: string | null;
};

export type MapCityPoint = {
  city_id: number;
  city_name: string;
  city_name_el?: string | null;
  city_name_en?: string | null;
  map_group_key?: string | null;
  periphery_id: number | null;
  periphery_name: string;
  periphery_name_el?: string | null;
  periphery_name_en?: string | null;
  country_region_id?: number | null;
  country_name?: string | null;
  country_name_el?: string | null;
  country_name_en?: string | null;
  latitude: number;
  longitude: number;
  count: number;
  male_count?: number;
  female_count?: number;
  male_pct?: number;
  female_pct?: number;
  avg_age?: number | null;
  min_age?: number | null;
  max_age?: number | null;
  avg_grade?: number | null;
  avg_graduation_years?: number | null;
  dominant_gender?: "M" | "F" | "balanced" | null;
};

type ApiMessage = { message?: string };
type ApiErrorShape = { error?: ApiMessage; message?: string };
type ApiOk = { ok: true };
type AuthResponse = ApiOk & { token: string; user: User };
type UserResponse = ApiOk & { user: User };
type ListResponse<T> = ApiOk & {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};
type ItemResponse<T> = ApiOk & { item: T };
type GraduatePayload = Partial<Omit<Graduate, "id">> & Record<string, unknown>;
type RegionListResponse = ApiOk & { items: Region[] };
type ActivityLogListResponse = ApiOk & {
  items: ActivityLog[];
  total?: number;
  page?: number;
  pageSize?: number;
};
type ActivityLogFileSummaryResponse = ApiOk & {
  items: Array<{
    page: string;
    import: Record<string, number>;
    export: Record<string, number>;
  }>;
  total?: number;
};
type PublicStatsResponse = ApiOk & Record<string, unknown>;
export type ImportReport = ApiOk & {
  summary?: {
    inserted?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
    total?: number;
    total_rows?: number;
  };
  errors?: Array<Record<string, unknown>>;
  total_rows?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
};

function isOkResponse(value: unknown): value is ApiOk {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === true
  );
}

const PUBLIC_STATS_CACHE_MS = 5 * 60 * 1000;
const MAP_CACHE_MS = 3 * 60 * 1000;
const PROTECTED_CACHE_MS = 2 * 60 * 1000;
const USERS_CACHE_MS = 8 * 1000;
const LOGS_CACHE_MS = 15 * 1000;
const LOGS_SUMMARY_CACHE_MS = 30 * 1000;
const REFERENCE_CACHE_MS = 10 * 60 * 1000;
const publicStatsMemoryCache: CacheStore = new Map();
const mapMemoryCache: CacheStore = new Map();

function readPublicStatsCache(key: string) {
  return readCachedValue<PublicStatsResponse>(
    key,
    publicStatsMemoryCache,
    isOkResponse,
  );
}

function writePublicStatsCache(key: string, value: PublicStatsResponse) {
  writeCachedValue(key, publicStatsMemoryCache, value, PUBLIC_STATS_CACHE_MS);
}

function readMapCache<T>(key: string): T | null {
  return readCachedValue<T>(key, mapMemoryCache);
}

function writeMapCache<T>(key: string, value: T) {
  writeCachedValue(key, mapMemoryCache, value, MAP_CACHE_MS);
}

async function cachedMapApi<T>(path: string): Promise<T> {
  const key = `alupla:map:${path}`;
  const cached = readMapCache<T>(key);
  if (cached) return cached;
  const response = await api<T>(path, { method: "GET" });
  if (isOkResponse(response)) writeMapCache(key, response);
  return response;
}

function privateCacheUserPart() {
  const user = getUser();
  return user ? `user-${user.id}-${user.role}` : "guest";
}

function readProtectedCache<T>(key: string): T | null {
  return readCachedValue<T>(key, privateApiMemoryCache);
}

function writeProtectedCache<T>(key: string, value: T, ttlMs: number) {
  writeCachedValue(key, privateApiMemoryCache, value, ttlMs);
}

function clearCachedKeys(prefixes: string[]) {
  clearCachedValues(prefixes, [
    privateApiMemoryCache,
    publicStatsMemoryCache,
    mapMemoryCache,
  ]);
}

function clearGraduateRelatedCaches() {
  clearCachedKeys([
    "alupla:graduates:",
    "alupla:public-stats:",
    "alupla:map:",
    "alupla:logs:",
    "alupla:logs-summary:",
  ]);
}

function clearUserRelatedCaches() {
  clearCachedKeys(["alupla:users:", "alupla:logs:", "alupla:logs-summary:"]);
}

function clearActivityLogCaches() {
  clearCachedKeys(["alupla:logs:", "alupla:logs-summary:"]);
}

async function cachedPrivateApi<T>(
  scope: string,
  path: string,
  ttlMs: number,
): Promise<T> {
  const key = `alupla:${scope}:${privateCacheUserPart()}:${path}`;
  const cached = readProtectedCache<T>(key);
  if (cached) return cached;
  const response = await api<T>(path, { method: "GET" });
  if (isOkResponse(response)) writeProtectedCache(key, response, ttlMs);
  return response;
}

function readApiErrorMessage(value: unknown, fallback: string) {
  const payload = value as ApiErrorShape | null;
  return (
    String(payload?.error?.message || payload?.message || fallback).trim() ||
    fallback
  );
}

type MapYearRangeResponse = {
  ok: true;
  years: number[];
  min_year: number | null;
  max_year: number | null;
};

export type MapCityDetailResponse = {
  ok: true;
  city_id: number;
  city_name: string;
  city_name_el?: string | null;
  city_name_en?: string | null;
  map_group_key?: string | null;
  country_name?: string | null;
  country_name_el?: string | null;
  country_name_en?: string | null;
  mode: "count" | "dominant_gender";
  total: number;
  labels?: string[];
  datasets?: Array<{
    key: string;
    label: string;
    values: Array<number | null>;
  }>;
  male_count?: number;
  female_count?: number;
  male_pct?: number;
  female_pct?: number;
  avg_age?: number | null;
  avg_grade?: number | null;
  avg_graduation_years?: number | null;
};

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function me(): Promise<UserResponse> {
  return api("/auth/me", { method: "GET" });
}

export async function requestPasswordReset(email: string, language?: string): Promise<ApiOk & { mail_sent?: boolean }> {
  return api("/auth/forgot-password", {
    method: "POST",
    body: { email, language },
  });
}

export type PasswordResetAccount = {
  first_name: string;
  last_name: string;
  email: string;
};

export async function getPasswordResetAccount(token: string): Promise<ApiOk & { account: PasswordResetAccount }> {
  return api("/auth/reset-password/account", {
    method: "POST",
    body: { token },
  });
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
  repeatNewPassword: string;
}): Promise<ApiOk> {
  return api("/auth/reset-password", {
    method: "POST",
    body: {
      token: payload.token,
      new_password: payload.newPassword,
      repeat_new_password: payload.repeatNewPassword,
    },
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiOk> {
  return api("/auth/change-password", {
    method: "POST",
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  });
}

export async function listUsers(): Promise<ListResponse<User>> {
  return cachedPrivateApi("users", "/users", USERS_CACHE_MS);
}

export async function exportUsersFile(
  format: "csv" | "xlsx",
  lang?: string,
): Promise<Blob> {
  return fetchBlob(`/users/export.${format}`, {}, lang);
}

export async function createUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  language?: string;
}): Promise<ItemResponse<User> & { mail_sent?: boolean }> {
  const response = await api<ItemResponse<User> & { mail_sent?: boolean }>(
    "/users",
    { method: "POST", body: payload },
  );
  clearUserRelatedCaches();
  return response;
}

export async function updateUser(
  id: number,
  patch: Partial<
    Pick<User, "first_name" | "last_name" | "email" | "role" | "is_active">
  >,
  language?: string,
): Promise<ItemResponse<User>> {
  const response = await api<ItemResponse<User>>(
    `/users/${id}${toQueryString({ lang: language })}`,
    {
      method: "PUT",
      body: patch,
    },
  );
  clearUserRelatedCaches();
  return response;
}

export async function deactivateUser(id: number, language?: string): Promise<ApiOk> {
  const response = await api<ApiOk>(
    `/users/${id}${toQueryString({ lang: language })}`,
    { method: "DELETE" },
  );
  clearUserRelatedCaches();
  return response;
}

export async function pingPresence(): Promise<ApiOk> {
  return api("/presence/ping", { method: "POST" });
}

export async function listStudyPrograms(): Promise<ListResponse<StudyProgram>> {
  if (!getToken())
    return cachedPrivateApi(
      "references",
      "/public/study-programs?order=id",
      REFERENCE_CACHE_MS,
    );
  try {
    return await cachedPrivateApi(
      "references",
      "/study-programs?order=id",
      REFERENCE_CACHE_MS,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/401|403|unauthorized|forbidden/i.test(message))
      return api("/public/study-programs?order=id", { method: "GET" });
    throw error;
  }
}

export async function createStudyProgram(payload: {
  name_el: string;
  name_en?: string | null;
}): Promise<ItemResponse<StudyProgram>> {
  const response = await api<ItemResponse<StudyProgram>>("/study-programs", {
    method: "POST",
    body: payload,
  });
  clearCachedKeys([
    "alupla:references:",
    "alupla:graduates:",
    "alupla:public-stats:",
    "alupla:map:",
  ]);
  return response;
}

export async function updateStudyProgram(
  id: number,
  payload: Partial<{
    name_el: string;
    name_en?: string | null;
  }>,
): Promise<ApiOk & { item?: StudyProgram }> {
  const response = await api<ApiOk & { item?: StudyProgram }>(
    `/study-programs/${id}`,
    { method: "PUT", body: payload },
  );
  clearCachedKeys([
    "alupla:references:",
    "alupla:graduates:",
    "alupla:public-stats:",
    "alupla:map:",
  ]);
  return response;
}

export async function deleteStudyProgram(id: number): Promise<ApiOk> {
  const response = await api<ApiOk>(`/study-programs/${id}`, {
    method: "DELETE",
  });
  clearCachedKeys([
    "alupla:references:",
    "alupla:graduates:",
    "alupla:public-stats:",
    "alupla:map:",
  ]);
  return response;
}

export async function importStudyProgramsFile(
  file: File,
): Promise<ApiOk & Record<string, unknown>> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/study-programs/import`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fd,
  });
  handleUnauthorizedResponse(res);
  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = readApiErrorMessage(j, res.statusText);
    throw new Error(msg);
  }
  const data = await res.json();
  clearCachedKeys([
    "alupla:references:",
    "alupla:graduates:",
    "alupla:public-stats:",
    "alupla:map:",
  ]);
  return data;
}

export async function downloadStudyProgramsTemplateXlsx(
  lang?: string,
): Promise<Blob> {
  return fetchBlob("/study-programs/import-template", {}, lang);
}

export async function listGraduates(
  params: QueryParams = {},
): Promise<ListResponse<Graduate>> {
  const path = `/graduates${toQueryString(params)}`;
  return cachedPrivateApi("graduates", path, PROTECTED_CACHE_MS);
}

export async function getGraduate(
  id: number | string,
): Promise<ApiOk & { item: Graduate }> {
  return api(`/graduates/${id}`, { method: "GET" });
}

export async function createGraduate(
  payload: GraduatePayload,
): Promise<ApiOk & { item?: Graduate }> {
  const response = await api<ApiOk & { item?: Graduate }>(`/graduates`, {
    method: "POST",
    body: payload,
  });
  clearGraduateRelatedCaches();
  return response;
}

export async function updateGraduate(
  id: number | string,
  payload: GraduatePayload,
): Promise<ApiOk & { item?: Graduate }> {
  const response = await api<ApiOk & { item?: Graduate }>(`/graduates/${id}`, {
    method: "PUT",
    body: payload,
  });
  clearGraduateRelatedCaches();
  return response;
}

export async function deleteGraduate(id: number | string): Promise<ApiOk> {
  const response = await api<ApiOk>(`/graduates/${id}`, { method: "DELETE" });
  clearGraduateRelatedCaches();
  return response;
}

export async function deleteGraduates(
  ids: Array<number | string>,
): Promise<ApiOk & { deleted?: number }> {
  const response = await api<ApiOk & { deleted?: number }>(`/graduates/bulk`, {
    method: "DELETE",
    body: { ids },
  });
  clearGraduateRelatedCaches();
  return response;
}

export async function listRegions(
  parentIdOrParams: number | null | QueryParams = {},
): Promise<RegionListResponse> {
  const params: QueryParams =
    typeof parentIdOrParams === "number" || parentIdOrParams === null
      ? { parent_id: parentIdOrParams }
      : parentIdOrParams || {};

  const path = `/regions${toQueryString(params)}`;
  if (["NOMOS", "CITY"].includes(String(params.type || "")))
    return api(path, { method: "GET" });
  return cachedPrivateApi("references", path, REFERENCE_CACHE_MS);
}

export async function listActivityLogs(
  params: QueryParams = {},
): Promise<ActivityLogListResponse> {
  const path = `/activity-logs${toQueryString(params)}`;
  return cachedPrivateApi("logs", path, LOGS_CACHE_MS);
}

export async function getActivityLogFileSummary(
  params: QueryParams = {},
): Promise<ActivityLogFileSummaryResponse> {
  const path = `/activity-logs/file-summary${toQueryString(params)}`;
  return cachedPrivateApi("logs-summary", path, LOGS_SUMMARY_CACHE_MS);
}

export async function getGraduatesMap(
  params: QueryParams = {},
): Promise<{ ok: true; items: GraduatesMapItem[]; total: number }> {
  return cachedMapApi(`/map/graduates${toQueryString(params)}`);
}

export async function getMapSummary(
  params: QueryParams = {},
): Promise<{
  ok: true;
  items: GraduatesMapItem[];
  total: number;
  cities: MapCityPoint[];
}> {
  return cachedMapApi(`/map/summary${toQueryString(params)}`);
}

export async function getMapYearRange(): Promise<MapYearRangeResponse> {
  return cachedMapApi(`/map/years`);
}


export async function getMapCityDetail(
  params: QueryParams = {},
): Promise<MapCityDetailResponse> {
  return cachedMapApi(`/map/city-detail${toQueryString(params)}`);
}

export async function exportActivityLogsFile(
  format: "csv" | "xlsx",
  params: QueryParams = {},
  lang?: string,
): Promise<Blob> {
  return fetchBlob(`/activity-logs/export.${format}`, params, lang);
}

export async function exportGraduatesFile(
  params: QueryParams,
  format: "xlsx" | "csv" | "pdf",
  lang?: string,
): Promise<Blob> {
  return postBlob("/graduates/export", { ...params, format }, lang);
}

export async function downloadGraduatesImportTemplate(
  format: "xlsx" | "csv",
  lang?: string,
): Promise<Blob> {
  return fetchBlob("/graduates/import-template", { format }, lang);
}

export async function logGraduatesPdfExport(
  params: QueryParams,
): Promise<ApiOk & { count?: number }> {
  const response = await api<ApiOk & { count?: number }>(
    "/graduates/export-pdf-log",
    { method: "POST", body: params },
  );
  clearActivityLogCaches();
  return response;
}

export async function importGraduatesFile(
  file: File,
  lang?: string,
): Promise<ImportReport> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  if (lang) fd.append("lang", lang);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/graduates/import`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: fd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : "";
    throw new Error(message);
  }

  handleUnauthorizedResponse(res);

  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = readApiErrorMessage(j, `Import request failed (${res.status})`);
    throw new Error(msg);
  }

  const data = await parseJsonSafe(res);
  if (!data) {
    throw new Error("Invalid server response");
  }
  clearGraduateRelatedCaches();
  return data as ImportReport;
}

export async function getPublicStats(
  params: {
    graduation_year?: string;
    graduation_year_from?: string;
    graduation_year_to?: string;
    study_program_id?: string;
    gender?: string;
    age_group?: string;
    section?: string;
  } = {},
): Promise<PublicStatsResponse> {
  const path = `/public/stats${toQueryString(params)}`;
  const cacheKey = `alupla:public-stats:${path}`;
  const cached = readPublicStatsCache(cacheKey);
  if (cached) return cached;

  const response = (await api(path, { method: "GET" })) as PublicStatsResponse;
  if (response?.ok) writePublicStatsCache(cacheKey, response);
  return response;
}

export async function logPublicExport(
  action: "map_export" | "statistics_export",
  format: string,
  details: Record<string, unknown> = {},
): Promise<ApiOk> {
  const response = await api<ApiOk>("/public/activity-export", {
    method: "POST",
    body: { action, format, details },
  });
  clearActivityLogCaches();
  return response;
}
