// API helpers for ALUPLA frontend (Vite + TS).
// Centralizes token handling and request defaults for backend endpoints.

export const API_URL: string = (() => {
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  // Use relative proxy by default in the browser to avoid cross-origin issues on deployments.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal) return "/api";
  }
  return envUrl || "/api";
})();

const TOKEN_KEY = "alupla_token";

// Keep the token in sessionStorage so closing the browser logs the user out.
// If a legacy token exists in localStorage, migrate it once.
function migrateLegacyToken() {
  try {
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy && !sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(TOKEN_KEY, legacy);
    }
    if (legacy) localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
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
      // ignore
    }
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
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

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  // If we have a body and Content-Type wasn't set, choose a reasonable default.
  const hasBody = init.body !== undefined && init.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    if (init.body instanceof FormData) {
      // Let the browser set the multipart boundary.
    } else if (typeof init.body === "string") {
      if (isJsonString(init.body)) headers.set("Content-Type", "application/json");
      else headers.set("Content-Type", "text/plain;charset=UTF-8");
    } else if (typeof init.body === "object") {
      headers.set("Content-Type", "application/json");
      init = { ...init, body: JSON.stringify(init.body) };
    }
  } else if (hasBody && headers.get("Content-Type")?.includes("application/json") && typeof init.body === "object" && !(init.body instanceof FormData)) {
    // If user passed an object but already set JSON content-type, stringify it.
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
    // Token expired/invalid: drop it so the UI can redirect to login.
    clearToken();
  }

  if (!res.ok) {
    const err: ApiError = data?.error?.message || data?.message || res.statusText;
    throw new Error(typeof err === "string" ? err : err?.message || "Request failed");
  }

  return data as T;
}

// ---------- Types (lightweight) ----------
export type UserRole = "super_admin" | "secretariat";
export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: 0 | 1 | boolean;
  email_verified: 0 | 1 | boolean;
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

