import { CountryBrowser } from '../components/features';
import type { Theme } from '../hooks';
import styles from './CountriesPage.module.css';

interface CountriesPageProps {
  isLoading: boolean;
  theme: Theme;
}

export function CountriesPage({ isLoading, theme }: CountriesPageProps) {
  return (
    <div className={styles.page}>
      <CountryBrowser
        isLoading={isLoading}
        fullWidth
        theme={theme}
      />
    </div>
  );
}
