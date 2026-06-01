import GameCard from '@/components/GameCard/GameCard'
import Footer from '@/components/Footer/Footer'
import styles from './page.module.css'

const GAMES = [
  {
    href: '/atlas-rush',
    name: 'AtlasRush',
    description: 'Guess the mystery country in as few hints as possible.',
    badge: 'Geography',
    badgeVariant: 'geography' as const,
    tags: ['Daily', 'Educational'],
    ariaLabel: 'Play AtlasRush — Geography puzzle game',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    href: '/idea-bridge',
    name: 'IdeaBridge',
    description: 'Connect two unrelated concepts through a chain of logical associations.',
    badge: 'Word',
    badgeVariant: 'word' as const,
    tags: ['Logic', 'Creative'],
    ariaLabel: 'Play IdeaBridge — Word association game',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/letter-drop',
    name: 'LetterDrop',
    description: 'Scrambled letters fall from above — unscramble them before they hit the ground.',
    badge: 'Arcade',
    badgeVariant: 'arcade' as const,
    tags: ['Speed', 'Word'],
    ariaLabel: 'Play LetterDrop — Arcade word game',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </svg>
    ),
  },
  {
    href: '/dont-step-on-it',
    name: "Don't Step On It",
    description:
      'Navigate a blind minefield. Traps reveal only when stepped on. Learn through failure.',
    badge: 'Stealth',
    badgeVariant: 'stealth' as const,
    tags: ['Memory', 'Arcade'],
    ariaLabel: "Play Don't Step On It — Blind minefield game",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="4" height="4" rx="0.5" />
        <rect x="10" y="3" width="4" height="4" rx="0.5" />
        <rect x="17" y="3" width="4" height="4" rx="0.5" />
        <rect x="3" y="10" width="4" height="4" rx="0.5" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" />
        <rect x="17" y="10" width="4" height="4" rx="0.5" />
        <rect x="3" y="17" width="4" height="4" rx="0.5" />
        <rect x="10" y="17" width="4" height="4" rx="0.5" />
        <rect x="17" y="17" width="4" height="4" rx="0.5" />
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main} id="main-content">
        <div className={styles.hero}>
          <h1 className={styles.logo}>
            L<em>oft</em>
          </h1>
          <p className={styles.tagline}>Handmade browser games — no installs, no accounts.</p>
          <span className={styles.pill}>4 games</span>
        </div>
        <section aria-labelledby="games-heading">
          <h2 id="games-heading" className={styles.sectionLabel}>
            All games
          </h2>
          <ul className={styles.grid} role="list">
            {GAMES.map((g, i) => (
              <GameCard key={g.href} index={i} {...g} />
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  )
}
