import { useState, useEffect, useCallback } from 'react';
import type { Language, Translations } from '../i18n';
import { getTranslations, detectBrowserLanguage } from '../i18n';

const STORAGE_KEY = 'population-pyramid-language';

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => {
    // Сначала проверяем localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['en', 'ru', 'es', 'pt', 'fr', 'de'].includes(saved)) {
      return saved as Language;
    }
    // Иначе определяем по браузеру
    return detectBrowserLanguage();
  });

  const [translations, setTranslations] = useState<Translations>(() => 
    getTranslations(language)
  );

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  useEffect(() => {
    setTranslations(getTranslations(language));
    document.documentElement.lang = language;
  }, [language]);

  return {
    language,
    t: translations,
    setLanguage,
  };
}

