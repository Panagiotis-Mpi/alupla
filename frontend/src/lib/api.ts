
export const API_URL: string = (() => {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal) return "/api";
  }
  return envUrl || "/api";
})();

const TOKEN_KEY = "alupla_token";

function migrateLegacyToken() {
  try {
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy && !sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(TOKEN_KEY, legacy);
    }
    if (legacy) localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

export function getToken(): string | null {
  migrateLegacyToken();
  const t = sessionStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  const v = t.trim();
  if (!v || v === "null" || v === "undefined") return null;
  return v;
}

export function setToken(token: string) {
  if (!token || token === "null" || token === "undefined") {
    sessionStorage.removeItem(TOKEN_KEY);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
    }
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

type ApiError = { message?: string } | string | null;

async function parseJsonSafe(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isJsonString(s: string): boolean {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function appendQuery(q: URLSearchParams, params: Record<string, any> = {}) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    q.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
}

function toQueryString(params: Record<string, any> = {}) {
  const q = new URLSearchParams();
  appendQuery(q, params);
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

async function fetchBlob(path: string, params: Record<string, any> = {}, lang?: string): Promise<Blob> {
  const q = new URLSearchParams();
  appendQuery(q, params);
  if (lang) q.set("lang", lang);

  const token = getToken();
  const qs = q.toString();
  const res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = (j as any)?.error?.message || (j as any)?.message || res.statusText;
    throw new Error(msg);
  }

  return res.blob();
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  const hasBody = init.body !== undefined && init.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    if (init.body instanceof FormData) {
    } else if (typeof init.body === "string") {
      if (isJsonString(init.body)) headers.set("Content-Type", "application/json");
      else headers.set("Content-Type", "text/plain;charset=UTF-8");
    } else if (typeof init.body === "object") {
      headers.set("Content-Type", "application/json");
      init = { ...init, body: JSON.stringify(init.body) };
    }
  } else if (hasBody && headers.get("Content-Type")?.includes("application/json") && typeof init.body === "object" && !(init.body instanceof FormData)) {
    init = { ...init, body: JSON.stringify(init.body) };
  }

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "omit",
  });

  const data = await parseJsonSafe(res);

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const err: ApiError = data?.error?.message || data?.message || res.statusText;
    throw new Error(typeof err === "string" ? err : err?.message || "Request failed");
  }

  return data as T;
}

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
  details: any;
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
  latitude: number;
  longitude: number;
  count: number;
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



export async function login(email: string, password: string): Promise<{ ok: true; token: string; user: any } | any> {
  return api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}


export async function register(first_name: string, last_name: string, email: string, password: string): Promise<any> {
  return api("/auth/register", { method: "POST", body: { first_name, last_name, email, password } });
}


export async function requestPasswordReset(email: string): Promise<any> {
  return api("/auth/forgot", { method: "POST", body: { email } });
}

export async function resetPassword(token: string, new_password: string): Promise<any> {
  return api("/auth/reset", { method: "POST", body: { token, new_password } });
}


export async function me(): Promise<any> {
  return api("/auth/me", { method: "GET" });
}


export async function updateProfile(payload: {
  first_name: string;
  last_name: string;
  email: string;
}): Promise<any> {
  return api("/auth/me", { method: "PUT", body: payload });
}

export async function changePassword(
  currentPasswordOrPayload: string | { currentPassword: string; newPassword: string },
  maybeNewPassword?: string
): Promise<any> {
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


export async function listUsers(): Promise<{ ok: true; items: User[] } | any> {
  return api("/users", { method: "GET" });
}

export async function createUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  password: string;
}): Promise<any> {
  return api("/users", { method: "POST", body: payload });
}

export async function updateUser(
  id: number,
  patch: Partial<Pick<User, "first_name" | "last_name" | "email" | "role" | "is_active">>
): Promise<any> {
  return api(`/users/${id}`, { method: "PUT", body: patch });
}

export async function deactivateUser(id: number): Promise<any> {
  return api(`/users/${id}`, { method: "DELETE" });
}

export async function pingPresence(): Promise<any> {
  return api("/presence/ping", { method: "POST" });
}

export async function listStudyPrograms(): Promise<{ ok: true; items: StudyProgram[] } | any> {
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
}): Promise<any> {
  return api("/study-programs", { method: "POST", body: payload });
}

export async function updateStudyProgram(
  id: number,
  payload: Partial<{ code: string; name_el: string; name_en?: string | null; is_active?: boolean }>
): Promise<any> {
  return api(`/study-programs/${id}`, { method: "PUT", body: payload });
}

export async function deleteStudyProgram(id: number): Promise<any> {
  return api(`/study-programs/${id}`, { method: "DELETE" });
}

export async function listProgramDirections(studyProgramId?: number | null): Promise<{ ok: true; items: ProgramDirection[] } | any> {
  const qs = studyProgramId ? `?study_program_id=${encodeURIComponent(String(studyProgramId))}` : "";
  return api(`/program-directions${qs}`, { method: "GET" });
}


export async function createProgramDirection(payload: {
  study_program_id: number;
  code: string;
  name_el: string;
  name_en?: string | null;
  is_active?: boolean;
}): Promise<any> {
  return api("/program-directions", { method: "POST", body: payload });
}

