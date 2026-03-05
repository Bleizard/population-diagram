/**
 * Localized country name using Intl.DisplayNames API.
 * Handles Eurostat's "EL" code for Greece (ISO is "GR").
 */

// Eurostat → ISO 3166-1 alpha-2 mapping for non-standard codes
const EUROSTAT_TO_ISO: Record<string, string> = {
  EL: 'GR', // Greece uses "EL" in Eurostat
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
  try {
    const isoCode = EUROSTAT_TO_ISO[eurostatCode] ?? eurostatCode;
    return getDisplayNames(locale).of(isoCode) ?? fallbackName;
  } catch {
    return fallbackName;
  }
}
