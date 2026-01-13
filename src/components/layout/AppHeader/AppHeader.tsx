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
          <h1 className={styles.title}>{t.app.title}</h1>
          <p className={styles.subtitle}>{t.app.subtitle}</p>
        </div>
        
        <div className={styles.actions}>
          <LanguageSelector currentLanguage={language} onChange={onLanguageChange} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

