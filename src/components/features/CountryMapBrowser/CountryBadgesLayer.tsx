import { useEffect, useMemo, useRef } from 'react';
import { useGeoMap } from '@geovis/renderer';
import type { GeoJSONSource, MapStyleImageMissingEvent } from 'maplibre-gl';

import type { Theme } from '../../../hooks';
import { BADGE_ANCHOR_Y, BADGE_COLLISION_PADDING, drawCountryBadge } from './countryBadgeImage';

export interface CountryBadge {
  code: string;
  flag: string;
  name: string;
  point: [number, number];
  /** Higher value wins label collisions (e.g. country area). */
  priority: number;
}

interface BadgeProperties {
  code: string;
  priority: number;
}

const SOURCE_ID = 'country-badges-source';
const LAYER_ID = 'country-badges';
const IMAGE_PREFIX = 'country-badge:';

const EMPTY_COLLECTION: GeoJSON.FeatureCollection<GeoJSON.Point, BadgeProperties> = {
  type: 'FeatureCollection',
  features: [],
};

function toFeatureCollection(badges: CountryBadge[]): GeoJSON.FeatureCollection<GeoJSON.Point, BadgeProperties> {
  return {
    type: 'FeatureCollection',
    features: badges.map((badge) => ({
      type: 'Feature',
      properties: { code: badge.code, priority: badge.priority },
      geometry: { type: 'Point', coordinates: badge.point },
    })),
  };
}

const codeFromImageId = (imageId: string) => imageId.slice(IMAGE_PREFIX.length).split(':')[1];

interface CountryBadgesLayerProps {
  badges: CountryBadge[];
  theme: Theme;
  /**
   * Show every badge even when they overlap. With `false`, collision detection hides
   * overlapping badges and larger countries (higher priority) win.
   */
  allowOverlap?: boolean;
}

/**
 * Flag + name badge for every country, rendered by MapLibre as one GPU symbol layer.
 *
 * Replaces two DOM markers per country (with backdrop blur), which were repositioned and
 * re-composited on every camera frame and made panning/zooming stutter. Here the per-frame
 * cost does not depend on the number of countries.
 */
export function CountryBadgesLayer({ badges, theme, allowOverlap = false }: CountryBadgesLayerProps) {
  const { map, isLoaded } = useGeoMap();
  const badgesByCode = useMemo(() => new Map(badges.map((badge) => [badge.code, badge])), [badges]);
  const badgesByCodeRef = useRef(badgesByCode);
  /** imageId → name it was drawn with, to redraw badges after a language switch. */
  const drawnNamesRef = useRef(new Map<string, string>());

  // Badge images are rasterised lazily: MapLibre requests only those it lays out.
  // Registered before the layer is added so the very first requests are served.
  useEffect(() => {
    if (!map || !isLoaded) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const drawnNames = drawnNamesRef.current;

    const handleMissingImage = ({ id }: MapStyleImageMissingEvent) => {
      if (!id.startsWith(IMAGE_PREFIX) || map.hasImage(id)) return;

      const [badgeTheme, code] = id.slice(IMAGE_PREFIX.length).split(':');
      const badge = badgesByCodeRef.current.get(code);
      if (!badge) return;

      const image = drawCountryBadge({ flag: badge.flag, name: badge.name, theme: badgeTheme as Theme }, pixelRatio);
      map.addImage(id, image, { pixelRatio });
      drawnNames.set(id, badge.name);
    };

    map.on('styleimagemissing', handleMissingImage);

    return () => {
      map.off('styleimagemissing', handleMissingImage);
      drawnNames.clear();
      try {
        for (const imageId of map.listImages()) {
          if (imageId.startsWith(IMAGE_PREFIX)) map.removeImage(imageId);
        }
      } catch {
        // Map may already be disposed on unmount.
      }
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY_COLLECTION });
    map.addLayer({
      id: LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'icon-anchor': 'top',
        'icon-offset': [0, -BADGE_ANCHOR_Y],
        'icon-padding': [BADGE_COLLISION_PADDING],
        'symbol-sort-key': ['-', ['get', 'priority']],
      },
    });

    return () => {
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map may already be disposed on unmount.
      }
    };
  }, [isLoaded, map]);

  useEffect(() => {
    badgesByCodeRef.current = badgesByCode;
    if (!map || !isLoaded) return;

    // Names changed (language switch): drop stale images, MapLibre requests them again.
    for (const [imageId, drawnName] of drawnNamesRef.current) {
      const badge = badgesByCode.get(codeFromImageId(imageId));
      if (badge && badge.name !== drawnName && map.hasImage(imageId)) {
        map.removeImage(imageId);
        drawnNamesRef.current.delete(imageId);
      }
    }

    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(toFeatureCollection(badges));
  }, [badges, badgesByCode, isLoaded, map]);

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, 'icon-image', ['concat', `${IMAGE_PREFIX}${theme}:`, ['get', 'code']]);
  }, [isLoaded, map, theme]);

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, 'icon-allow-overlap', allowOverlap);
    map.setLayoutProperty(LAYER_ID, 'icon-ignore-placement', allowOverlap);
  }, [allowOverlap, isLoaded, map]);

  return null;
}
