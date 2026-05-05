/**
 * Built-in map style URLs
 *
 * These are free, publicly available map styles that don't require API keys.
 */
import type { StyleSpecification } from 'maplibre-gl';
import type { MapStylePreset, MapStyle } from '../types';
/**
 * Map style URLs by preset name.
 */
export declare const MAP_STYLE_URLS: Record<MapStylePreset, string>;
/**
 * Default map style preset.
 */
export declare const DEFAULT_STYLE_PRESET: MapStylePreset;
/**
 * Resolve a MapStyle to a URL string or StyleSpecification.
 *
 * @param style - Style preset name, URL, or StyleSpecification
 * @returns URL string or the original StyleSpecification
 */
export declare function resolveMapStyle(style: MapStyle): string | StyleSpecification;
//# sourceMappingURL=styles.d.ts.map