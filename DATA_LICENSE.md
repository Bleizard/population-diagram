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
