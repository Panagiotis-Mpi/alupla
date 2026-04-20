export { API_URL, clearToken, getToken, setToken, toQueryString } from "./apiCore";
import { API_URL, api, appendQuery, clearToken, fetchBlob, getToken, parseJsonSafe, setToken, toQueryString, type QueryParams } from "./apiCore";

export type UserRole = "super_admin" | "secretariat";
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
  code: string;
  name_el: string;
  name_en?: string | null;
  is_active: 0 | 1 | boolean;
};

export type ProgramDirection = {
  id: number;
  study_program_id: number;
  code: string;
  name_el: string;
  name_en?: string | null;
  is_active: 0 | 1 | boolean;
};

export type RegionType = "COUNTRY" | "PERIPHERY" | "CITY" | "FOREIGN_CITY";
export type Region = {
  id: number;
  name: string;
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
  program_direction_id?: number | null;
  origin_country?: string | null;
  origin_foreign_city?: string | null;
  origin_country_region_id?: number | null;
  origin_periphery_region_id?: number | null;
  origin_region_id?: number | null;
  origin_city_region_id?: number | null;
  origin_municipality?: string | null;
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
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  male_count?: number;
  female_count?: number;
  male_pct: number;
  female_pct: number;
  avg_age: number | null;
  avg_grade: number | null;
  avg_graduation_years: number | null;
  dominant_gender?: "M" | "F" | "balanced" | null;
  dominant_study_program?: string | null;
  dominant_direction?: string | null;
  dominant_recent_direction?: string | null;
  dominant_recent_direction_count?: number;
  recent_directions?: Array<{ id: number; label: string; count: number; pct: number }>;
};


export type MapCityPoint = {
  city_id: number;
  city_name: string;
  periphery_id: number | null;
  periphery_name: string;
  country_region_id?: number | null;
  country_name?: string | null;
  latitude: number;
  longitude: number;
  count: number;
  male_count?: number;
  female_count?: number;
  male_pct?: number;
  female_pct?: number;
  avg_age?: number | null;
  avg_grade?: number | null;
  avg_graduation_years?: number | null;
  dominant_gender?: "M" | "F" | "balanced" | null;
};

export type RegionCityMapItem = {
  city: string;
  count: number;
  male_count?: number;
  female_count?: number;
  male_pct: number;
  female_pct: number;
  avg_age: number | null;
  avg_grade: number | null;
  avg_graduation_years: number | null;
  dominant_gender?: "M" | "F" | "balanced" | null;
  dominant_recent_direction?: string | null;
  dominant_recent_direction_count?: number;
  recent_directions?: Array<{ id: number; label: string; count: number; pct: number }>;
};



type ApiMessage = { message?: string };
type ApiErrorShape = { error?: ApiMessage; message?: string };
type ApiOk = { ok: true };
type AuthResponse = ApiOk & { token: string; user: User };
type UserResponse = ApiOk & { user: User };
type ListResponse<T> = ApiOk & { items: T[]; total?: number; page?: number; pageSize?: number };
type ItemResponse<T> = ApiOk & { item: T };
type GraduatePayload = Partial<Omit<Graduate, "id">> & Record<string, unknown>;
type RegionListResponse = ApiOk & { items: Region[] };
type ActivityLogListResponse = ApiOk & { items: ActivityLog[]; total?: number; page?: number; pageSize?: number };
type ActivityLogFileSummaryResponse = ApiOk & { items: Array<{ name: string; count: number }>; total?: number };
type PublicStatsResponse = ApiOk & Record<string, unknown>;

function readApiErrorMessage(value: unknown, fallback: string) {
  const payload = value as ApiErrorShape | null;
  return String(payload?.error?.message || payload?.message || fallback).trim() || fallback;
}


export type MapYearRangeResponse = {
  ok: true;
  years: number[];
  min_year: number | null;
  max_year: number | null;
};

export type MapCityDetailResponse = {
  ok: true;
  city_id: number;
  city_name: string;
  mode: "count" | "dominant_gender" | "dominant_direction";
  total: number;
  labels?: string[];
  datasets?: Array<{ key: string; label: string; values: Array<number | null> }>;
  male_count?: number;
  female_count?: number;
  male_pct?: number;
  female_pct?: number;
  programs?: Array<{
    program_id: number;
    program_label: string;
    total: number;
    directions: Array<{ id: number; label: string; count: number }>;
  }>;
};



export async function login(email: string, password: string): Promise<AuthResponse> {
  return api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}


export async function register(first_name: string, last_name: string, email: string, password: string): Promise<AuthResponse> {
  return api("/auth/register", { method: "POST", body: { first_name, last_name, email, password } });
}


