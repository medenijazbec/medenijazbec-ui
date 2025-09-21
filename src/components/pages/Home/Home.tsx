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

  const fitnessRef = useRef<HTMLDivElement | null>(null);
  const projectsRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);

  const handleAsciiRevealed = () => {
    setShowMolten(true);
    setTimeout(() => setReverseAscii(true), 600);
  };

  const handleNavigate = (to: 'fitness' | 'projects' | 'about') => {
    switch (to) {
      case 'projects': navigate('/projects'); return;
      case 'fitness':  fitnessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
      case 'about':    aboutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    }
  };

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" onNavigate={handleNavigate} />

      {/* HERO */}
      <section className={styles.hero}>
        <DreamsHero onRevealDone={handleAsciiRevealed} reverse={reverseAscii} leadMs={200} />
        <div className={`${styles.heroContent} ${showMolten ? styles.in : ''}`}>
          <MoltenTitle text="Medeni Jazbec" />
        </div>
      </section>

{/* splitter */}
<section className={styles.splitterArea}>
  <button
    type="button"
    className={styles.splitterBtn}
    onClick={() => projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
  >
    Scroll Down
  </button>
</section>



      {/* PROJECTS (split: left = badger full-bleed, right = panel) */}
      <section ref={projectsRef} id="projects" className={`${styles.badger} ${styles.split}`}>
        <div className={styles.badgerPane}>
          <div className={styles.badgerFrame}>
            <AsciiBadger />
           

          </div>
        </div>

        <aside className={styles.sidePane}>
          <div className={styles.sideInner}>
            <h2 className={styles.sectionTitle}>Meet the Badger</h2>
            <p className={styles.muted}>
              This little gremlin loves breakdancing and combat drills. Click the badger to trigger a
              random move—then it’ll chill back to its idle loop.
            </p>

            <form className={styles.promptCard} onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="badgerPrompt" className={styles.promptLabel}>Talk to the badger</label>
              <div className={styles.promptRow}>
                <input id="badgerPrompt" className={styles.promptInput} placeholder="(coming soon) say hi..." disabled />
                <button className={styles.promptBtn} disabled>Send</button>
              </div>
              <small className={styles.promptHint}>Chat is not wired up yet.</small>
            </form>
          </div>
        </aside>
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
