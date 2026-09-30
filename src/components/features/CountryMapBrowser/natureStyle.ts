import type { StyleSpecification } from 'maplibre-gl';
import { MAP_STYLE_URLS } from '@geovis/renderer';

type LayerSpecification = StyleSpecification['layers'][number];

export const NATURE_COLORS = {
  water: '#5cb4e5',
  land: '#a3dea7',
  roads: '#adb6c7',
  desert: '#f5f1e3',
} as const;

const DESERTS_SOURCE_ID = 'nature-deserts';
const DESERTS_LAYER_ID = 'nature-deserts-fill';

/** Base map place labels are replaced by our own country badges. */
const HIDDEN_LABEL_PATTERN = /country|place|settlement|state|city|town|village|continent/;

function isHiddenLabelLayer(layer: LayerSpecification): boolean {
  if (layer.type !== 'symbol') return false;
  const descriptor = `${layer.id} ${'source-layer' in layer ? layer['source-layer'] ?? '' : ''}`.toLowerCase();
  return HIDDEN_LABEL_PATTERN.test(descriptor);
}

function withPaint<L extends LayerSpecification>(layer: L, paint: Record<string, unknown>): L {
  return { ...layer, paint: { ...layer.paint, ...paint } };
}

function recolorLayer(layer: LayerSpecification): LayerSpecification {
  const id = layer.id.toLowerCase();

  if (layer.type === 'background') {
    return withPaint(layer, { 'background-color': NATURE_COLORS.land });
  }
  if (layer.type === 'fill' && id.includes('water')) {
    return withPaint(layer, { 'fill-color': NATURE_COLORS.water });
  }
  if (layer.type === 'line' && /highway|motorway|road/.test(id)) {
    return withPaint(layer, { 'line-color': NATURE_COLORS.roads });
  }
  return layer;
}

/**
 * Turns Positron into the "nature" style: green land, blue water, deserts overlay,
 * no place labels.
 *
 * Done on the style JSON before the map is created instead of `styledata` listeners that
 * call getStyle() + setPaintProperty over every layer: no flash of default colours, and the
 * map does not wait for glyphs of labels that would be hidden anyway.
 */
export function createNatureStyle(base: StyleSpecification, desertsUrl: string): StyleSpecification {
  const layers: LayerSpecification[] = [];

  for (const layer of base.layers) {
    if (isHiddenLabelLayer(layer)) continue;

    layers.push(recolorLayer(layer));

    if (layer.type === 'background') {
      layers.push({
        id: DESERTS_LAYER_ID,
        type: 'fill',
        source: DESERTS_SOURCE_ID,
        paint: { 'fill-color': NATURE_COLORS.desert },
      });
    }
  }

  return {
    ...base,
    sources: {
      ...base.sources,
      // Given by URL, the GeoJSON is fetched and parsed in the MapLibre worker, not on the main thread.
      [DESERTS_SOURCE_ID]: {
        type: 'geojson',
        data: desertsUrl,
        // Decorative layer: stop tiling at z6 (overzoomed above) and simplify harder.
        maxzoom: 6,
        tolerance: 1,
      },
    },
    layers,
  };
}

export async function loadNatureStyle(desertsUrl: string, signal?: AbortSignal): Promise<StyleSpecification> {
  const response = await fetch(MAP_STYLE_URLS.positron, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load base map style: ${response.status}`);
  }
  return createNatureStyle((await response.json()) as StyleSpecification, desertsUrl);
}
