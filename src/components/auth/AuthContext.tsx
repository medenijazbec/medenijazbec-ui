import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readAuth, setFromAuthResponse, clearAuth, type AuthState } from "./auth";

type Ctx = AuthState & {
  setFromResponse: (res: { token: string; roles?: string[] }) => void;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => readAuth());

  useEffect(() => {
    const refresh = () => setState(readAuth());
    window.addEventListener("storage", refresh);
    window.addEventListener("hb:auth", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("hb:auth", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...state,
    setFromResponse: (res) => {
      setFromAuthResponse(res);
      setState(readAuth());
    },
    logout: () => {
      clearAuth();
      setState(readAuth());
    },
  }), [state]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
