import React from "react";
import { useAuth } from "@/components/auth/AuthContext";
import styles from "./AdminStatus.module.css";

const AdminStatus: React.FC = () => {
  const { isAuthed, isAdmin, email } = useAuth();

  if (!isAuthed || !isAdmin) return null;
  return (
    <div className={styles.badge} aria-live="polite">
      Logged in as <b>admin</b>: <span className={styles.email}>{email ?? "unknown"}</span>
    </div>
  );
};

export default AdminStatus;
