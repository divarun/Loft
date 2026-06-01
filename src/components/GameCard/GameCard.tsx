import Link from 'next/link'
import styles from './GameCard.module.css'

interface GameCardProps {
  href: string
  name: string
  description: string
  badge: string
  badgeVariant: 'geography' | 'word' | 'arcade' | 'stealth'
  tags: string[]
  icon: React.ReactNode
  ariaLabel: string
}

export default function GameCard({
  href,
  name,
  description,
  badge,
  badgeVariant,
  tags,
  icon,
  ariaLabel,
}: GameCardProps) {
  return (
    <li>
      <Link className={styles.card} href={href} aria-label={ariaLabel}>
        <div className={styles.cardHeader}>
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
          <span className={`${styles.badge} ${styles[badgeVariant]}`}>{badge}</span>
        </div>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.desc}>{description}</p>
        <div className={styles.tags}>
          {tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
        <span className={styles.cta} aria-hidden="true">
          Play →
        </span>
      </Link>
    </li>
  )
}
