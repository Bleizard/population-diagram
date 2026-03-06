import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { COUNTRIES, type CountryMeta } from '../../../data/countries';
import { getLocalizedCountryName } from '../../../utils/localizedCountryName';
import styles from './CountrySelector.module.css';

interface CountrySelectorProps {
  value: string | null;
  onChange: (code: string | null) => void;
  excludeCode?: string | null;
  label?: string;
  /** Custom file label (when data was loaded from file, not country catalog) */
  customLabel?: string | null;
  /** Callback when user uploads a file */
  onFileUpload?: (file: File) => void;
}

export function CountrySelector({ value, onChange, excludeCode, label, customLabel, onFileUpload }: CountrySelectorProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSearch('');
    }
  }, [open]);

  const localizedNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of COUNTRIES) {
      map.set(c.code, getLocalizedCountryName(c.code, language, c.name));
    }
    return map;
  }, [language]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return COUNTRIES.filter((c: CountryMeta) => {
      if (excludeCode && c.code === excludeCode) return false;
      if (!q) return true;
      const locName = localizedNames.get(c.code) ?? c.name;
      return c.name.toLowerCase().includes(q)
        || locName.toLowerCase().includes(q)
        || c.code.toLowerCase().includes(q);
    });
  }, [search, excludeCode, localizedNames]);

  const selected = value ? COUNTRIES.find(c => c.code === value) : null;
  const selectedName = selected ? (localizedNames.get(selected.code) ?? selected.name) : null;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileUpload]);

  // Display label: either country name or custom file label
  const displayLabel = customLabel && !selected;

  return (
    <div className={styles.container} ref={containerRef}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <button
          className={styles.trigger}
          onClick={() => setOpen(!open)}
          type="button"
        >
          {selected ? (
            <>
              <span className={styles.flag}>{selected.flag}</span>
              <span className={styles.name}>{selectedName}</span>
            </>
          ) : displayLabel ? (
            <span className={styles.name}>{customLabel}</span>
          ) : (
            <span className={styles.placeholder}>{t.comparison.selectCountry}</span>
          )}
          <span className={styles.chevron}>{open ? '\u25B2' : '\u25BC'}</span>
        </button>

        {onFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />
            <button
              type="button"
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              title={t.upload.dropzone}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9,15 12,12 15,15"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {open && (
        <div className={styles.popover}>
          <input
            ref={inputRef}
            type="text"
            className={styles.search}
            placeholder={t.countryBrowser.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>{t.countryBrowser.noResults}</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  className={`${styles.item} ${c.code === value ? styles.itemActive : ''}`}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span className={styles.itemFlag}>{c.flag}</span>
                  <span className={styles.itemName}>{localizedNames.get(c.code) ?? c.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
