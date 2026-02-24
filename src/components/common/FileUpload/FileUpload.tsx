import { useCallback, useRef, useState, useEffect, type ReactElement } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n';
import type { ProcessingState, DataFormat } from '../../../types';
import styles from './FileUpload.module.css';

type FormatTab = 'simple' | 'timeseries' | 'eurostat' | 'simple-total';

interface FileUploadProps {
  /** Callback при выборе файла */
  onFileSelect: (file: File) => void;
  /** Callback для загрузки демо */
  onLoadDemo?: () => void;
  /** Принимаемые форматы файлов */
  acceptedFormats?: string[];
  /** Состояние загрузки */
  isLoading?: boolean;
  /** Текст ошибки */
  error?: string | null;
  /** Состояние обработки файла */
  processingState?: ProcessingState;
}

const DEFAULT_FORMATS = ['.csv', '.xlsx', '.xls'];

// Иконки для этапов
const STEP_ICONS: Record<string, ReactElement> = {
  reading: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  ),
  detecting: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  validating: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  building: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  done: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22,4 12,14.01 9,11.01"/>
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

export function FileUpload({
  onFileSelect,
  onLoadDemo,
  acceptedFormats = DEFAULT_FORMATS,
  isLoading = false,
  error = null,
  processingState,
}: FileUploadProps) {
  const { t } = useI18n();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGlobalDrag, setIsGlobalDrag] = useState(false);
  const [activeTab, setActiveTab] = useState<FormatTab>('simple');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Обработчики для dropzone
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
      setIsGlobalDrag(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  // Глобальный drag and drop на всю страницу
  useEffect(() => {
    if (isLoading) return;

    const handleGlobalDragEnter = (e: globalThis.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      
      // Проверяем, есть ли файлы
      if (e.dataTransfer?.types.includes('Files')) {
        setIsGlobalDrag(true);
      }
    };

    const handleGlobalDragOver = (e: globalThis.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleGlobalDragLeave = (e: globalThis.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      
      if (dragCounterRef.current === 0) {
        setIsGlobalDrag(false);
      }
    };

    const handleGlobalDrop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      setIsGlobalDrag(false);
      setIsDragOver(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    };

    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [isLoading, onFileSelect]);

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

  // Глобальный обработчик paste для всей страницы (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handleGlobalPaste = (e: globalThis.ClipboardEvent) => {
      if (isLoading) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onFileSelect(file);
            return;
          }
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [onFileSelect, isLoading]);

  // Получить локализованное название формата
  const getFormatName = (format: DataFormat): string => {
    const formatInfo = (t.dataFormats as Record<string, { name: string }>)[format];
    return formatInfo?.name || format;
  };

  // Показываем прогресс обработки
  const showProcessing = isLoading && processingState && processingState.step !== 'idle';

  // Глобальный overlay для drag and drop
  const globalDropOverlay = isGlobalDrag && !isLoading && createPortal(
    <div 
      className={styles.globalDropOverlay}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsGlobalDrag(false);
        setIsDragOver(false);
        dragCounterRef.current = 0;
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          onFileSelect(files[0]);
        }
      }}
    >
      <div className={styles.globalDropContent}>
        <div className={styles.globalDropIcon}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
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
        <p className={styles.globalDropText}>{t.upload.dropHere}</p>
        <p className={styles.globalDropSubtext}>{t.upload.formats}</p>
      </div>
    </div>,
    document.body
  );

  return (
    <div className={styles.container}>
      {globalDropOverlay}
      <div
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''} ${
          error ? styles.hasError : ''
        } ${isLoading ? styles.loading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isLoading ? undefined : handleClick}
        onKeyDown={isLoading ? undefined : handleKeyDown}
        role="button"
        tabIndex={isLoading ? -1 : 0}
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

        {showProcessing && processingState ? (
          <div className={styles.processingContent}>
            {/* Прогресс-бар */}
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar}
                style={{ width: `${processingState.progress}%` }}
              />
            </div>

            {/* Текущий этап */}
            <div className={styles.currentStep}>
              <span className={`${styles.stepIcon} ${styles[processingState.step]}`}>
                {STEP_ICONS[processingState.step]}
              </span>
              <span className={styles.stepText}>
                {processingState.message || t.upload.loading}
              </span>
            </div>

            {/* Определённый формат */}
            {processingState.detectedFormat && processingState.step !== 'reading' && (
              <div className={styles.detectedFormat}>
                <span className={styles.formatLabel}>{t.processing.formatDetected}</span>
                <span className={styles.formatValue}>
                  {getFormatName(processingState.detectedFormat)}
                </span>
              </div>
            )}

            {/* Этапы */}
            <div className={styles.steps}>
              {(['reading', 'detecting', 'validating', 'building', 'done'] as const).map((step, index) => {
                const currentIndex = ['reading', 'detecting', 'validating', 'building', 'done'].indexOf(processingState.step);
                const stepIndex = index;
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = step === processingState.step;
                const isPending = stepIndex > currentIndex;

                return (
                  <div 
                    key={step}
                    className={`${styles.stepItem} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''} ${isPending ? styles.pending : ''}`}
                  >
                    <span className={styles.stepDot} />
                    <span className={styles.stepName}>
                      {(t.processing as Record<string, string>)[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isLoading ? (
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
            <p className={styles.pasteHint}>
              <kbd>Ctrl</kbd>+<kbd>V</kbd> {t.upload.pasteHint}
            </p>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && onLoadDemo && (
        <div className={styles.demoSection}>
          <span className={styles.demoOr}>{t.upload.or}</span>
          <button
            type="button"
            className={styles.demoButton}
            onClick={onLoadDemo}
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
              <polygon points="5,3 19,12 5,21 5,3" />
            </svg>
            {t.upload.tryDemo}
          </button>
          <span className={styles.demoHint}>{t.upload.demoHint}</span>
        </div>
      )}

      {!isLoading && (
        <div className={styles.formatsContainer}>
          <h4 className={styles.formatsTitle}>{t.upload.supportedFormats}</h4>
          
          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'simple' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('simple')}
              >
                {t.upload.simpleFormat}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'timeseries' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('timeseries')}
              >
                {t.upload.timeseriesFormat}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'eurostat' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('eurostat')}
              >
                {t.upload.eurostatFormat}
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'simple-total' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('simple-total')}
              >
                {t.upload.totalOnlyFormat}
              </button>
            </div>

            {/* Tab content */}
            <div className={styles.tabContent}>
              {activeTab === 'simple' && (
                <>
                  <p className={styles.formatDesc}>
                    {t.upload.simpleFormatDesc} <code>age</code>, <code>male</code>, <code>female</code>
                  </p>
                  <pre className={styles.example}>
{`age,male,female
0,893000,847000
1,889000,845000
...`}
                  </pre>
                </>
              )}

              {activeTab === 'timeseries' && (
                <>
                  <p className={styles.formatDesc}>
                    {t.upload.timeseriesFormatDesc} <code>year</code>, <code>age</code>, <code>male</code>, <code>female</code>
                  </p>
                  <pre className={styles.example}>
{`year,age,male,female
2020,0,410000,390000
2020,1,415000,395000
2021,0,405000,385000
...`}
                  </pre>
                </>
              )}

              {activeTab === 'eurostat' && (
                <>
                  <p className={styles.formatDesc}>
                    {t.upload.eurostatFormatDesc} <code>age</code>, <code>sex</code>, <code>geo</code>, <code>TIME_PERIOD</code>, <code>OBS_VALUE</code>
                  </p>
                  <pre className={styles.example}>
{`age,sex,geo,TIME_PERIOD,OBS_VALUE
Y0,M,FR,2020,367500
Y0,F,FR,2020,351200
Y1,M,FR,2020,372800
...`}
                  </pre>
                </>
              )}

              {activeTab === 'simple-total' && (
                <>
                  <p className={styles.formatDesc}>
                    {t.upload.totalOnlyFormatDesc} <code>age</code>, <code>total</code> / <code>population</code> / <code>value</code>
                  </p>
                  <pre className={styles.example}>
{`age,total
0,1740000
1,1734000
2,1721000
...`}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
