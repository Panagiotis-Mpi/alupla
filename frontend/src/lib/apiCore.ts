// Κεντρικός μηχανισμός για HTTP requests, token και χειρισμό απαντήσεων API.
export const API_URL: string = (() => {
  const env = import.meta.env as { VITE_API_URL?: string } | undefined;
  const envUrl = env?.VITE_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal) return "/api";
  }
  return envUrl || "/api";
})();

const TOKEN_KEY = "alupla_token";

function moveLegacyToken() {
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
  moveLegacyToken();
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const normalized = token.trim();
  if (!normalized || normalized === "null" || normalized === "undefined") return null;
  return normalized;
}

export function setToken(token: string) {
  if (!token || token === "null" || token === "undefined") {
    clearToken();
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

type JsonRecord = Record<string, unknown>;
export type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;
export type QueryParams = Record<string, QueryValue>;
export type ApiRequestInit = Omit<RequestInit, "body"> & { body?: unknown };

function apiErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as { error?: unknown; message?: unknown };
    if (record.error && typeof record.error === "object") {
      const message = (record.error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return fallback;
}

export async function parseJsonSafe<T = JsonRecord>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function looksLikeJson(value: string) {
  const text = value.trim();
  return (text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"));
}

export function appendQuery(params: URLSearchParams, values: QueryParams = {}) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
}

export function toQueryString(params: QueryParams = {}) {
  const query = new URLSearchParams();
  appendQuery(query, params);
  const value = query.toString();
  return value ? `?${value}` : "";
}

function normalizeRequestInit(init: ApiRequestInit) {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body !== undefined && init.body !== null;
  let nextInit: ApiRequestInit = init;

  headers.set("Accept", "application/json");

  if (!hasBody) {
    return { headers, init: nextInit };
  }

  if (!headers.has("Content-Type")) {
    if (init.body instanceof FormData) {
      return { headers, init: nextInit };
    }
    if (typeof init.body === "string") {
      headers.set("Content-Type", looksLikeJson(init.body) ? "application/json" : "text/plain;charset=UTF-8");
      return { headers, init: nextInit };
    }
    if (typeof init.body === "object") {
      headers.set("Content-Type", "application/json");
      nextInit = { ...init, body: JSON.stringify(init.body) };
      return { headers, init: nextInit };
    }
    return { headers, init: nextInit };
  }

  if (
    headers.get("Content-Type")?.includes("application/json") &&
    typeof init.body === "object" &&
    !(init.body instanceof FormData)
  ) {
    nextInit = { ...init, body: JSON.stringify(init.body) };
  }

  return { headers, init: nextInit };
}

export async function fetchBlob(path: string, params: QueryParams = {}, lang?: string) {
  const query = new URLSearchParams();
  appendQuery(query, params);
  if (lang) query.set("lang", lang);

  const token = getToken();
  const queryString = query.toString();
  const res = await fetch(`${API_URL}${path}${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(apiErrorMessage(data, res.statusText));
  }

  return res.blob();
}

export async function postBlob(path: string, body: QueryParams = {}, lang?: string) {
  const token = getToken();
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(lang ? { ...body, lang } : body),
  });

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(apiErrorMessage(data, res.statusText));
  }

  return res.blob();
}

export async function api<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const token = getToken();
  const normalized = normalizeRequestInit(init);

  if (token) normalized.headers.set("Authorization", `Bearer ${token}`);

  const requestInit: RequestInit = {
    ...(normalized.init as RequestInit),
    headers: normalized.headers,
    credentials: "omit",
  };

  const res = await fetch(`${API_URL}${path}`, requestInit);

  const data = await parseJsonSafe(res);

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    throw new Error(apiErrorMessage(data, res.statusText));
  }

  return data as T;
}
