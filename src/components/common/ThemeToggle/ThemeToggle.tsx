import type { Theme } from '../../../hooks';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  /** Текущая тема */
  theme: Theme;
  /** Callback переключения темы */
  onToggle: () => void;
}

/**
 * Компонент переключателя темы с анимированной иконкой солнца/луны
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      className={styles.toggle}
      onClick={onToggle}
      type="button"
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
    >
      <span className={styles.iconWrapper}>
        {/* Солнце */}
        <svg
          className={`${styles.icon} ${styles.sun} ${!isDark ? styles.active : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>

        {/* Луна */}
        <svg
          className={`${styles.icon} ${styles.moon} ${isDark ? styles.active : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </span>
    </button>
  );
}

