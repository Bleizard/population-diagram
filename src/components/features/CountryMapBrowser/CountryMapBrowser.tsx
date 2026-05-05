import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GeoMap, GeoJsonLayer, useGeoMap, useMapControls, type FeatureEvent, type MapStylePreset } from '@geovis/renderer';
import '@geovis/renderer/style.css';
import { Marker } from 'maplibre-gl';
import type { CountryMeta } from '../../../data/countries';
import type { Theme } from '../../../hooks';
import { useI18n } from '../../../i18n';
import { fetchCountrySummary, type CountrySummaryEntry } from '../../../services/countryDataLoader';
import { formatPopulation } from '../../../utils';
import {
  createCountryMapGeoJson,
  getGeoJsonBounds,
  getGeometryLabelPoint,
  type CountryMapFeatureProperties,
} from '../../../utils/countryMap';
import styles from './CountryMapBrowser.module.css';

interface CountryMapBrowserProps {
  countries: CountryMeta[];
  localizedNames: Map<string, string>;
  isLoading: boolean;
  theme: Theme;
}

interface HoverState {
  code: string;
  x: number;
  y: number;
}

const SUMMARY_TEXT_FALLBACK = {
  totalPopulation: 'Total population',
  dependencyRatio: 'Dependency ratio',
  sexRatio: 'Sex ratio',
  notAvailable: 'N/A',
};
const NATURE_WATER = '#5cb4e5';
const NATURE_LAND = '#a3dea7';
const NATURE_ROADS = '#adb6c7';

function shouldHideBaseLabelLayer(layer: { id?: string; type?: string; ['source-layer']?: string | undefined }): boolean {
  if (layer.type !== 'symbol') return false;

  const descriptor = `${layer.id ?? ''} ${layer['source-layer'] ?? ''}`.toLowerCase();
  return /country|place|settlement|state|city|town|village|continent/.test(descriptor);
}

function BaseMapLabelController() {
  const { map, isLoaded } = useGeoMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const hideLabels = () => {
      const style = map.getStyle();
      for (const layer of style.layers ?? []) {
        if (!shouldHideBaseLabelLayer(layer)) continue;

        try {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch {
          // Ignore style races while the base map is still updating.
        }
      }
    };

    hideLabels();
    map.on('styledata', hideLabels);

    return () => {
      map.off('styledata', hideLabels);
    };
  }, [isLoaded, map]);

  return null;
}

