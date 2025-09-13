import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

import Navbar from '@/components/navbar/Navbar';
import AsciiBadger from '@/components/badger/AsciiBadger';
import DreamsHero from '@/components/branding/DreamsHero';
import MoltenTitle from '@/components/branding/MoltenTitle';
import FooterMatrix from '@/components/Footer/FooterMatrix';

export default function Home() {
  const [showMolten, setShowMolten] = useState(false);
  const [reverseAscii, setReverseAscii] = useState(false);
  const navigate = useNavigate();

  // Section refs for navbar navigation (Fitness/About still scroll; Projects routes out)
  const fitnessRef = useRef<HTMLDivElement | null>(null);
  const projectsRef = useRef<HTMLDivElement | null>(null); // kept in case you still want an in-page section
  const aboutRef = useRef<HTMLDivElement | null>(null);

  // Fired by DreamsHero when the ASCII outline fully reveals
  const handleAsciiRevealed = () => {
    setShowMolten(true); // pop the MoltenTitle in
    // After the MoltenTitle entrance finishes, reverse the ASCII outline
    setTimeout(() => setReverseAscii(true), 600);
  };

  // Hook up Navbar buttons
  // - Projects: navigate to /projects (router)
  // - Fitness/About: smooth-scroll to section
  const handleNavigate = (to: 'fitness' | 'projects' | 'about') => {
    switch (to) {
      case 'projects':
        navigate('/projects');
        return;
      case 'fitness':
        fitnessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      case 'about':
        aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
  };

  return (
    <div className={styles.page}>
      {/* Blurred, fixed, edge-to-edge navbar overlaying the scene */}
      <Navbar overlay brand="medenijazbec.pro" onNavigate={handleNavigate} />

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



      {/* PROJECTS (still present visually on home if you want it) */}
      <section ref={projectsRef} id="projects" className={styles.badger}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Projects (preview)</h2>
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
      <FooterMatrix overlay={false} />
     
    </div>
  );
}
