import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useI18n } from '../../../i18n';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  /** Callback при выборе файла */
  onFileSelect: (file: File) => void;
  /** Принимаемые форматы файлов */
  acceptedFormats?: string[];
  /** Состояние загрузки */
  isLoading?: boolean;
  /** Текст ошибки */
  error?: string | null;
}

const DEFAULT_FORMATS = ['.csv', '.xlsx', '.xls'];

export function FileUpload({
  onFileSelect,
  acceptedFormats = DEFAULT_FORMATS,
  isLoading = false,
  error = null,
}: FileUploadProps) {
  const { t } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
      // Сбрасываем input для возможности повторной загрузки того же файла
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''} ${
          error ? styles.hasError : ''
        } ${isLoading ? styles.loading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Upload file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileChange}
          className={styles.hiddenInput}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className={styles.loadingContent}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>{t.upload.loading}</p>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.icon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className={styles.mainText}>
              {t.upload.dropzone}
            </p>
            <p className={styles.subText}>
              {t.upload.formats}
            </p>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formatInfo}>
        <h4>{t.upload.formatTitle}</h4>
        <p>
          {t.upload.formatDescription} <code>age</code>, <code>male</code>,{' '}
          <code>female</code>
        </p>
        <p className={styles.example}>
          {t.upload.example} age | male | female<br />
          0 | 893000 | 847000<br />
          1 | 889000 | 845000<br />
          ...
        </p>
      </div>
    </div>
  );
}

