import Link from 'next/link'
import styles from './Nav.module.css'

interface NavProps {
  backHref?: string
  backLabel?: string
  logoText?: React.ReactNode  // e.g. <>Atlas<em>Rush</em></>
  rightSlot?: React.ReactNode
}

export default function Nav({
  backHref = '/',
  backLabel = 'All Games',
  logoText,
  rightSlot,
}: NavProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link
            href={backHref}
            className={styles.backLink}
            aria-label={`Back to ${backLabel}`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {backLabel}
          </Link>
          {logoText && <div className={styles.logo}>{logoText}</div>}
        </div>
        {rightSlot && <div className={styles.right}>{rightSlot}</div>}
      </div>
    </header>
  )
}
