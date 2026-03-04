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

// We store auth in sessionStorage so closing the browser (or rebooting) logs the user out.
// To avoid breaking existing installs, we transparently migrate any legacy localStorage
// session into sessionStorage on first access.
function migrateLegacyLocalStorageToSessionStorage() {
  try {
    const legacyToken = localStorage.getItem(KEY_TOKEN);
    const legacyUser = localStorage.getItem(KEY_USER);
    if (legacyToken && !sessionStorage.getItem(KEY_TOKEN)) {
      sessionStorage.setItem(KEY_TOKEN, legacyToken);
    }
    if (legacyUser && !sessionStorage.getItem(KEY_USER)) {
      sessionStorage.setItem(KEY_USER, legacyUser);
    }
    if (legacyToken || legacyUser) {
      localStorage.removeItem(KEY_TOKEN);
      localStorage.removeItem(KEY_USER);
    }
  } catch {
 // ignore
  }
}

export function getToken(): string | null {
  migrateLegacyLocalStorageToSessionStorage();
  return sessionStorage.getItem(KEY_TOKEN);
}

export function getUser(): SessionUser | null {
  migrateLegacyLocalStorageToSessionStorage();
  const raw = sessionStorage.getItem(KEY_USER);
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
  sessionStorage.setItem(KEY_TOKEN, token);
  sessionStorage.setItem(KEY_USER, JSON.stringify(user));
 // ensure no legacy leftovers
  try {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  } catch {
 // ignore
  }
}

export function logout() {
  sessionStorage.removeItem(KEY_TOKEN);
  sessionStorage.removeItem(KEY_USER);
  try {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  } catch {
 // ignore
  }
}

export function clearSession() {
  logout();
}