function NatureStyleController() {
  const { map, isLoaded } = useGeoMap();
  const desertsLoadedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const applyNatureColors = () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        const id = layer.id.toLowerCase();

        if (id.includes('water') && layer.type === 'fill') {
          try {
            map.setPaintProperty(layer.id, 'fill-color', NATURE_WATER);
          } catch {
            // Ignore provider-specific layers that do not accept this paint property.
          }
        }

        if (layer.id === 'background') {
          try {
            map.setPaintProperty(layer.id, 'background-color', NATURE_LAND);
          } catch {
            // Ignore style races while map style is initializing.
          }
        }

        const isRoadLine =
          layer.type === 'line' &&
          (id.includes('highway') || id.includes('motorway') || id.includes('road'));

        if (isRoadLine) {
          try {
            map.setPaintProperty(layer.id, 'line-color', NATURE_ROADS);
          } catch {
            // Some line layers may use a different paint schema.
          }
        }
      }
    };

    if (map.isStyleLoaded()) {
      applyNatureColors();
    } else {
      map.once('style.load', applyNatureColors);
    }

    map.on('styledata', applyNatureColors);
    return () => {
      map.off('styledata', applyNatureColors);
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const DESERTS_SOURCE = 'deserts-nature-source';
    const DESERTS_LAYER = 'deserts-nature-layer';
    let isCancelled = false;

    const safelyRemoveDeserts = () => {
      try {
        if (map.getLayer(DESERTS_LAYER)) {
          map.removeLayer(DESERTS_LAYER);
        }
      } catch {
        // Ignore teardown races while the map is being disposed.
      }

      try {
        if (map.getSource(DESERTS_SOURCE)) {
          map.removeSource(DESERTS_SOURCE);
        }
      } catch {
        // Ignore teardown races while the map is being disposed.
      }

      desertsLoadedRef.current = false;
    };

    const loadDeserts = async () => {
      if (desertsLoadedRef.current) return;

      try {
        const baseUrl = import.meta.env.BASE_URL;
        const response = await fetch(`${baseUrl}data/deserts_biome.geojson`);
        if (!response.ok) {
          throw new Error(`Failed to load deserts layer: ${response.status}`);
        }

        const data = await response.json();
        if (isCancelled) return;

        if (!map.getSource(DESERTS_SOURCE)) {
          map.addSource(DESERTS_SOURCE, {
            type: 'geojson',
            data,
          });
        }

        if (!map.getLayer(DESERTS_LAYER)) {
          const style = map.getStyle();
          let beforeId: string | undefined;

          if (style?.layers) {
            for (const layer of style.layers) {
              if (layer.id !== 'background') {
                beforeId = layer.id;
                break;
              }
            }
          }

          map.addLayer(
            {
              id: DESERTS_LAYER,
              type: 'fill',
              source: DESERTS_SOURCE,
              paint: {
                'fill-color': '#f5f1e3',
                'fill-opacity': 1,
              },
            },
            beforeId
          );
        }

        desertsLoadedRef.current = true;
      } catch (error) {
        console.error('[Nature deserts] Failed to load:', error);
      }
    };

    const handleStyleData = () => {
      void loadDeserts();
    };

    if (map.isStyleLoaded()) {
      void loadDeserts();
    } else {
      map.once('style.load', handleStyleData);
    }

    map.on('styledata', handleStyleData);

    return () => {
      isCancelled = true;
      map.off('styledata', handleStyleData);
      safelyRemoveDeserts();
    };
  }, [isLoaded, map]);

  return null;
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

function CountryFlagMarkers({
  data,
  theme,
}: {
  data: GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryMapFeatureProperties> | null;
  theme: Theme;
}) {
  const { map, isLoaded } = useGeoMap();

  useEffect(() => {
    if (!map || !isLoaded || !data) return;

    const markers: Marker[] = [];

    for (const feature of data.features) {
      const properties = feature.properties;
      if (!properties?.flag) continue;

      const point = getGeometryLabelPoint(feature.geometry);
      if (!point) continue;

      const element = document.createElement('div');
      element.className = styles.flagMarker;
      element.dataset.theme = theme;
      element.textContent = properties.flag;

      const marker = new Marker({
        element,
        anchor: 'center',
      })
        .setLngLat(point)
        .addTo(map as unknown as Parameters<Marker['addTo']>[0]);

      markers.push(marker);
    }

    return () => {
      for (const marker of markers) {
        marker.remove();
      }
    };
  }, [data, isLoaded, map, theme]);

  return null;
}

