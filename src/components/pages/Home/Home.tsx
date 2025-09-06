import styles from './Home.module.css';
import { useHomeLogic } from './Home.logic';
import AsciiBadger from '@/components/badger/AsciiBadger';



export default function Home() {
useHomeLogic();
return (
<div className={styles.page}>
<div className={styles.container}>
<h1 className={styles.h1}>HoneyBadger Console</h1>
<p className={styles.p}>Client-side ASCII stage. Choose an animation to play locally in your browser.</p>
</div>
<AsciiBadger />
</div>
);
}