export async function requestPasswordReset(email: string): Promise<ApiOk & { reset_token?: string; reset_expires?: string }> {
  return api("/auth/forgot", { method: "POST", body: { email } });
}

export async function resetPassword(token: string, new_password: string): Promise<ApiOk> {
  return api("/auth/reset", { method: "POST", body: { token, new_password } });
}


export async function me(): Promise<UserResponse> {
  return api("/auth/me", { method: "GET" });
}


export async function updateProfile(payload: {
  first_name: string;
  last_name: string;
  email: string;
 }): Promise<UserResponse> {
  return api("/auth/me", { method: "PUT", body: payload });
}

export async function changePassword(
  currentPasswordOrPayload: string | { currentPassword: string; newPassword: string },
  maybeNewPassword?: string
): Promise<ApiOk> {
  const payload =
    typeof currentPasswordOrPayload === "string"
      ? { currentPassword: currentPasswordOrPayload, newPassword: maybeNewPassword || "" }
      : currentPasswordOrPayload;

  return api("/auth/change-password", {
    method: "POST",
    body: {
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    },
  });
}


export async function listUsers(): Promise<ListResponse<User>> {
  return api("/users", { method: "GET" });
}

export async function createUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  password: string;
 }): Promise<ItemResponse<User>> {
  return api("/users", { method: "POST", body: payload });
}

export async function updateUser(
  id: number,
  patch: Partial<Pick<User, "first_name" | "last_name" | "email" | "role" | "is_active">>
): Promise<ItemResponse<User>> {
  return api(`/users/${id}`, { method: "PUT", body: patch });
}

export async function deactivateUser(id: number): Promise<ApiOk> {
  return api(`/users/${id}`, { method: "DELETE" });
}

export async function pingPresence(): Promise<ApiOk> {
  return api("/presence/ping", { method: "POST" });
}

export async function listStudyPrograms(): Promise<ListResponse<StudyProgram>> {
  if (!getToken()) return api("/public/study-programs", { method: "GET" });
  try {
    return await api("/study-programs", { method: "GET" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/401|403|unauthorized|forbidden/i.test(message)) return api("/public/study-programs", { method: "GET" });
    throw error;
  }
}


export async function createStudyProgram(payload: {
  code: string;
  name_el: string;
  name_en?: string | null;
  is_active?: boolean;
}): Promise<ItemResponse<StudyProgram>> {
  return api("/study-programs", { method: "POST", body: payload });
}

export async function updateStudyProgram(
  id: number,
  payload: Partial<{ code: string; name_el: string; name_en?: string | null; is_active?: boolean }>
 ): Promise<ApiOk & { item?: StudyProgram }> {
  return api(`/study-programs/${id}`, { method: "PUT", body: payload });
}

export async function deleteStudyProgram(id: number): Promise<ApiOk> {
  return api(`/study-programs/${id}`, { method: "DELETE" });
}

export async function listProgramDirections(studyProgramId?: number | null): Promise<ListResponse<ProgramDirection>> {
  const qs = studyProgramId ? `?study_program_id=${encodeURIComponent(String(studyProgramId))}` : "";
  return api(`/program-directions${qs}`, { method: "GET" });
}


export async function createProgramDirection(payload: {
  study_program_id: number;
  code: string;
  name_el: string;
  name_en?: string | null;
  is_active?: boolean;
}): Promise<ItemResponse<ProgramDirection>> {
  return api("/program-directions", { method: "POST", body: payload });
}

export async function updateProgramDirection(
  id: number,
  payload: Partial<{ study_program_id: number; code: string; name_el: string; name_en?: string | null; is_active?: boolean }>
 ): Promise<ApiOk & { item?: ProgramDirection }> {
  return api(`/program-directions/${id}`, { method: "PUT", body: payload });
}

export async function deleteProgramDirection(id: number): Promise<ApiOk> {
  return api(`/program-directions/${id}`, { method: "DELETE" });
}


export async function importStudyProgramsFile(file: File): Promise<ApiOk & Record<string, unknown>> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/study-programs/import`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: fd
  });
  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = readApiErrorMessage(j, res.statusText);
    throw new Error(msg);
  }
  return await res.json();
}

export async function downloadStudyProgramsTemplateXlsx(lang?: string): Promise<Blob> {
  return fetchBlob("/study-programs/import-template", {}, lang);
}

export async function importProgramDirectionsFile(file: File): Promise<ApiOk & Record<string, unknown>> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/program-directions/import`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: fd
  });
  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = readApiErrorMessage(j, res.statusText);
    throw new Error(msg);
  }
  return await res.json();
}

