import Nav from '@/components/Nav/Nav'
import Footer from '@/components/Footer/Footer'
import IdeaBridgeGame from '@/components/idea-bridge/IdeaBridgeGame'
import styles from './page.module.css'

export const metadata = {
  title: 'IdeaBridge — Loft',
  description: 'Connect two unrelated concepts through a chain of logical associations.',
}

export default function IdeaBridgePage() {
  return (
    <div className={styles.page}>
      <Nav
        logoText={
          <>
            Idea<em>Bridge</em>
          </>
        }
      />
      <main className={styles.main} id="main-content">
        <IdeaBridgeGame />
      </main>
      <Footer />
    </div>
  )
}
