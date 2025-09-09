export type AuthState = {
  token: string | null;
  roles: string[];
  email: string | null;
  isAuthed: boolean;
  isAdmin: boolean;
};

const TOKEN_KEY = "hb_token";
const ROLES_KEY = "hb_roles";

// UI-only decode (no signature validation)
function parseJwt(token: string): any | null {
  try {
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!base64) return null;
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function readAuth(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY);
  const roles = (localStorage.getItem(ROLES_KEY) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let email: string | null = null;
  if (token) {
    const payload = parseJwt(token);
    email = payload?.email ?? null;
  }

  return {
    token,
    roles,
    email,
    isAuthed: !!token,
    isAdmin: roles.includes("Admin"),
  };
}

export function setAuth(token: string, roles: string[]) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLES_KEY, roles.join(","));
  window.dispatchEvent(new Event("hb:auth"));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLES_KEY);
  window.dispatchEvent(new Event("hb:auth"));
}

export function setFromAuthResponse(res: { token: string; roles?: string[] }) {
  const roles = res.roles ?? [];
  setAuth(res.token, roles);
}
