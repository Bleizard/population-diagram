# Population Pyramid Builder

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://bleizard.github.io/population-diagram/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🇷🇺 Русская версия](README.ru.md)**

Free online tool to create interactive population pyramids from CSV or Excel files. Visualize age-sex structure, demographics, and population data with beautiful charts.

## 🚀 Features

- 📊 **Interactive Population Pyramids** - Build age-sex structure visualizations with surplus indicators
- 📁 **Multiple File Formats** - Support for CSV, XLSX, XLS, and Eurostat SDMX format
- ⏱️ **Time-Series Animation** - Animate population changes over years with play/pause controls
- 🎨 **Modern UI** - Beautiful interface with dark mode support
- 🌍 **Multi-language** - Support for 6 languages (EN, RU, ES, PT, FR, DE)
- 📤 **Export Options** - Export charts as SVG or animated GIF
- ⚙️ **Customizable Charts** - Multiple view modes, color profiles, scale settings
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎯 **High Performance** - Optimized bundle size, lazy loading, 99/100 Lighthouse score

## 🛠 Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **ECharts** - Charting library (tree-shaken for optimal size)
- **PapaParse** - CSV parsing
- **SheetJS (xlsx)** - Excel parsing
- **gif.js** - GIF export functionality

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/bleizard/population-diagram.git
cd population-diagram

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages via GitHub Actions.

**Quick start:**
1. Enable GitHub Pages in Settings → Pages (source: GitHub Actions)
2. Push changes to the `main` branch
3. GitHub Actions will automatically deploy the site

**Detailed guide:** see [GITHUB_PAGES_SETUP.md](./GITHUB_PAGES_SETUP.md)

**Live Demo:** [View on GitHub Pages](https://bleizard.github.io/population-diagram/)

## 📋 Supported Data Formats

### 1. Simple Format
Basic format with age and gender columns:

| age | male | female |
|-----|------|--------|
| 0   | 893000 | 847000 |
| 1   | 889000 | 845000 |
| ... | ... | ... |

### 2. Time Series Format
Multiple years with time dimension:

| year | age | male | female |
|------|-----|------|--------|
| 2020 | 0   | 410000 | 390000 |
| 2020 | 1   | 415000 | 395000 |
| 2021 | 0   | 405000 | 385000 |
| ... | ... | ... | ... |

### 3. Eurostat Format
SDMX format from Eurostat API:

| age | sex | geo | TIME_PERIOD | OBS_VALUE |
|-----|-----|-----|-------------|-----------|
| Y0  | M   | FR  | 2020        | 367500    |
| Y0  | F   | FR  | 2020        | 351200    |
| ... | ... | ... | ...         | ...       |

### Supported Column Names

- **Age**: `age`, `Age`, `AGE`, `возраст`, `Возраст`
- **Male**: `male`, `males`, `Male`, `MALE`, `мужчины`, `Мужчины`, `м`, `М`
- **Female**: `female`, `females`, `Female`, `FEMALE`, `женщины`, `Женщины`, `ж`, `Ж`

## 🎨 Chart Features

- **Split View** - Separate bars for males (left) and females (right)
- **Combined View** - Total population bars
- **Surplus Visualization** - Darker shades show gender surplus
- **Age Grouping** - Create custom aggregated charts
- **Median Line** - Visual indicator of median age
- **Percentage Mode** - Display data as percentages
- **Color Profiles** - Pale and Contrast color schemes
- **Export Options** - SVG export and animated GIF generation

## 🏗 Project Structure

```
src/
├── components/
│   ├── common/           # Reusable components
│   │   ├── FileUpload/   # File upload with drag & drop
│   │   ├── ErrorBoundary/# Error handling
│   │   └── ...
│   ├── features/         # Feature components
│   │   ├── PopulationPyramid/  # Main chart component
│   │   ├── ChartWorkspace/     # Chart management
│   │   └── ...
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
├── services/             # Business logic
│   ├── dataTransformer/  # Data transformation
│   ├── fileParser/       # File parsing (CSV, Excel, Eurostat)
│   └── gifExporter/      # GIF export functionality
├── i18n/                 # Internationalization
│   └── translations/     # Translation files (6 languages)
├── lib/                  # Library configurations
│   └── echarts.ts        # Tree-shaken ECharts setup
├── types/                # TypeScript types
└── utils/                # Utilities
```

## 🌍 Internationalization

The app supports 6 languages:
- English (EN)
- Russian (RU)
- Spanish (ES)
- Portuguese (PT)
- French (FR)
- German (DE)

Language is auto-detected from browser settings and can be changed via the language selector.

## ⚡ Performance

- **Lighthouse Score**: 99/100 (Desktop)
- **Initial Bundle**: ~31 KB (gzipped)
- **Code Splitting**: Heavy libraries (ECharts, xlsx) load on-demand
- **Tree Shaking**: Only necessary ECharts modules imported
- **Font Optimization**: Preload with `font-display: swap`

## 🔒 Error Handling

- **Error Boundary** - Catches React errors and shows user-friendly fallback
- **File Parsing Errors** - Localized error messages
- **Graceful Degradation** - App continues working even if some features fail

## 📄 License

MIT © [Aleksandr Iarkeev](mailto:bleizardwhite@gmail.com)

## 🔗 Links

- [Live Demo](https://bleizard.github.io/population-diagram/)
- [GitHub Repository](https://github.com/bleizard/population-diagram)
- [Eurostat API Guide](EUROSTAT_API_GUIDE.md)

## 🙏 Acknowledgments

- Inspired by Wikipedia population pyramid visualizations
- Uses [ECharts](https://echarts.apache.org/) for charting
- Data format examples from [Eurostat](https://ec.europa.eu/eurostat)
