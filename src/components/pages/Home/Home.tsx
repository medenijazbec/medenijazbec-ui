import styles from './Home.module.css';
import { useHomeLogic } from './Home.logic';
import AsciiBadger from '@/components/badger/AsciiBadger';
import DreamsHero from '@/components/branding/DreamsHero';
import MoltenTitle from '@/components/branding/MoltenTitle';

export default function Home() {
  useHomeLogic();

  return (
    <div className={styles.page}>
      {/* HERO — background swirl fills, CRT limited to hero, title sits above CRT */}
      <section className={styles.hero}>
        <DreamsHero />
        <div className={styles.heroContent}>
          <MoltenTitle text="Medeni Jazbec" />
        </div>
      </section>

      {/* 3D ASCII badger plays after scrolling past the hero */}
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
