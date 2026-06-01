import AtlasRushGame from '@/components/atlas-rush/AtlasRushGame'
import styles from './page.module.css'

export const metadata = {
  title: 'AtlasRush — Loft',
  description: 'Guess the mystery country in as few hints as possible.',
}

export default function AtlasRushPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main} id="main-content">
        <AtlasRushGame />
      </main>
    </div>
  )
}
