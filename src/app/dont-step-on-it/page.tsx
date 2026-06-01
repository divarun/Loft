import type { Metadata } from 'next'
import styles from './page.module.css'
import DontStepGame from '@/components/dont-step-on-it/DontStepGame'

export const metadata: Metadata = {
  title: "Don't Step On It — Loft",
  description:
    'Navigate a blind minefield. Traps reveal only when stepped on. Learn through failure.',
}

export default function DontStepOnItPage() {
  return (
    <div className={styles.page}>
      <DontStepGame />
    </div>
  )
}
