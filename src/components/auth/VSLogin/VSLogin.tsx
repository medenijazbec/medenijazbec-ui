import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import styles from "./VSLogin.module.css";
import { http } from "@/api/api";
import yellowEmoji from "@/assets/yellow-emoji.gif";

type AuthResponse = {
  token: string;
  roles?: string[];
  expiresAt?: string | null;
  user?: { id: string; email?: string | null };
};

// lightweight JWT payload decode (UI only, no signature validation)
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

function rolesFrom(resp: AuthResponse): string[] {
  if (resp.roles?.length) return resp.roles;
  const payload = parseJwt(resp.token);
  const raw = payload?.role ?? payload?.roles;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [String(raw)];
}

export default function VSLogin() {
  const navigate = useNavigate();
  const [qs] = useSearchParams();
  const redirect = useMemo(() => qs.get("redirect") || "/admin/animgroups", [qs]);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const canSubmit = Boolean(email.trim()) && pw.length > 0 && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setMsg("");
    try {
      const res = await http.post<AuthResponse>("/api/auth/login", { email, password: pw });
      localStorage.setItem("hb_token", res.token);
      const roles = rolesFrom(res);
      localStorage.setItem("hb_roles", roles.join(","));
      //do not looad in local storage retard
      //if (res.user?.email || email) localStorage.setItem("hb_user_email", res.user?.email ?? email);

      navigate(redirect, { replace: true });
    } catch (err: any) {
      const apiErr = err?.response?.data;
      setMsg(typeof apiErr === "string" ? apiErr : "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit} aria-label="Login">
        <div
  className={styles.logo}
  style={{ width: "auto", height: "auto", display: "flex", alignItems: "center", gap: 8, padding: "4px 6px" }}
>

  <span>You're not supposed to be here</span>   
<img
  src={yellowEmoji}
  alt=""
  style={{
    width: 32,
    height: 32,
    objectFit: "cover",     // fills the circle edge-to-edge
    borderRadius: "50%",    // ← makes it a perfect circle
    border: "1px solid rgba(0,255,102,.35)", // (optional) green outline
    boxShadow: "0 0 8px rgba(0,255,102,.25)" // (optional) glow
  }}
/>

</div>
        <h1 className={styles.title}>Restricted access</h1>
        <p className={styles.sub}>
          Hidden portal • <span className={styles.hint}>/login</span>
        </p>

        <label className={styles.label}>
          Email
          <input
            type="email"
            className={styles.input}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@domain.com"
          />
        </label>

        <label className={styles.label}>
          Password
          <input
            type="password"
            className={styles.input}
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            placeholder="••••••••"
          />
        </label>

        {msg && <div className={styles.error}>{msg}</div>}

        <button className={styles.btn} disabled={!canSubmit}>
          {busy ? "Signing in…" : "Login"}
        </button>

        <div className={styles.links}>
          <Link to="/" className={styles.link}>Home</Link>
          <span className={styles.sep}>•</span>
          <Link to="/vg" className={styles.link}>Secret register</Link>
        </div>

        <div className={styles.footer}>
          If you're not supposed to be <b>here</b>, go see yourself out.
          <br></br><b>Scram.</b>
        </div>
      </form>
    </div>
  );
}
