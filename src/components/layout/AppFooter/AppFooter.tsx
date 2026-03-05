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
    </footer>
  );
}
