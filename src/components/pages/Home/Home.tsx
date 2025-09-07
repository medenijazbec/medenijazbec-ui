import { useEffect, useState } from 'react';
import styles from './Home.module.css';
import AsciiBadger from '@/components/badger/AsciiBadger';
import DreamsHero from '@/components/branding/DreamsHero';
import MoltenTitle from '@/components/branding/MoltenTitle';

export default function Home() {
  const [showMolten, setShowMolten] = useState(false);
  const [reverseAscii, setReverseAscii] = useState(false);

  // Fired by DreamsHero when the ASCII outline fully reveals
  const handleAsciiRevealed = () => {
    setShowMolten(true);                 // pop the MoltenTitle in
    // After the MoltenTitle entrance finishes, reverse the ASCII outline
    setTimeout(() => setReverseAscii(true), 600); // match CSS transition below
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <DreamsHero onRevealDone={handleAsciiRevealed} reverse={reverseAscii} />
        <div className={`${styles.heroContent} ${showMolten ? styles.in : ''}`}>
          <MoltenTitle text="Medeni Jazbec" />
        </div>
      </section>

      <section className={styles.badger}>
        <AsciiBadger />
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          © {new Date().getFullYear()} Medeni Jazbec — all rights reserved.
        </div>
      </footer>
    </div>
  );
}
