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

type ApiError = { message?: string } | string | null;

export async function parseJsonSafe(res: Response): Promise<any> {
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

export function appendQuery(params: URLSearchParams, values: Record<string, any> = {}) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
}

export function toQueryString(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  appendQuery(query, params);
  const value = query.toString();
  return value ? `?${value}` : "";
}

function normalizeRequestInit(init: RequestInit) {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body !== undefined && init.body !== null;
  let nextInit = init;

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

export async function fetchBlob(path: string, params: Record<string, any> = {}, lang?: string) {
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
    const message = data?.error?.message || data?.message || res.statusText;
    throw new Error(message);
  }

  return res.blob();
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const normalized = normalizeRequestInit(init);

  if (token) normalized.headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...normalized.init,
    headers: normalized.headers,
    credentials: "omit",
  });

  const data = await parseJsonSafe(res);

  if (res.status === 401) {
    clearToken();
  }

  if (!res.ok) {
    const error: ApiError = data?.error?.message || data?.message || res.statusText;
    throw new Error(typeof error === "string" ? error : error?.message || "Request failed");
  }

  return data as T;
}
