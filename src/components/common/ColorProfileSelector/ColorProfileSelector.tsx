import { useI18n } from '../../../i18n';
import type { ColorProfile } from '../../../types';
import styles from './ColorProfileSelector.module.css';

interface ColorProfileSelectorProps {
  value: ColorProfile;
  onChange: (value: ColorProfile) => void;
}

const PROFILES: ColorProfile[] = ['pale', 'contrast'];

export function ColorProfileSelector({ value, onChange }: ColorProfileSelectorProps) {
  const { t } = useI18n();

  const getLabel = (profile: ColorProfile) => {
    return profile === 'pale' ? t.settings.colorPale : t.settings.colorContrast;
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        {PROFILES.map((profile) => (
          <button
            key={profile}
            className={`${styles.button} ${value === profile ? styles.active : ''}`}
            onClick={() => onChange(profile)}
            type="button"
          >
            <span className={styles.preview}>
              <span 
                className={styles.colorDot} 
                style={{ 
                  background: profile === 'pale' ? '#93c5fd' : '#3b82f6' 
                }} 
              />
              <span 
                className={styles.colorDot} 
                style={{ 
                  background: profile === 'pale' ? '#fda4af' : '#ef4444' 
                }} 
              />
            </span>
            {getLabel(profile)}
          </button>
        ))}
      </div>
    </div>
  );
}
