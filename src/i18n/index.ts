import { createContext, useContext } from 'react';
import en from './translations/en.json';
import ru from './translations/ru.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

export type Language = 'en' | 'ru' | 'es' | 'pt' | 'fr' | 'de';

export type Translations = typeof en;

// Загрузка переводов
const translations: Record<Language, Translations> = {
  en,
  ru: ru as Translations,
  es: es as Translations,
  pt: pt as Translations,
  fr: fr as Translations,
  de: de as Translations,
};

export const LANGUAGES: Array<{ code: Language; name: string; nativeName: string }> = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
];

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}

// Контекст для i18n
interface I18nContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  t: en,
  setLanguage: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

// Определение языка браузера
export function detectBrowserLanguage(): Language {
  const browserLang = navigator.language.split('-')[0];
  const supported = LANGUAGES.map(l => l.code);
  return supported.includes(browserLang as Language) ? (browserLang as Language) : 'en';
}

