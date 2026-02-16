export type Role = "secretariat" | "super_admin";

export type SessionUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
};

const KEY_TOKEN = "alupla_token";
const KEY_USER = "alupla_user";

export function getToken(): string | null {
  return localStorage.getItem(KEY_TOKEN);
}

export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(KEY_USER);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as SessionUser;
    if (u && (u.role === "secretariat" || u.role === "super_admin")) return u;
    return null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(KEY_TOKEN, token);
  localStorage.setItem(KEY_USER, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
}

// FIX: clearSession was broken (called setSession(null) and setToken(null) that doesn't exist here).
// Minimal, safe behavior: just remove stored session data.
export function clearSession() {
  logout();
}