export async function updateProgramDirection(
  id: number,
  payload: Partial<{ study_program_id: number; code: string; name_el: string; name_en?: string | null; is_active?: boolean }>
): Promise<any> {
  return api(`/program-directions/${id}`, { method: "PUT", body: payload });
}

export async function deleteProgramDirection(id: number): Promise<any> {
  return api(`/program-directions/${id}`, { method: "DELETE" });
}


export async function importStudyProgramsFile(file: File): Promise<any> {
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
    const msg = (j as any)?.error?.message || (j as any)?.message || res.statusText;
    throw new Error(msg);
  }
  return await res.json();
}

export async function downloadStudyProgramsTemplateXlsx(lang?: string): Promise<Blob> {
  return fetchBlob("/study-programs/import-template", {}, lang);
}

export async function importProgramDirectionsFile(file: File): Promise<any> {
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
    const msg = (j as any)?.error?.message || (j as any)?.message || res.statusText;
    throw new Error(msg);
  }
  return await res.json();
}

export async function downloadProgramDirectionsTemplateXlsx(lang?: string): Promise<Blob> {
  return fetchBlob("/program-directions/import-template", {}, lang);
}

export async function listGraduates(params: Record<string, any> = {}): Promise<any> {
  return api(`/graduates${toQueryString(params)}`, { method: "GET" });
}

export async function getGraduate(id: number | string): Promise<any> {
  return api(`/graduates/${id}`, { method: "GET" });
}

export async function createGraduate(payload: any): Promise<any> {
  return api(`/graduates`, { method: "POST", body: payload });
}

export async function updateGraduate(id: number | string, payload: any): Promise<any> {
  return api(`/graduates/${id}`, { method: "PUT", body: payload });
}

export async function deleteGraduate(id: number | string): Promise<any> {
  return api(`/graduates/${id}`, { method: "DELETE" });
}

export async function listRegions(parentIdOrParams: any = {}): Promise<any> {
  const params: Record<string, any> =
    typeof parentIdOrParams === "number" || parentIdOrParams === null
      ? { parent_id: parentIdOrParams }
      : parentIdOrParams || {};

  return api(`/regions${toQueryString(params)}`, { method: "GET" });
}

export async function listActivityLogs(params: Record<string, any> = {}): Promise<any> {
  return api(`/activity-logs${toQueryString(params)}`, { method: "GET" });
}


export async function getActivityLogFileSummary(params: Record<string, any> = {}): Promise<any> {
  return api(`/activity-logs/file-summary${toQueryString(params)}`, { method: "GET" });
}


export async function getGraduatesMap(params: Record<string, any> = {}): Promise<{ ok: true; items: GraduatesMapItem[]; total: number } | any> {
  return api(`/map/graduates${toQueryString(params)}`, { method: "GET" });
}

export async function getMapCities(params: Record<string, any> = {}): Promise<{ ok: true; items: MapCityPoint[] } | any> {
  return api(`/map/cities${toQueryString(params)}`, { method: "GET" });
}

export async function getRegionCitiesMap(params: Record<string, any> = {}): Promise<{ ok: true; items: RegionCityMapItem[] } | any> {
  return api(`/map/region-cities${toQueryString(params)}`, { method: "GET" });
}

export async function getMapCityDetail(params: Record<string, any> = {}): Promise<MapCityDetailResponse | any> {
  return api(`/map/city-detail${toQueryString(params)}`, { method: "GET" });
}

export function activityLogsExportUrl(format: "csv" | "xlsx", params: Record<string, any> = {}, lang?: string): string {
  const q = new URLSearchParams();
  appendQuery(q, params);

  if (lang) q.set("lang", lang);

  const token = getToken();
  if (token) q.set("token", token);

  const qs = q.toString();
  return `${API_URL}/activity-logs/export.${format}${qs ? `?${qs}` : ""}`;
}





export async function exportGraduatesFile(params: Record<string, any>, format: "xlsx" | "csv" | "pdf", lang?: string): Promise<Blob> {
  return fetchBlob("/graduates/export", { ...params, format }, lang);
}

export async function downloadGraduatesImportTemplate(format: "xlsx" | "csv", lang?: string): Promise<Blob> {
  return fetchBlob("/graduates/import-template", { format }, lang);
}

export async function logGraduatesPdfExport(params: Record<string, any>): Promise<any> {
  return api("/graduates/export-pdf-log", { method: "POST", body: params });
}

export async function importGraduatesFile(file: File, lang?: string): Promise<any> {
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
  } catch (error: any) {
    const message = String(error?.message || "").trim() || "Request failed";
    throw new Error(message);
  }

  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = String((j as any)?.error?.message || (j as any)?.message || res.statusText || "").trim() || `Import request failed (${res.status})`;
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
} = {}): Promise<any> {
  return api(`/public/stats${toQueryString(params)}`, { method: "GET" });
}

export async function logPublicExport(action: "map_export" | "statistics_export", format: string): Promise<any> {
  return api("/public/activity-export", {
    method: "POST",
    body: { action, format },
  });
}

