import React from "react";
import Navbar from "@/components/navbar/Navbar";
import { useAuth } from "@/components/auth/AuthContext";
import styles from "./AdminShowcase.module.css";

const AdminShowcase: React.FC = () => {
  const { isAuthed, isAdmin, email } = useAuth();

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        {!isAuthed ? (
          <div className={styles.card}>Not logged in.</div>
        ) : isAdmin ? (
          <div className={styles.card}>
            <h1>Admin Showcase</h1>
            <p>Logged in as <b>admin</b>: <span className={styles.email}>{email ?? "unknown"}</span></p>
          </div>
        ) : (
          <div className={styles.card}>You’re logged in, but not an admin.</div>
        )}
      </main>
    </div>
  );
};

export default AdminShowcase;
