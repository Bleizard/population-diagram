/**
 * GeoMap — Main map component
 *
 * A React wrapper around MapLibre GL JS that provides:
 * - Declarative API for map configuration
 * - Context for child layer components
 * - Viewport change tracking
 *
 * @example
 * ```tsx
 * <GeoMap
 *   style="positron"
 *   viewport={{ center: [37.6173, 55.7558], zoom: 10 }}
 *   onViewportChange={(vp) => console.log(vp)}
 * >
 *   <GeoJsonLayer id="regions" data={geoJsonData} />
 * </GeoMap>
 * ```
 */
import { type ReactNode } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoMapProps } from '../../types';
/**
 * Main map component that wraps MapLibre GL JS.
 *
 * Provides React context to child components (layers, markers) for accessing
 * the underlying map instance.
 */
export declare function GeoMap({ viewport, style, className, containerStyle, onLoad, onViewportChange, controls, scrollZoom, dragPan, children, }: GeoMapProps): ReactNode;
//# sourceMappingURL=GeoMap.d.ts.map