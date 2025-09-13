import React from 'react';
import Navbar from '@/components/navbar/Navbar';
import styles from './Fitness.module.css';
import ShealthHistoryModule from './ShealthHistoryModule';
import FooterMatrix from '@/components/Footer/FooterMatrix';

export default function FitnessPage() {
  return (
    <div className={`${styles.page} ${styles.pageWide}`}> {/* add pageWide to widen container */}
      <Navbar overlay brand="medenijazbec.pro" />

      {/* Glowing nebula field (visual-only) */}
      <div className={styles.nebulaField} aria-hidden="true">
        <span className={`${styles.nebula} ${styles.n1}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n2}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n3}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n4}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n5}`}><i className={styles.blob}/></span>
        <span className={`${styles.nebula} ${styles.n6}`}><i className={styles.blob}/></span>
      </div>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.h1}>Fitness</h1>

          {/* Lightweight intro text only */}
          <div className={styles.card}>
            <div className={styles.muted}>
              Samsung Health history overview with hover zoom. Explore monthly totals and per-day details, plus top days by steps and distance.
            </div>
          </div>
          {/* 3D RENDRING <ShealthIso3D metric="steps" /> */}
          
          {/* All logic & rendering lives in the module */}
          <ShealthHistoryModule />
        </div>
      </main>
      <FooterMatrix overlay={false} />
    </div>
  );
}
