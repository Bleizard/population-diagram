import { useEffect } from 'react';
import type { AgeRangeConfig } from '../../../types';
import { useI18n } from '../../../i18n';
import { AgeGroupConfigurator } from '../AgeGroupConfigurator';
import styles from './GroupedChartModal.module.css';

interface GroupedChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChart: (groups: AgeRangeConfig[]) => void;
  maxAge: number;
}

export function GroupedChartModal({
  isOpen,
  onClose,
  onCreateChart,
  maxAge,
}: GroupedChartModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{t.groupConfig.createGrouped}</h3>
            <p className={styles.subtitle}>{t.groupConfig.createChart}</p>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label={t.common.close}
          >
            <svg
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          <AgeGroupConfigurator
            onCreateChart={onCreateChart}
            maxAge={maxAge}
            displayMode="embedded"
            onCreated={onClose}
          />
        </div>
      </div>
    </>
  );
}
