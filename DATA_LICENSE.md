# Data Sources and Licensing

## Eurostat Population Data

The preloaded population data in `public/data/` is sourced from **Eurostat**, the statistical office of the European Union.

- **Dataset**: Population on 1 January by age and sex (`demo_pjan`)
- **Source**: [Eurostat](https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table?lang=en)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Copyright**: European Union, 1995–2025

### Transformations Applied

The original data has been transformed as follows:
- Downloaded via Eurostat SDMX 2.1 JSON API
- Filtered to include only sex=M and sex=F (excluding TOTAL)
- Age codes converted from Eurostat format (Y0, Y1, ..., Y_GE100) to numeric indices (0–100)
- Stored in a compact JSON format optimized for web delivery

### Attribution

As required by the CC BY 4.0 license:

> Source: Eurostat (online data code: demo_pjan)
> Licensed under CC BY 4.0
> https://creativecommons.org/licenses/by/4.0/

---

## US Census Bureau — Population Estimates Program (PEP)

- **Dataset**: Annual Estimates of the Resident Population by Single Year of Age and Sex
- **Source**: [US Census Bureau](https://www.census.gov/data/developers/data-sets/popest-popproj/popest.html)
- **License**: Public Domain (U.S. Government Work)
- **API**: `api.census.gov`

### Transformations Applied

- Fetched via Census Bureau API
- Age bins mapped to 0–99 + 100+ format
- Stored in compact JSON format

---

## Statistics Canada — Population Estimates

- **Dataset**: Population estimates on July 1st, by age and sex (Table 17-10-0005-01)
- **Source**: [Statistics Canada](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710000501)
- **License**: [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence)

### Transformations Applied

- Fetched via Statistics Canada Web Data Service
- Age bins mapped to 0–99 + 100+ format
- Stored in compact JSON format

---

## e-Stat Japan — Population Estimates

- **Dataset**: Population by Age (Single Years) and Sex
- **Source**: [e-Stat](https://www.e-stat.go.jp/)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **API**: `api.e-stat.go.jp`

### Transformations Applied

- Fetched via e-Stat API
- Age bins mapped to 0–99 + 100+ format
- Stored in compact JSON format

---

## Australian Bureau of Statistics (ABS) — Population Estimates

- **Dataset**: National, state and territory population by age and sex
- **Source**: [ABS](https://www.abs.gov.au/)
- **License**: [Creative Commons Attribution 3.0 Australia (CC BY 3.0 AU)](https://creativecommons.org/licenses/by/3.0/au/)
- **API**: `api.data.abs.gov.au` (SDMX)

### Transformations Applied

- Fetched via ABS SDMX API
- Age bins mapped to 0–99 + 100+ format
- Stored in compact JSON format
