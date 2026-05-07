export interface CountryMeta {
  code: string;
  name: string;
  capital: string;
  region: 'EU' | 'EFTA' | 'Candidate' | 'NorthAmerica' | 'Other';
  flag: string;
  isAggregate?: boolean;
}

export const COUNTRIES: CountryMeta[] = [
  { code: 'EU', name: 'European Union', capital: 'Brussels', region: 'EU', flag: '\u{1F1EA}\u{1F1FA}', isAggregate: true },
  // EU-27
  { code: 'AT', name: 'Austria', capital: 'Vienna', region: 'EU', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'BE', name: 'Belgium', capital: 'Brussels', region: 'EU', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'BG', name: 'Bulgaria', capital: 'Sofia', region: 'EU', flag: '\u{1F1E7}\u{1F1EC}' },
  { code: 'HR', name: 'Croatia', capital: 'Zagreb', region: 'EU', flag: '\u{1F1ED}\u{1F1F7}' },
  { code: 'CY', name: 'Cyprus', capital: 'Nicosia', region: 'EU', flag: '\u{1F1E8}\u{1F1FE}' },
  { code: 'CZ', name: 'Czechia', capital: 'Prague', region: 'EU', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'DK', name: 'Denmark', capital: 'Copenhagen', region: 'EU', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'EE', name: 'Estonia', capital: 'Tallinn', region: 'EU', flag: '\u{1F1EA}\u{1F1EA}' },
  { code: 'FI', name: 'Finland', capital: 'Helsinki', region: 'EU', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'FR', name: 'France', capital: 'Paris', region: 'EU', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'DE', name: 'Germany', capital: 'Berlin', region: 'EU', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'EL', name: 'Greece', capital: 'Athens', region: 'EU', flag: '\u{1F1EC}\u{1F1F7}' },
  { code: 'HU', name: 'Hungary', capital: 'Budapest', region: 'EU', flag: '\u{1F1ED}\u{1F1FA}' },
  { code: 'IE', name: 'Ireland', capital: 'Dublin', region: 'EU', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'IT', name: 'Italy', capital: 'Rome', region: 'EU', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'LV', name: 'Latvia', capital: 'Riga', region: 'EU', flag: '\u{1F1F1}\u{1F1FB}' },
  { code: 'LT', name: 'Lithuania', capital: 'Vilnius', region: 'EU', flag: '\u{1F1F1}\u{1F1F9}' },
  { code: 'LU', name: 'Luxembourg', capital: 'Luxembourg', region: 'EU', flag: '\u{1F1F1}\u{1F1FA}' },
  { code: 'MT', name: 'Malta', capital: 'Valletta', region: 'EU', flag: '\u{1F1F2}\u{1F1F9}' },
  { code: 'NL', name: 'Netherlands', capital: 'Amsterdam', region: 'EU', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'PL', name: 'Poland', capital: 'Warsaw', region: 'EU', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'PT', name: 'Portugal', capital: 'Lisbon', region: 'EU', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'RO', name: 'Romania', capital: 'Bucharest', region: 'EU', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'SK', name: 'Slovakia', capital: 'Bratislava', region: 'EU', flag: '\u{1F1F8}\u{1F1F0}' },
  { code: 'SI', name: 'Slovenia', capital: 'Ljubljana', region: 'EU', flag: '\u{1F1F8}\u{1F1EE}' },
  { code: 'ES', name: 'Spain', capital: 'Madrid', region: 'EU', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'SE', name: 'Sweden', capital: 'Stockholm', region: 'EU', flag: '\u{1F1F8}\u{1F1EA}' },
  // EFTA
  { code: 'IS', name: 'Iceland', capital: 'Reykjavik', region: 'EFTA', flag: '\u{1F1EE}\u{1F1F8}' },
  { code: 'LI', name: 'Liechtenstein', capital: 'Vaduz', region: 'EFTA', flag: '\u{1F1F1}\u{1F1EE}' },
  { code: 'NO', name: 'Norway', capital: 'Oslo', region: 'EFTA', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'CH', name: 'Switzerland', capital: 'Bern', region: 'EFTA', flag: '\u{1F1E8}\u{1F1ED}' },
  // Candidates
  { code: 'AL', name: 'Albania', capital: 'Tirana', region: 'Candidate', flag: '\u{1F1E6}\u{1F1F1}' },
  { code: 'BA', name: 'Bosnia and Herzegovina', capital: 'Sarajevo', region: 'Candidate', flag: '\u{1F1E7}\u{1F1E6}' },
  { code: 'ME', name: 'Montenegro', capital: 'Podgorica', region: 'Candidate', flag: '\u{1F1F2}\u{1F1EA}' },
  { code: 'MK', name: 'North Macedonia', capital: 'Skopje', region: 'Candidate', flag: '\u{1F1F2}\u{1F1F0}' },
  { code: 'MD', name: 'Moldova', capital: 'Chișinău', region: 'Candidate', flag: '\u{1F1F2}\u{1F1E9}' },
  { code: 'RS', name: 'Serbia', capital: 'Belgrade', region: 'Candidate', flag: '\u{1F1F7}\u{1F1F8}' },
  { code: 'TR', name: 'Turkey', capital: 'Ankara', region: 'Candidate', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'XK', name: 'Kosovo', capital: 'Pristina', region: 'Candidate', flag: '\u{1F1FD}\u{1F1F0}' },
  // North America
  { code: 'US', name: 'United States', capital: 'Washington, D.C.', region: 'NorthAmerica', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'CA', name: 'Canada', capital: 'Ottawa', region: 'NorthAmerica', flag: '\u{1F1E8}\u{1F1E6}' },
  // Other
  { code: 'UK', name: 'United Kingdom', capital: 'London', region: 'Other', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'JP', name: 'Japan', capital: 'Tokyo', region: 'Other', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'AU', name: 'Australia', capital: 'Canberra', region: 'Other', flag: '\u{1F1E6}\u{1F1FA}' },
];

export const COMPARABLE_COUNTRIES = COUNTRIES.filter((country) => !country.isAggregate);
