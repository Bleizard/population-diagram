import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StyleSpecification } from 'maplibre-gl';
import { GeoMap, GeoJsonLayer, useMapControls, type FeatureEvent } from '@geovis/renderer';
import '@geovis/renderer/style.css';
import type { CountryMeta } from '../../../data/countries';
import type { Theme } from '../../../hooks';
import { useI18n } from '../../../i18n';
import { fetchCountrySummary, type CountrySummaryEntry } from '../../../services/countryDataLoader';
import { formatPopulation } from '../../../utils';
import {
  approximateAreaKm2,
  createCountryMapGeoJson,
  getFeatureLabelPoint,
  getGeoJsonBounds,
  type CountryMapFeatureProperties,
} from '../../../utils/countryMap';
import { CountryBadgesLayer, type CountryBadge } from './CountryBadgesLayer';
import { BADGE_FONT_FAMILY } from './countryBadgeImage';
import { placeHoverCard } from './hoverCardPosition';
import { loadNatureStyle } from './natureStyle';
import styles from './CountryMapBrowser.module.css';

interface CountryMapBrowserProps {
  countries: CountryMeta[];
  localizedNames: Map<string, string>;
  isLoading: boolean;
  theme: Theme;
}

const SUMMARY_TEXT_FALLBACK = {
  totalPopulation: 'Total population',
  dependencyRatio: 'Dependency ratio',
  sexRatio: 'Sex ratio',
  notAvailable: 'N/A',
};
const WORLD_MAP_SOURCES = ['data/world-countries.optimized.geojson', 'data/world-countries.geojson'];
const DESERTS_MAP_PATH = 'data/deserts_biome.optimized.geojson';
const FONT_LOAD_TIMEOUT_MS = 1500;

/**
 * Absolute asset URL. GeoJSON sources given by URL are fetched inside the MapLibre worker,
 * where relative URLs would resolve against the worker's blob: origin.
 */
function assetUrl(relativePath: string): string {
  return new URL(relativePath, new URL(import.meta.env.BASE_URL, window.location.href)).href;
}

