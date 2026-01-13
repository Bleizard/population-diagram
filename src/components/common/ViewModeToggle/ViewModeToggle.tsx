import styles from './ViewModeToggle.module.css';

export type ViewMode = 'split' | 'combined';

interface ViewModeToggleProps {
  /** Текущий режим отображения */
  mode: ViewMode;
  /** Callback при изменении режима */
  onChange: (mode: ViewMode) => void;
}

/**
 * Переключатель режима отображения: с разделением по полу или суммарно
 */
export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className={styles.container}>
      <div className={styles.toggle}>
        <button
          className={`${styles.option} ${mode === 'split' ? styles.active : ''}`}
          onClick={() => onChange('split')}
          type="button"
          aria-pressed={mode === 'split'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          By gender
        </button>
        <button
          className={`${styles.option} ${mode === 'combined' ? styles.active : ''}`}
          onClick={() => onChange('combined')}
          type="button"
          aria-pressed={mode === 'combined'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          Combined
        </button>
      </div>
    </div>
  );
}

