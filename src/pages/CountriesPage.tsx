import { CountryBrowser } from '../components/features';
import styles from './CountriesPage.module.css';

interface CountriesPageProps {
  isLoading: boolean;
}

export function CountriesPage({ isLoading }: CountriesPageProps) {
  return (
    <div className={styles.page}>
      <CountryBrowser
        isLoading={isLoading}
        fullWidth
      />
    </div>
  );
}
