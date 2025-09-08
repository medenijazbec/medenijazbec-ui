import { useRef, useState } from 'react';
import styles from './Home.module.css';

import Navbar from '@/components/navbar/Navbar';
import AsciiBadger from '@/components/badger/AsciiBadger';
import DreamsHero from '@/components/branding/DreamsHero';
import MoltenTitle from '@/components/branding/MoltenTitle';

export default function Home() {
  const [showMolten, setShowMolten] = useState(false);
  const [reverseAscii, setReverseAscii] = useState(false);

  // Section refs for navbar navigation
  const fitnessRef = useRef<HTMLDivElement | null>(null);
  const projectsRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);

  // Fired by DreamsHero when the ASCII outline fully reveals
  const handleAsciiRevealed = () => {
    setShowMolten(true); // pop the MoltenTitle in
    // After the MoltenTitle entrance finishes, reverse the ASCII outline
    setTimeout(() => setReverseAscii(true), 600);
  };

  // Hook up Navbar buttons to page sections
  const handleNavigate = (to: 'fitness' | 'projects' | 'about') => {
    const node =
      (to === 'fitness' && fitnessRef.current) ||
      (to === 'projects' && projectsRef.current) ||
      (to === 'about' && aboutRef.current);

    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={styles.page}>
      {/* Transparent, fixed, edge-to-edge navbar */}
      <Navbar brand="medenijazbec.pro" onNavigate={handleNavigate} />

      {/* HERO */}
      <section className={styles.hero}>
        <DreamsHero
          onRevealDone={handleAsciiRevealed}
          reverse={reverseAscii}
          leadMs={200}
        />
        <div className={`${styles.heroContent} ${showMolten ? styles.in : ''}`}>
          <MoltenTitle text="Medeni Jazbec" />
        </div>
      </section>

      {/* FITNESS (anchor for the nav) */}
      <section ref={fitnessRef} id="fitness" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Fitness</h2>
          <p className={styles.muted}>
            Your fitness content goes here. Hook this up to your real section whenever
            you’re ready.
          </p>
        </div>
      </section>

      {/* PROJECTS (uses your ASCII badger as a visual) */}
      <section ref={projectsRef} id="projects" className={styles.badger}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Projects</h2>
        </div>
        <AsciiBadger />
      </section>

      {/* ABOUT */}
      <section ref={aboutRef} id="about" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>About</h2>
          <p className={styles.muted}>
            Brief bio, tools you enjoy, and links. This anchors the navbar’s “About”
            button and can be replaced with your real content.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          © {new Date().getFullYear()} Medeni Jazbec — all rights reserved.
        </div>
      </footer>
    </div>
  );
}