async function fetchGeoJsonWithFallback(paths: string[], signal?: AbortSignal): Promise<GeoJSON.GeoJSON> {
  let lastError: Error | null = null;

  for (const relativePath of paths) {
    try {
      const response = await fetch(assetUrl(relativePath), { signal });
      if (!response.ok) {
        throw new Error(`Failed to load ${relativePath}: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Failed to load GeoJSON');
}

/** Badges are rasterised once, so wait (briefly) for the web font before drawing them. */
function loadBadgeFont(): Promise<unknown> {
  return Promise.race([
    document.fonts.load(`700 11px ${BADGE_FONT_FAMILY}`).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS)),
  ]);
}

function MapBoundsController({ data }: { data: GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryMapFeatureProperties> | null }) {
  const controls = useMapControls();

  useEffect(() => {
    if (!data || data.features.length === 0) return;
    const bounds = getGeoJsonBounds(data);
    if (!bounds) return;

    controls.fitBounds(bounds, {
      padding: 48,
      maxZoom: data.features.length === 1 ? 6.5 : 4.5,
    });
  }, [controls, data]);

  return null;
}

export function CountryMapBrowser({
  countries,
  localizedNames,
  isLoading,
  theme,
}: CountryMapBrowserProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const hoverCardRef = useRef<HTMLDivElement | null>(null);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [rawGeoJson, setRawGeoJson] = useState<GeoJSON.GeoJSON | null>(null);
  const [isBadgeFontReady, setIsBadgeFontReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [countrySummaries, setCountrySummaries] = useState<Record<string, CountrySummaryEntry>>({});

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      loadNatureStyle(assetUrl(DESERTS_MAP_PATH), controller.signal),
      fetchGeoJsonWithFallback(WORLD_MAP_SOURCES, controller.signal),
    ])
      .then(([style, json]) => {
        setMapStyle(style);
        setRawGeoJson(json);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMapError(error instanceof Error ? error.message : 'Failed to load map data');
      });

    void loadBadgeFont().then(() => {
      if (!controller.signal.aborted) setIsBadgeFontReady(true);
    });

    return () => controller.abort();
  }, []);

  const mapGeoJson = useMemo(() => {
    if (!rawGeoJson) return null;
    return createCountryMapGeoJson(rawGeoJson, countries, localizedNames);
  }, [countries, localizedNames, rawGeoJson]);

  const badges = useMemo<CountryBadge[]>(() => {
    if (!mapGeoJson) return [];

    return mapGeoJson.features.flatMap((feature) => {
      const properties = feature.properties;
      const point = getFeatureLabelPoint(feature);
      if (!properties?.flag || !properties.localizedName || !point) return [];

      return [{
        code: properties.code,
        flag: properties.flag,
        name: properties.localizedName,
        point,
        priority: approximateAreaKm2(feature.geometry),
      }];
    });
  }, [mapGeoJson]);

  // Summaries are loaded on demand for the hovered country (and cached by the loader),
  // instead of fetching full data of every country when the map opens.
  useEffect(() => {
    if (!hoveredCode || countrySummaries[hoveredCode]) return;

    fetchCountrySummary(hoveredCode)
      .then((summary) => {
        setCountrySummaries((prev) => ({ ...prev, [hoveredCode]: summary }));
      })
      .catch(() => {
        // The card keeps showing placeholders.
      });
  }, [countrySummaries, hoveredCode]);

  const hoveredCountry = useMemo(() => {
    if (!hoveredCode) return null;
    return countries.find((country) => country.code === hoveredCode) ?? null;
  }, [countries, hoveredCode]);

  const hoveredSummary = hoveredCode ? countrySummaries[hoveredCode] ?? null : null;

  const handleFeatureClick = useCallback((event: FeatureEvent<CountryMapFeatureProperties>) => {
    if (isLoading) return;
    const code = event.feature.properties?.code;
    if (code) {
      navigate(`/country/${code}`);
    }
  }, [isLoading, navigate]);

  const handleFeatureHover = useCallback((event: FeatureEvent<CountryMapFeatureProperties> | null) => {
    const code = event?.feature.properties?.code ?? null;
    // Same value → React bails out; the component re-renders only when the country changes.
    setHoveredCode(code);

    const frame = mapFrameRef.current;
    const card = hoverCardRef.current;
    if (event && code && frame && card) {
      placeHoverCard(card, frame, event.originalEvent);
    }
  }, []);

  const summaryText = t.summary ?? SUMMARY_TEXT_FALLBACK;
  const loadingMetricsText = 'Loading...';
  const hoveredMetrics = hoveredSummary ? [
    { label: summaryText.totalPopulation, value: formatPopulation(hoveredSummary.metrics.totalPopulation) },
    { label: t.common.median, value: hoveredSummary.metrics.medianAge !== null ? `${hoveredSummary.metrics.medianAge}` : summaryText.notAvailable },
    { label: summaryText.dependencyRatio, value: hoveredSummary.metrics.dependencyRatio !== null ? `${hoveredSummary.metrics.dependencyRatio.toFixed(1)}%` : summaryText.notAvailable },
    { label: summaryText.sexRatio, value: hoveredSummary.metrics.sexRatio !== null ? `${hoveredSummary.metrics.sexRatio.toFixed(1)}` : summaryText.notAvailable },
  ] : null;

  if (mapError) {
    return <div className={styles.error}>{t.countryBrowser.mapUnavailable}</div>;
  }

  if (!mapStyle || !mapGeoJson) {
    return <div className={styles.loading}>{t.countryBrowser.mapLoading}</div>;
  }

  if (mapGeoJson.features.length === 0) {
    return <div className={styles.loading}>{t.countryBrowser.noResults}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.mapShell}>
        <div ref={mapFrameRef} className={styles.mapFrame}>
          <GeoMap
            style={mapStyle}
            viewport={{ center: [14, 48], zoom: 2.2 }}
            className={styles.mapViewport}
            controls
          >
            <MapBoundsController data={mapGeoJson} />
            <GeoJsonLayer<CountryMapFeatureProperties>
              id="country-browser-map"
              data={mapGeoJson}
              type="fill"
              fillColor={theme === 'dark' ? '#2563eb' : '#60a5fa'}
              fillOpacity={theme === 'dark' ? 0.36 : 0.28}
              lineColor={theme === 'dark' ? '#bfdbfe' : '#1d4ed8'}
              lineWidth={1.1}
              hoverable
              onFeatureClick={handleFeatureClick}
              onFeatureHover={handleFeatureHover}
            />
            {/* Like the former DOM markers, every country keeps its badge even in dense Europe. */}
            {isBadgeFontReady && <CountryBadgesLayer badges={badges} theme={theme} allowOverlap />}
          </GeoMap>

          <div
            ref={hoverCardRef}
            className={styles.hoverCard}
            data-visible={hoveredCountry !== null}
            aria-hidden="true"
          >
            {hoveredCountry && (
              <>
                <div className={styles.hoverCardHeader}>
                  <span className={styles.hoverCardFlag}>{hoveredCountry.flag}</span>
                  <div>
                    <div className={styles.hoverCardTitle}>
                      {localizedNames.get(hoveredCountry.code) ?? hoveredCountry.name}
                    </div>
                    {hoveredSummary?.year !== null && hoveredSummary?.year !== undefined && (
                      <div className={styles.hoverCardSubtitle}>{hoveredSummary.year}</div>
                    )}
                  </div>
                </div>

                <div className={styles.hoverCardMetrics}>
                  {(hoveredMetrics ?? [
                    { label: summaryText.totalPopulation, value: loadingMetricsText },
                    { label: t.common.median, value: loadingMetricsText },
                    { label: summaryText.dependencyRatio, value: loadingMetricsText },
                    { label: summaryText.sexRatio, value: loadingMetricsText },
                  ]).map((metric) => (
                    <div key={metric.label} className={styles.hoverMetric}>
                      <div className={styles.hoverMetricLabel}>{metric.label}</div>
                      <div className={styles.hoverMetricValue}>{metric.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.statusBar}>
          <div className={styles.statusText}>
            {hoveredCountry ? (
              <>
                <span className={styles.statusTextStrong}>{hoveredCountry.flag} {localizedNames.get(hoveredCountry.code) ?? hoveredCountry.name}</span>
                {' '}
                {t.countryBrowser.mapHoverHint}
              </>
            ) : (
              t.countryBrowser.mapPrompt
            )}
          </div>
          <div className={styles.statusHint}>{t.countryBrowser.mapHint}</div>
        </div>
      </div>
    </div>
  );
}
