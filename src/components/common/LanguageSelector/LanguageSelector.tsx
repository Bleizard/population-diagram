import { useState, useRef, useEffect } from 'react';
import type { Language } from '../../../i18n';
import { LANGUAGES } from '../../../i18n';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onChange: (lang: Language) => void;
}

export function LanguageSelector({ currentLanguage, onChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (lang: Language) => {
    onChange(lang);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <span className={styles.currentLang}>{currentLang.nativeName}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`${styles.option} ${lang.code === currentLanguage ? styles.active : ''}`}
              onClick={() => handleSelect(lang.code)}
              type="button"
              role="option"
              aria-selected={lang.code === currentLanguage}
            >
              <span className={styles.nativeName}>{lang.nativeName}</span>
              <span className={styles.englishName}>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

