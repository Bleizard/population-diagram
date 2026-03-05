import { useI18n } from '../../../i18n';
import styles from './AppFooter.module.css';

export function AppFooter() {
  const { t } = useI18n();

  return (
    <footer className={styles.footer}>
      <p>
        {t.app.footer} •{' '}
        <a
          href="https://github.com/bleizard"
          target="_blank"
          rel="noopener noreferrer"
        >
          Aleksandr Iarkeev
        </a>
      </p>
      <p className={styles.sub}>
        {t.app.footerFreeToUse} •{' '}
        <a
          href="https://github.com/bleizard/population-diagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.app.footerSourceCode}
        </a>
      </p>
      <p className={styles.sub}>
        {t.app.eurostatAttribution}{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0
        </a>
      </p>
      <a
        href="https://buymeacoffee.com/bleizard"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.coffeeLink}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
          <line x1="6" y1="2" x2="6" y2="4"/>
          <line x1="10" y1="2" x2="10" y2="4"/>
          <line x1="14" y1="2" x2="14" y2="4"/>
        </svg>
        Buy me a coffee
      </a>
    </footer>
  );
}
