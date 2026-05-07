/**
 * Localized country name using Intl.DisplayNames API.
 * Handles Eurostat's "EL" code for Greece (ISO is "GR").
 */

import type { Language } from '../i18n';

// Eurostat → ISO 3166-1 alpha-2 mapping for non-standard codes
const EUROSTAT_TO_ISO: Record<string, string> = {
  EL: 'GR', // Greece uses "EL" in Eurostat
  UK: 'GB',
};

const LOCALIZED_COUNTRY_FALLBACKS: Record<string, Partial<Record<Language, string>>> = {
  XK: {
    ru: 'Косово',
    de: 'Kosovo',
    es: 'Kosovo',
    pt: 'Kosovo',
    fr: 'Kosovo',
  },
};

const displayNamesCache = new Map<string, Intl.DisplayNames>();

function getDisplayNames(locale: string): Intl.DisplayNames {
  let dn = displayNamesCache.get(locale);
  if (!dn) {
    dn = new Intl.DisplayNames([locale], { type: 'region' });
    displayNamesCache.set(locale, dn);
  }
  return dn;
}

/**
 * Returns the localized country name for a given Eurostat country code.
 * Falls back to the English name from COUNTRIES if Intl.DisplayNames fails.
 */
export function getLocalizedCountryName(
  eurostatCode: string,
  locale: string,
  fallbackName: string,
): string {
  const localizedFallback = getLocalizedFallbackName(eurostatCode, locale);
  if (localizedFallback) {
    return localizedFallback;
  }

  try {
    const isoCode = EUROSTAT_TO_ISO[eurostatCode] ?? eurostatCode;
    return getDisplayNames(locale).of(isoCode) ?? fallbackName;
  } catch {
    return fallbackName;
  }
}

function getLocalizedFallbackName(code: string, locale: string): string | null {
  return LOCALIZED_COUNTRY_FALLBACKS[code]?.[locale as Language] ?? null;
}
