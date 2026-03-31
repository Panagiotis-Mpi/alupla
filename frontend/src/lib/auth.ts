export type Role = "secretariat" | "super_admin";

export type SessionUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
};

const TOKEN_KEY = "alupla_token";
const USER_KEY = "alupla_user";

function clearLegacyStorage() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

function moveLegacySessionData() {
  try {
    const legacyToken = localStorage.getItem(TOKEN_KEY);
    const legacyUser = localStorage.getItem(USER_KEY);

    if (legacyToken && !sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.setItem(TOKEN_KEY, legacyToken);
    }

    if (legacyUser && !sessionStorage.getItem(USER_KEY)) {
      sessionStorage.setItem(USER_KEY, legacyUser);
    }

    if (legacyToken || legacyUser) {
      clearLegacyStorage();
    }
  } catch {}
}

export function getToken(): string | null {
  moveLegacySessionData();
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  moveLegacySessionData();
  const raw = sessionStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw) as SessionUser;
    return user && (user.role === "secretariat" || user.role === "super_admin") ? user : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  clearLegacyStorage();
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  clearLegacyStorage();
}