function CountryNameMarkers({
  data,
  theme,
}: {
  data: GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryMapFeatureProperties> | null;
  theme: Theme;
}) {
  const { map, isLoaded } = useGeoMap();

  useEffect(() => {
    if (!map || !isLoaded || !data) return;

    const markers: Marker[] = [];

    for (const feature of data.features) {
      const properties = feature.properties;
      if (!properties?.localizedName) continue;

      const point = getGeometryLabelPoint(feature.geometry);
      if (!point) continue;

      const element = document.createElement('div');
      element.className = styles.nameMarker;
      element.dataset.theme = theme;
      element.textContent = properties.localizedName;

      const marker = new Marker({
        element,
        anchor: 'top',
        offset: [0, 18],
      })
        .setLngLat(point)
        .addTo(map as unknown as Parameters<Marker['addTo']>[0]);

      markers.push(marker);
    }

    return () => {
      for (const marker of markers) {
        marker.remove();
      }
    };
  }, [data, isLoaded, map, theme]);

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
  const [rawGeoJson, setRawGeoJson] = useState<GeoJSON.GeoJSON | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const [countrySummaries, setCountrySummaries] = useState<Record<string, CountrySummaryEntry>>({});

  useEffect(() => {
    let isCancelled = false;

    const loadMapData = async () => {
      setIsMapLoading(true);
      setMapError(null);

      try {
        const baseUrl = import.meta.env.BASE_URL;
        const response = await fetch(`${baseUrl}data/world-countries.geojson`);
        if (!response.ok) {
          throw new Error(`Failed to load map data: ${response.status}`);
        }

        const json = await response.json();
        if (!isCancelled) {
          setRawGeoJson(json);
        }
      } catch (error) {
        if (!isCancelled) {
          setMapError(error instanceof Error ? error.message : 'Failed to load map data');
        }
      } finally {
        if (!isCancelled) {
          setIsMapLoading(false);
        }
      }
    };

    loadMapData();

    return () => {
      isCancelled = true;
    };
  }, []);

  const mapGeoJson = useMemo(() => {
    if (!rawGeoJson) return null;
    return createCountryMapGeoJson(rawGeoJson, countries, localizedNames);
  }, [countries, localizedNames, rawGeoJson]);

  useEffect(() => {
    let isCancelled = false;

    Promise.allSettled(
      countries.map(async (country) => ({
        code: country.code,
        summary: await fetchCountrySummary(country.code),
      }))
    ).then((results) => {
      if (isCancelled) return;

      setCountrySummaries((prev) => {
        const next = { ...prev };

        for (const result of results) {
          if (result.status !== 'fulfilled') continue;
          next[result.value.code] = result.value.summary;
        }

        return next;
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [countries]);

  const hoveredCode = hoverState?.code ?? null;
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
    if (!event?.feature.properties?.code) {
      setHoverState(null);
      return;
    }

    const rect = mapFrameRef.current?.getBoundingClientRect();
    if (!rect) {
      setHoverState({ code: event.feature.properties.code, x: 16, y: 16 });
      return;
    }

    const tooltipWidth = 280;
    const tooltipHeight = 172;
    const rawX = event.originalEvent.clientX - rect.left + 16;
    const rawY = event.originalEvent.clientY - rect.top - tooltipHeight / 2;
    const x = Math.min(Math.max(12, rawX), Math.max(12, rect.width - tooltipWidth - 12));
    const y = Math.min(Math.max(12, rawY), Math.max(12, rect.height - tooltipHeight - 12));

    setHoverState({
      code: event.feature.properties.code,
      x,
      y,
    });
  }, []);

  const mapStyle: MapStylePreset = 'nature';
  const summaryText = t.summary ?? SUMMARY_TEXT_FALLBACK;
  const loadingMetricsText = 'Loading...';
  const hoveredMetrics = hoveredSummary ? [
    { label: summaryText.totalPopulation, value: formatPopulation(hoveredSummary.metrics.totalPopulation) },
    { label: t.common.median, value: hoveredSummary.metrics.medianAge !== null ? `${hoveredSummary.metrics.medianAge}` : summaryText.notAvailable },
    { label: summaryText.dependencyRatio, value: hoveredSummary.metrics.dependencyRatio !== null ? `${hoveredSummary.metrics.dependencyRatio.toFixed(1)}%` : summaryText.notAvailable },
    { label: summaryText.sexRatio, value: hoveredSummary.metrics.sexRatio !== null ? `${hoveredSummary.metrics.sexRatio.toFixed(1)}` : summaryText.notAvailable },
  ] : null;

  if (isMapLoading) {
    return <div className={styles.loading}>{t.countryBrowser.mapLoading}</div>;
  }

  if (mapError || !mapGeoJson) {
    return <div className={styles.error}>{t.countryBrowser.mapUnavailable}</div>;
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
            {mapStyle === 'nature' && <NatureStyleController />}
            <BaseMapLabelController />
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
            <CountryFlagMarkers data={mapGeoJson} theme={theme} />
            <CountryNameMarkers data={mapGeoJson} theme={theme} />
          </GeoMap>

          {hoverState && hoveredCountry && (
            <div
              className={styles.hoverCard}
              style={{ left: `${hoverState.x}px`, top: `${hoverState.y}px` }}
            >
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
            </div>
          )}
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
