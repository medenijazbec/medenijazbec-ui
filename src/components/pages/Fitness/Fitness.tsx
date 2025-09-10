import React from 'react';
import Navbar from '@/components/navbar/Navbar';
import styles from './Fitness.module.css';
import ShealthHistoryModule from './ShealthHistoryModule';
import ShealthIso3D from './ShealthIso3D';

export default function FitnessPage() {
  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
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
    </div>
  );
}
