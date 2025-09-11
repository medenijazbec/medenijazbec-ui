import React, { useState } from "react";
import Navbar from "@/components/navbar/Navbar";
import { useAuth } from "@/components/auth/AuthContext";
import styles from "./AdminShowcase.module.css";

import Dashboard from "./pages/Dashboard";
import Traffic from "./pages/Traffic";
import Accounts from "./pages/Accounts";
import Security from "./pages/Security";
import Logs from "./pages/Logs";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

const TABS = [
  { key: "dash", label: "Dashboard" },
  { key: "traffic", label: "Traffic" },
  { key: "accounts", label: "Accounts" },
  { key: "security", label: "Security" },
  { key: "logs", label: "Logs" },
];

const AdminShowcase: React.FC = () => {
  const { isAuthed, isAdmin, email } = useAuth();
  const [tab, setTab] = useState<string>("dash");

  if (!isAuthed) {
    return (
      <div className={styles.page}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}><div className={styles.card}>Not logged in.</div></main>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}><div className={styles.card}>You’re logged in, but not an admin.</div></main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.nav} role="tablist" aria-label="Admin">
          {TABS.map(t => (
            <button key={t.key} role="tab" className={styles.tab}
              aria-current={tab === t.key ? "page" : undefined}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
          <span style={{ marginLeft: "auto", opacity:.85 }}>
            Logged in as <b>admin</b>: <span className={styles.email}>{email ?? "unknown"}</span>
          </span>
        </div>

        {tab === "dash" && <Dashboard />}
        {tab === "traffic" && <Traffic />}
        {tab === "accounts" && <Accounts />}
        {tab === "security" && <Security />}
        {tab === "logs" && <Logs />}
      </main>
    </div>
  );
};

export default AdminShowcase;
