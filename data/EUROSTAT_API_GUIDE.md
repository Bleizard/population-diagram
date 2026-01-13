# Eurostat API Guide: Downloading Population Data

This guide explains how to download population data from Eurostat's SDMX API for use with the Population Pyramid application.

## Quick Start

### Basic URL Structure

```
https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/{DATASET}/{FILTERS}?format=SDMX-CSV&startPeriod={START}&endPeriod={END}
```

### Download Population by Age and Sex

**Dataset:** `DEMO_PJAN` (Population on 1 January by age and sex)

**URL Template:**
```
https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/DEMO_PJAN/A.NR...{COUNTRY_CODE}?format=SDMX-CSV&startPeriod={START_YEAR}&endPeriod={END_YEAR}
```

### Examples

#### Spain (1975-2024, 50 years)
```bash
curl -L -o spain_population.csv \
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/DEMO_PJAN/A.NR...ES?format=SDMX-CSV&startPeriod=1975&endPeriod=2024"
```

#### France (2020-2024)
```bash
curl -L -o france_population.csv \
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/DEMO_PJAN/A.NR...FR?format=SDMX-CSV&startPeriod=2020&endPeriod=2024"
```

#### Germany (2000-2024)
```bash
curl -L -o germany_population.csv \
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/DEMO_PJAN/A.NR...DE?format=SDMX-CSV&startPeriod=2000&endPeriod=2024"
```

#### Italy (1990-2024)
```bash
curl -L -o italy_population.csv \
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/DEMO_PJAN/A.NR...IT?format=SDMX-CSV&startPeriod=1990&endPeriod=2024"
```

## Country Codes (ISO 3166-1 alpha-2)

| Country | Code |
|---------|------|
| Austria | AT |
| Belgium | BE |
| Bulgaria | BG |
| Croatia | HR |
| Cyprus | CY |
| Czech Republic | CZ |
| Denmark | DK |
| Estonia | EE |
| Finland | FI |
| France | FR |
| Germany | DE |
| Greece | EL |
| Hungary | HU |
| Ireland | IE |
| Italy | IT |
| Latvia | LV |
| Lithuania | LT |
| Luxembourg | LU |
| Malta | MT |
| Netherlands | NL |
| Poland | PL |
| Portugal | PT |
| Romania | RO |
| Slovakia | SK |
| Slovenia | SI |
| Spain | ES |
| Sweden | SE |
| United Kingdom | UK |
| Norway | NO |
| Switzerland | CH |
| Iceland | IS |

## Filter Explanation

The filter string `A.NR...{COUNTRY}` means:
- `A` - Annual frequency
- `NR` - Number (absolute values, not percentages)
- `.` - All ages (empty = all)
- `.` - All sexes (M, F, T)
- `{COUNTRY}` - Country code

## Output Format

The downloaded CSV file contains these columns:

| Column | Description | Example |
|--------|-------------|---------|
| DATAFLOW | Dataset identifier | ESTAT:DEMO_PJAN(1.0) |
| LAST UPDATE | Last data update | 04/12/25 23:00:00 |
| freq | Frequency | A (Annual) |
| unit | Unit | NR (Number) |
| age | Age group | Y0, Y1, Y25, Y_GE100, TOTAL |
| sex | Sex | M (Male), F (Female), T (Total) |
| geo | Country | ES, FR, DE |
| TIME_PERIOD | Year | 2024 |
| OBS_VALUE | Population count | 47450795 |
| OBS_FLAG | Data flag | p (provisional), e (estimated) |
| CONF_STATUS | Confidentiality | (usually empty) |

## Age Codes

| Code | Meaning |
|------|---------|
| Y0 | Age 0 (under 1 year) |
| Y1 | Age 1 |
| Y25 | Age 25 |
| Y_LT1 | Less than 1 year |
| Y_GE100 | 100 years and over |
| TOTAL | All ages combined |
| UNK | Unknown age |

## Tips

### 1. Use `-L` flag for redirects
Eurostat API may redirect, so always use `curl -L`:
```bash
curl -L -o output.csv "URL"
```

### 2. Handle SSL issues
If you encounter SSL certificate errors, use `--insecure` (not recommended for production):
```bash
curl -L --insecure -o output.csv "URL"
```

### 3. Filter specific ages
To get only ages 0-99 (excluding TOTAL and UNK):
The application automatically filters these when parsing.

### 4. Large datasets
For large requests (50+ years), the download may take 30-60 seconds. Be patient.

### 5. Data availability
Not all countries have data for all years. Check Eurostat's data browser for availability:
https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table

## API Documentation

- **Eurostat SDMX REST API:** https://wikis.ec.europa.eu/display/EUROSTATHELP/API+SDMX+2.1
- **Data Browser:** https://ec.europa.eu/eurostat/databrowser/
- **Dataset DEMO_PJAN:** https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table

## Sample Data Files in This Project

| File | Country | Period | Rows |
|------|---------|--------|------|
| `france_population_2020-2024_eurostat.csv` | France | 2020-2024 | ~1,000 |
| `spain_population_1975-2024_eurostat.csv` | Spain | 1975-2024 | ~15,000 |

---

*Last updated: January 2026*

