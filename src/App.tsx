import { usePopulationData } from './hooks';
import { FileUpload } from './components/common/FileUpload';
import { PopulationPyramid } from './components/features/PopulationPyramid';
import styles from './App.module.css';

function App() {
  const { data, isLoading, error, loadFile, clearData } = usePopulationData();

  return (
    <div className={styles.app}>
      {/* Фоновый паттерн */}
      <div className={styles.backgroundPattern} aria-hidden="true" />
      
      <header className={styles.header}>
        <h1 className={styles.title}>Population Pyramid</h1>
        <p className={styles.subtitle}>
          Визуализация половозрастной структуры населения
        </p>
      </header>

      <main className={styles.main}>
        {!data ? (
          <section className={styles.uploadSection}>
            <FileUpload
              onFileSelect={loadFile}
              isLoading={isLoading}
              error={error}
            />
          </section>
        ) : (
          <section className={styles.chartSection}>
            <div className={styles.toolbar}>
              <button
                className={styles.backButton}
                onClick={clearData}
                type="button"
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
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Загрузить другой файл
              </button>
              
              <div className={styles.dataInfo}>
                <span className={styles.dataInfoLabel}>Загружено:</span>
                <span className={styles.dataInfoValue}>
                  {data.ageGroups.length} возрастных групп
                </span>
              </div>
            </div>

            <PopulationPyramid data={data} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Построение половозрастных пирамид • 
          <a 
            href="https://github.com/bleizard" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Aleksandr Iarkeev
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
