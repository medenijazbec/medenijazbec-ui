"use client";

import React from "react";
import styles from "./FooterMatrix.module.css";

type FooterMatrixProps = {
  /** If true, the footer overlays content (fixed, no spacer). */
  overlay?: boolean;
  className?: string;
};

export default function FooterMatrix({
  overlay = true,
  className = "",
}: FooterMatrixProps) {
  return (
    <>
      {!overlay && <div className={styles.bodyOffset} aria-hidden="true" />}

      <footer
        className={`${styles.footer} ${overlay ? styles.fixed : ""} ${className}`}
        role="contentinfo"
      >
        {/* Subtle nebula background layer */}
        <div className={styles.nebulas} aria-hidden="true">
          <span className={`${styles.nebula} ${styles.n1}`} />
          <span className={`${styles.nebula} ${styles.n2}`} />
          <span className={`${styles.nebula} ${styles.n3}`} />
          <span className={`${styles.nebula} ${styles.n4}`} />
          <span className={`${styles.nebula} ${styles.n5}`} />
        </div>

        {/* Foreground content */}
        <div className={styles.inner}>
          <span className={styles.copy}>© 2025 Medeni Jazbec — all rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
