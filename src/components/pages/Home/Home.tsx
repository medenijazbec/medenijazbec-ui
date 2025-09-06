// src/pages/Home.tsx
import styles from './Home.module.css';
import { useHomeLogic } from './Home.logic';
import AsciiBadger from '@/components/badger/AsciiBadger';

export default function Home() {
  useHomeLogic();
  return (
    <div className={styles.page}>
      <div className={styles.container}>
      
      </div>

      <AsciiBadger />

      {/* NEW footer so the page scrolls */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          © {new Date().getFullYear()} Medeni Jazbec — all rights reserved.
        </div>
      </footer>
    </div>
  );
}
