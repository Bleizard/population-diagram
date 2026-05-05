/**
 * geovis — Geographic Data Visualization Library
 *
 * A React library for creating interactive maps and visualizing geographic data.
 * Built on top of MapLibre GL JS.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```tsx
 * import { GeoMap, GeoJsonLayer } from 'geovis';
 *
 * function App() {
 *   return (
 *     <GeoMap
 *       style="positron"
 *       viewport={{ center: [37.6173, 55.7558], zoom: 10 }}
 *     >
 *       <GeoJsonLayer
 *         id="regions"
 *         data={geoJsonData}
 *         fillColor="#3b82f6"
 *         hoverable
 *         onFeatureClick={(e) => console.log(e.feature.properties)}
 *       />
 *     </GeoMap>
 *   );
 * }
 * ```
 */
export { GeoMap } from './components/GeoMap';
export { GeoJsonLayer } from './components/GeoMap';
export { Popup } from './components/GeoMap';
export { useGeoMap } from './components/GeoMap';
export { useMapControls } from './hooks';
export { MAP_STYLE_URLS, DEFAULT_STYLE_PRESET } from './constants';
export type { GeoCoordinates, GeoBounds, MapViewport, MapStyle, MapStylePreset, GeoMapProps, GeoJsonLayerProps, PopupProps, FeatureEvent, FeatureClickHandler, FeatureHoverHandler, TypedFeature, FillStyleProps, LineStyleProps, CircleStyleProps, LabelStyleProps, BaseLayerProps, TextAnchor, DataDrivenValue, ColorValue, LayerType, MapControls, GeoMapContextValue, Map, StyleSpecification, LngLatBoundsLike, FitBoundsOptions, FlyToOptions, EaseToOptions, } from './types';
//# sourceMappingURL=index.d.ts.map