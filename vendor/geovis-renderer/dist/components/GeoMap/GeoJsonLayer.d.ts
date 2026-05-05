/**
 * GeoJsonLayer — Renders GeoJSON data on the map
 *
 * Supports fill (polygons), line (strokes), circle (points), and text labels
 * with optional hover and click interactions.
 *
 * @example Basic fill layer
 * ```tsx
 * <GeoJsonLayer
 *   id="countries"
 *   data={countriesGeoJson}
 *   type="fill"
 *   fillColor="#3b82f6"
 *   fillOpacity={0.5}
 *   hoverable
 *   onFeatureClick={(e) => console.log(e.feature.properties.name)}
 * />
 * ```
 *
 * @example With labels
 * ```tsx
 * <GeoJsonLayer
 *   id="regions"
 *   data={regionsGeoJson}
 *   fillColor="#3b82f6"
 *   labelField="name"
 *   labelSize={12}
 *   labelColor="#333"
 * />
 * ```
 */
import type { GeoJsonLayerProps } from '../../types';
/**
 * Component that renders GeoJSON data as a layer on the map.
 */
export declare function GeoJsonLayer<P = GeoJSON.GeoJsonProperties>({ id, data, type, visible, minZoom, maxZoom, filter, fillColor, fillOpacity, fillPattern, lineColor, lineWidth, lineOpacity, lineDashArray, lineCap, lineJoin, circleRadius, circleColor, circleOpacity, circleStrokeColor, circleStrokeWidth, labelField, labelSize, labelColor, labelHaloColor, labelHaloWidth, labelFont, labelAnchor, labelOffset, labelMinZoom, labelMaxZoom, labelAllowOverlap, labelFormatNumbers, labelFilter, labelOpacity, hoverFillColor, hoverFillOpacity, hoverLineColor, hoverLineWidth, hoverable, onFeatureClick, onFeatureHover, }: GeoJsonLayerProps<P>): null;
//# sourceMappingURL=GeoJsonLayer.d.ts.map