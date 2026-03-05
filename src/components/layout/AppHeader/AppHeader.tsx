import { Link } from 'react-router-dom';
import { ThemeToggle } from '../../common/ThemeToggle';
import { LanguageSelector } from '../../common/LanguageSelector';
import { useI18n } from '../../../i18n';
import type { Theme } from '../../../hooks';
import type { Language } from '../../../i18n';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function AppHeader({
  theme,
  onToggleTheme,
  language,
  onLanguageChange
}: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <Link to="/" className={styles.logoLink} aria-label="Home">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="16" width="4" height="6" rx="1" />
                <rect x="10" y="10" width="4" height="12" rx="1" />
                <rect x="17" y="4" width="4" height="18" rx="1" />
              </svg>
            </Link>
            <h1 className={styles.title}>{t.app.title}</h1>
          </div>
          <p className={styles.subtitle}>{t.app.subtitle}</p>
        </div>

        <div className={styles.actions}>
          <Link to="/demo" className={styles.navLink}>
            {t.nav.demo}
          </Link>
          <Link to="/countries" className={styles.navLink}>
            {t.nav.countries}
          </Link>
          <LanguageSelector currentLanguage={language} onChange={onLanguageChange} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
