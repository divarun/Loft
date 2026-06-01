import Nav from '@/components/Nav/Nav'
import Footer from '@/components/Footer/Footer'
import LetterDropGame from '@/components/letter-drop/LetterDropGame'
import styles from './page.module.css'

export const metadata = {
  title: 'LetterDrop — Loft',
  description: 'Scrambled letters fall from above — unscramble them before they hit the ground.',
}

export default function LetterDropPage() {
  return (
    <div className={styles.page}>
      <Nav
        logoText={
          <>
            Letter<em>Drop</em>
          </>
        }
      />
      <main className={styles.main} id="main-content">
        <LetterDropGame />
      </main>
      <Footer />
    </div>
  )
}
