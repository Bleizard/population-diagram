export interface CountryMeta {
  code: string;
  name: string;
  region: 'EU' | 'EFTA' | 'Candidate' | 'NorthAmerica' | 'Other';
  flag: string;
}

export const COUNTRIES: CountryMeta[] = [
  // EU-27
  { code: 'AT', name: 'Austria', region: 'EU', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'BE', name: 'Belgium', region: 'EU', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'BG', name: 'Bulgaria', region: 'EU', flag: '\u{1F1E7}\u{1F1EC}' },
  { code: 'HR', name: 'Croatia', region: 'EU', flag: '\u{1F1ED}\u{1F1F7}' },
  { code: 'CY', name: 'Cyprus', region: 'EU', flag: '\u{1F1E8}\u{1F1FE}' },
  { code: 'CZ', name: 'Czechia', region: 'EU', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'DK', name: 'Denmark', region: 'EU', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'EE', name: 'Estonia', region: 'EU', flag: '\u{1F1EA}\u{1F1EA}' },
  { code: 'FI', name: 'Finland', region: 'EU', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'FR', name: 'France', region: 'EU', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'DE', name: 'Germany', region: 'EU', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'EL', name: 'Greece', region: 'EU', flag: '\u{1F1EC}\u{1F1F7}' },
  { code: 'HU', name: 'Hungary', region: 'EU', flag: '\u{1F1ED}\u{1F1FA}' },
  { code: 'IE', name: 'Ireland', region: 'EU', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'IT', name: 'Italy', region: 'EU', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'LV', name: 'Latvia', region: 'EU', flag: '\u{1F1F1}\u{1F1FB}' },
  { code: 'LT', name: 'Lithuania', region: 'EU', flag: '\u{1F1F1}\u{1F1F9}' },
  { code: 'LU', name: 'Luxembourg', region: 'EU', flag: '\u{1F1F1}\u{1F1FA}' },
  { code: 'MT', name: 'Malta', region: 'EU', flag: '\u{1F1F2}\u{1F1F9}' },
  { code: 'NL', name: 'Netherlands', region: 'EU', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'PL', name: 'Poland', region: 'EU', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'PT', name: 'Portugal', region: 'EU', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'RO', name: 'Romania', region: 'EU', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'SK', name: 'Slovakia', region: 'EU', flag: '\u{1F1F8}\u{1F1F0}' },
  { code: 'SI', name: 'Slovenia', region: 'EU', flag: '\u{1F1F8}\u{1F1EE}' },
  { code: 'ES', name: 'Spain', region: 'EU', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'SE', name: 'Sweden', region: 'EU', flag: '\u{1F1F8}\u{1F1EA}' },
  // EFTA
  { code: 'IS', name: 'Iceland', region: 'EFTA', flag: '\u{1F1EE}\u{1F1F8}' },
  { code: 'LI', name: 'Liechtenstein', region: 'EFTA', flag: '\u{1F1F1}\u{1F1EE}' },
  { code: 'NO', name: 'Norway', region: 'EFTA', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'CH', name: 'Switzerland', region: 'EFTA', flag: '\u{1F1E8}\u{1F1ED}' },
  // Candidates
  { code: 'AL', name: 'Albania', region: 'Candidate', flag: '\u{1F1E6}\u{1F1F1}' },
  { code: 'BA', name: 'Bosnia and Herzegovina', region: 'Candidate', flag: '\u{1F1E7}\u{1F1E6}' },
  { code: 'ME', name: 'Montenegro', region: 'Candidate', flag: '\u{1F1F2}\u{1F1EA}' },
  { code: 'MK', name: 'North Macedonia', region: 'Candidate', flag: '\u{1F1F2}\u{1F1F0}' },
  { code: 'RS', name: 'Serbia', region: 'Candidate', flag: '\u{1F1F7}\u{1F1F8}' },
  { code: 'TR', name: 'Turkey', region: 'Candidate', flag: '\u{1F1F9}\u{1F1F7}' },
  // North America
  { code: 'US', name: 'United States', region: 'NorthAmerica', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'CA', name: 'Canada', region: 'NorthAmerica', flag: '\u{1F1E8}\u{1F1E6}' },
  // Other
  { code: 'JP', name: 'Japan', region: 'Other', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'AU', name: 'Australia', region: 'Other', flag: '\u{1F1E6}\u{1F1FA}' },
];
