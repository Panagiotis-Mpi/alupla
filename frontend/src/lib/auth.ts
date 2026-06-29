// Αποθηκεύει και διαβάζει στοιχεία σύνδεσης χρήστη από το browser.
import { clearPrivateCachedValues } from "./cache";

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
const SESSION_EVENT = "alupla:session-change";

function notifySessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

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
  clearPrivateCachedValues();
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  clearLegacyStorage();
  notifySessionChange();
}

export function logout() {
  clearPrivateCachedValues();
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  clearLegacyStorage();
  notifySessionChange();
}

export function subscribeSessionChange(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}
