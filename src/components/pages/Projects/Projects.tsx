import styles from './Projects.module.css'
import { useProjectsLogic } from './Projects.logic'
import { Card } from '@/components/ui/Card'

export default function Projects() {
  const { items } = useProjectsLogic()
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h2 className={styles.h2}>Projects</h2>
        <div className={styles.grid}>
          {items.map(p => (
            <Card key={p.id}>
              <div className={styles.cardTitle}>{p.title}</div>
              <div className={styles.cardSub}>{p.summary}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