export type RegionType = "PERIPHERY" | "NOMOS" | "DIMOS" | "CITY";
export type Region = {
  id: number;
  name: string;
  type: RegionType;
  parent_id?: number | null;
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
  // NOTE: Source of truth is the DB schema (alupla.sql) which uses birth_year.
  // We keep birth_date optional for backwards-compatibility with older deployments.
  birth_year?: number;
  birth_date?: string; // YYYY-MM-DD (legacy)
  gender: "M" | "F";
  study_program_id: number;
  program_direction_id?: number | null;
  origin_region_id?: number | null;
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

export type GraduatesMapItem = {
  periphery_id: number;
  periphery_name: string;
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  male_pct: number;
  female_pct: number;
  avg_age: number | null;
};

// ---------- Auth ----------
export async function login(email: string, password: string): Promise<{ ok: true; token: string; user: any } | any> {
  return api("/auth/login", {
    method: "POST",
    body: { email, password }, // object is ok; api() will JSON.stringify + set Content-Type
  });
}


export async function register(first_name: string, last_name: string, email: string, password: string): Promise<any> {
  return api("/auth/register", { method: "POST", body: { first_name, last_name, email, password } });
}

export async function verifyEmail(token: string): Promise<any> {
  const t = encodeURIComponent(token);
  return api(`/auth/verify?token=${t}`, { method: "GET" });
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

// Overload-friendly: changePassword({currentPassword,newPassword}) OR changePassword(currentPassword,newPassword)
export async function changePassword(
  currentPasswordOrPayload: string | { currentPassword: string; newPassword: string },
  maybeNewPassword?: string
): Promise<any> {
  const payload =
    typeof currentPasswordOrPayload === "string"
      ? { currentPassword: currentPasswordOrPayload, newPassword: maybeNewPassword || "" }
      : currentPasswordOrPayload;

  // Backend expects snake_case:
  return api("/auth/change-password", {
    method: "POST",
    body: {
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    },
  });
}

// ---------- Presence (live online) ----------
export async function presencePing(): Promise<any> {
  return api("/presence/ping", { method: "POST" });
}

export async function listOnlineUsers(): Promise<{ ok: true; onlineIds: number[] } | any> {
  return api("/presence/online", { method: "GET" });
}

// ---------- Users (super_admin) ----------
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
  patch: Partial<Pick<User, "first_name" | "last_name" | "email" | "role" | "is_active" | "email_verified">>
): Promise<any> {
  return api(`/users/${id}`, { method: "PUT", body: patch });
}

export async function deactivateUser(id: number): Promise<any> {
  return api(`/users/${id}/deactivate`, { method: "POST" });
}

// ---------- Study Programs / Directions ----------
export async function listStudyPrograms(): Promise<{ ok: true; items: StudyProgram[] } | any> {
  return api("/study-programs", { method: "GET" });
}

export async function listProgramDirections(studyProgramId?: number | null): Promise<{ ok: true; items: ProgramDirection[] } | any> {
  const qs = studyProgramId ? `?study_program_id=${encodeURIComponent(String(studyProgramId))}` : "";
  return api(`/program-directions${qs}`, { method: "GET" });
}

// ---------- Graduates ----------
export async function listGraduates(params: Record<string, any> = {}): Promise<any> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const qs = q.toString();
  return api(`/graduates${qs ? `?${qs}` : ""}`, { method: "GET" });
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

// ---------- Regions ----------
// Backwards-compatible: listRegions(parentId) OR listRegions({ parent_id, type, q, ... })
export async function listRegions(parentIdOrParams: any = {}): Promise<any> {
  const params: Record<string, any> =
    typeof parentIdOrParams === "number" || parentIdOrParams === null
      ? { parent_id: parentIdOrParams }
      : parentIdOrParams || {};

  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const qs = q.toString();
  return api(`/regions${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function searchRegions(params: { q?: string; type?: string; parent_id?: number | null } = {}): Promise<any> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const qs = q.toString();
  return api(`/regions/search${qs ? `?${qs}` : ""}`, { method: "GET" });
}

// ---------- Activity Logs ----------
export async function listActivityLogs(params: Record<string, any> = {}): Promise<any> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const qs = q.toString();
  return api(`/activity-logs${qs ? `?${qs}` : ""}`, { method: "GET" });
}

// ---------- Map (graduates distribution) ----------
export async function getGraduatesMap(params: Record<string, any> = {}): Promise<{ ok: true; items: GraduatesMapItem[]; total: number } | any> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  const qs = q.toString();
  return api(`/map/graduates${qs ? `?${qs}` : ""}`, { method: "GET" });
}

// Export CSV as a simple link. Because a normal <a href> can't send the Authorization header,
// we also include the token as a query param (backend accepts it).
export function activityLogsExportUrl(params: Record<string, any> = {}): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });

  const token = getToken();
  if (token) q.set("token", token);

  const qs = q.toString();
  return `${API_URL}/activity-logs/export.csv${qs ? `?${qs}` : ""}`;
}


export async function resendVerification(email: string): Promise<any> {
  return api("/auth/resend-verify", { method: "POST", body: { email } });
}



export async function exportGraduatesXlsx(params: Record<string, any>): Promise<Blob> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const token = getToken();
  const res = await fetch(`${API_URL}/graduates/export?${q.toString()}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    const j = await parseJsonSafe(res);
    const msg = (j as any)?.error?.message || (j as any)?.message || res.statusText;
    throw new Error(msg);
  }
  return await res.blob();
}



export async function importGraduatesXlsx(file: File): Promise<any> {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/graduates/import`, {
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

// ---------- Public (no-auth) endpoints ----------
export async function getPublicStudyPrograms(): Promise<{ ok: true; items: StudyProgram[] } | any> {
  return api("/public/study-programs", { method: "GET" });
}

export async function getPublicStats(params: {
  graduation_year?: string;
  study_program_id?: string;
  gender?: string;
  age_group?: string;
}): Promise<any> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return api(`/public/stats${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getPublicMap(params: {
  graduation_year?: string;
  study_program_id?: string;
  gender?: string;
  age_group?: string;
}): Promise<any> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return api(`/public/map${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export function publicAnonExportUrl(params: {
  graduation_year?: string;
  study_program_id?: string;
  gender?: string;
  age_group?: string;
}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  return `${API_URL}/public/anonymous-graduates.csv${qs ? `?${qs}` : ""}`;
}