export async function downloadProgramDirectionsTemplateXlsx(lang?: string): Promise<Blob> {
  return fetchBlob("/program-directions/import-template", {}, lang);
}

export async function listGraduates(params: QueryParams = {}): Promise<ListResponse<Graduate>> {
  return api(`/graduates${toQueryString(params)}`, { method: "GET" });
}

export async function getGraduate(id: number | string): Promise<ApiOk & { item: Graduate }> {
  return api(`/graduates/${id}`, { method: "GET" });
}

export async function createGraduate(payload: GraduatePayload): Promise<ApiOk & { item?: Graduate }> {
  return api(`/graduates`, { method: "POST", body: payload });
}

export async function updateGraduate(id: number | string, payload: GraduatePayload): Promise<ApiOk & { item?: Graduate }> {
  return api(`/graduates/${id}`, { method: "PUT", body: payload });
}

export async function deleteGraduate(id: number | string): Promise<ApiOk> {
  return api(`/graduates/${id}`, { method: "DELETE" });
}

export async function listRegions(parentIdOrParams: number | null | QueryParams = {}): Promise<RegionListResponse> {
  const params: QueryParams =
    typeof parentIdOrParams === "number" || parentIdOrParams === null
      ? { parent_id: parentIdOrParams }
      : parentIdOrParams || {};

  return api(`/regions${toQueryString(params)}`, { method: "GET" });
}

export async function listActivityLogs(params: QueryParams = {}): Promise<ActivityLogListResponse> {
  return api(`/activity-logs${toQueryString(params)}`, { method: "GET" });
}


export async function getActivityLogFileSummary(params: QueryParams = {}): Promise<ActivityLogFileSummaryResponse> {
  return api(`/activity-logs/file-summary${toQueryString(params)}`, { method: "GET" });
}


export async function getGraduatesMap(params: QueryParams = {}): Promise<{ ok: true; items: GraduatesMapItem[]; total: number }> {
  return api(`/map/graduates${toQueryString(params)}`, { method: "GET" });
}

export async function getMapYearRange(): Promise<MapYearRangeResponse> {
  return api(`/map/years`, { method: "GET" });
}

export async function getMapCities(params: QueryParams = {}): Promise<{ ok: true; items: MapCityPoint[] }> {
  return api(`/map/cities${toQueryString(params)}`, { method: "GET" });
}

export async function getRegionCitiesMap(params: QueryParams = {}): Promise<{ ok: true; items: RegionCityMapItem[] }> {
  return api(`/map/region-cities${toQueryString(params)}`, { method: "GET" });
}

export async function getMapCityDetail(params: QueryParams = {}): Promise<MapCityDetailResponse> {
  return api(`/map/city-detail${toQueryString(params)}`, { method: "GET" });
}

export function activityLogsExportUrl(format: "csv" | "xlsx", params: QueryParams = {}, lang?: string): string {
  const q = new URLSearchParams();
  appendQuery(q, params);

  if (lang) q.set("lang", lang);

  const token = getToken();
  if (token) q.set("token", token);

  const qs = q.toString();
  return `${API_URL}/activity-logs/export.${format}${qs ? `?${qs}` : ""}`;
}





export async function exportGraduatesFile(params: QueryParams, format: "xlsx" | "csv" | "pdf", lang?: string): Promise<Blob> {
  return fetchBlob("/graduates/export", { ...params, format }, lang);
}

export async function downloadGraduatesImportTemplate(format: "xlsx" | "csv", lang?: string): Promise<Blob> {
  return fetchBlob("/graduates/import-template", { format }, lang);
}

export async function logGraduatesPdfExport(params: QueryParams): Promise<ApiOk & { count?: number }> {
  return api("/graduates/export-pdf-log", { method: "POST", body: params });
}

export async function importGraduatesFile(file: File, lang?: string): Promise<ApiOk & Record<string, unknown>> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  if (lang) fd.append("lang", lang);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/graduates/import`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: fd
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : "";
    throw new Error(message);
  }

  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = readApiErrorMessage(j, `Import request failed (${res.status})`);
    throw new Error(msg);
  }

  const data = await parseJsonSafe(res);
  if (!data) {
    throw new Error("Invalid server response");
  }
  return data;
}

export async function getPublicStats(params: {
  graduation_year?: string;
  study_program_id?: string;
  gender?: string;
  age_group?: string;
} = { }): Promise<UserResponse> {
  return api(`/public/stats${toQueryString(params)}`, { method: "GET" });
}

export async function logPublicExport(action: "map_export" | "statistics_export", format: string): Promise<ApiOk> {
  return api("/public/activity-export", {
    method: "POST",
    body: { action, format },
  });
}

