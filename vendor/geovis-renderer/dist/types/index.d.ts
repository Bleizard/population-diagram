/**
 * geovis — Core type definitions
 *
 * @packageDocumentation
 */
import type { Map, StyleSpecification, LngLatBoundsLike, FitBoundsOptions, FlyToOptions, EaseToOptions, MapGeoJSONFeature } from 'maplibre-gl';
export type { Map, StyleSpecification, LngLatBoundsLike, FitBoundsOptions, FlyToOptions, EaseToOptions };
/**
 * Geographic coordinates as [longitude, latitude] tuple.
 *
 * @example
 * ```ts
 * const moscow: GeoCoordinates = [37.6173, 55.7558];
 * ```
 */
export type GeoCoordinates = [longitude: number, latitude: number];
/**
 * Bounding box as [west, south, east, north] tuple.
 *
 * @example
 * ```ts
 * const europeBounds: GeoBounds = [-10, 35, 40, 70];
 * ```
 */
export type GeoBounds = [west: number, south: number, east: number, north: number];
/**
 * Map viewport state — describes the current view of the map.
 */
export interface MapViewport {
    /** Center coordinates [lng, lat] */
    center: GeoCoordinates;
    /** Zoom level (0-22) */
    zoom: number;
    /** Bearing/rotation in degrees (0-360), default 0 */
    bearing?: number;
    /** Pitch/tilt in degrees (0-85), default 0 */
    pitch?: number;
}
/**
 * Built-in map style identifiers.
 */
export type MapStylePreset = 'liberty' | 'bright' | 'positron' | 'dark-matter' | 'nature' | 'custom';
/**
 * Map style — can be a preset name, URL, or full StyleSpecification.
 */
export type MapStyle = MapStylePreset | string | StyleSpecification;
/**
 * Callback for map load event.
 */
export type MapLoadHandler = (map: Map) => void;
/**
 * Callback for viewport change events.
 */
export type ViewportChangeHandler = (viewport: MapViewport) => void;
/**
 * Props for the main GeoMap component.
 */
export interface GeoMapProps {
    /**
     * Initial viewport settings.
     * @default { center: [37.6173, 55.7558], zoom: 4 } // Moscow
     */
    viewport?: Partial<MapViewport>;
    /**
     * Map style — preset name, URL, or StyleSpecification.
     * @default 'positron'
     */
    style?: MapStyle;
    /** CSS class for the map container */
    className?: string;
    /** Inline styles for the map container */
    containerStyle?: React.CSSProperties;
    /**
     * Called when the map has finished loading and is ready.
     * Receives the MapLibre Map instance.
     */
    onLoad?: MapLoadHandler;
    /**
     * Called when the viewport changes (pan, zoom, rotate).
     * Useful for controlled viewport scenarios.
     */
    onViewportChange?: ViewportChangeHandler;
    /**
     * Enable map controls (zoom buttons, compass).
     * @default true
     */
    controls?: boolean;
    /**
     * Enable scroll zoom.
     * @default true
     */
    scrollZoom?: boolean;
    /**
     * Enable drag to pan.
     * @default true
     */
    dragPan?: boolean;
    /** Child components (layers, markers, etc.) */
    children?: React.ReactNode;
}
/**
 * Context value provided by GeoMap to child components.
 */
export interface GeoMapContextValue {
    /** MapLibre Map instance, null before load */
    map: Map | null;
    /** Whether the map has finished loading */
    isLoaded: boolean;
}
/**
 * Supported layer rendering types.
 */
export type LayerType = 'fill' | 'line' | 'circle' | 'symbol';
/**
 * CSS-like color value.
 */
export type ColorValue = string;
/**
 * Data-driven expression or static value.
 *
 * @example
 * ```ts
 * // Static value
 * fillColor: '#3b82f6'
 *
 * // Data-driven expression
 * fillColor: ['get', 'color']
 *
 * // Interpolation based on property
 * fillColor: [
 *   'interpolate', ['linear'], ['get', 'population'],
 *   0, '#f0f0f0',
 *   1000000, '#3b82f6'
 * ]
 * ```
 */
export type DataDrivenValue<T> = T | unknown[];
/**
 * Feature with properties of a known type.
 */
export interface TypedFeature<P = GeoJSON.GeoJsonProperties> extends Omit<GeoJSON.Feature, 'properties'> {
    properties: P;
}
/**
 * Event data for feature interactions.
 */
export interface FeatureEvent<P = GeoJSON.GeoJsonProperties> {
    /** The clicked/hovered feature */
    feature: TypedFeature<P>;
    /** Original MapLibre feature (with additional metadata) */
    originalFeature: MapGeoJSONFeature;
    /** Coordinates where the event occurred */
    coordinates: GeoCoordinates;
    /** Original DOM event */
    originalEvent: MouseEvent;
}
/**
 * Handler for feature click events.
 */
export type FeatureClickHandler<P = GeoJSON.GeoJsonProperties> = (event: FeatureEvent<P>) => void;
/**
 * Handler for feature hover events.
 */
export type FeatureHoverHandler<P = GeoJSON.GeoJsonProperties> = (event: FeatureEvent<P> | null) => void;
/**
 * Base props shared by all layer types.
 */
export interface BaseLayerProps<P = GeoJSON.GeoJsonProperties> {
    /** Unique identifier for this layer */
    id: string;
    /**
     * GeoJSON data — can be a GeoJSON object or URL to fetch.
     */
    data: GeoJSON.GeoJSON | string;
    /**
     * Visibility of the layer.
     * @default true
     */
    visible?: boolean;
    /**
     * Z-order — layers with higher values render on top.
     * @default 0
     */
    zIndex?: number;
    /**
     * Enable hover interactions.
     * @default false
     */
    hoverable?: boolean;
    /**
     * Called when a feature is clicked.
     */
    onFeatureClick?: FeatureClickHandler<P>;
    /**
     * Called when mouse enters/leaves a feature.
     * Receives null when mouse leaves all features.
     */
    onFeatureHover?: FeatureHoverHandler<P>;
    /**
     * Filter expression to show only matching features.
     * Uses MapLibre filter syntax.
     *
     * @example
     * ```ts
     * filter={['==', ['get', 'type'], 'city']}
     * ```
     */
    filter?: unknown[];
    /**
     * Minimum zoom level at which the layer is visible.
     */
    minZoom?: number;
    /**
     * Maximum zoom level at which the layer is visible.
     */
    maxZoom?: number;
}
/**
 * Props specific to fill (polygon) layers.
 */
export interface FillStyleProps {
    /** Fill color */
    fillColor?: DataDrivenValue<ColorValue>;
    /** Fill opacity (0-1) */
    fillOpacity?: DataDrivenValue<number>;
    /** Fill pattern: sprite name or expression (e.g. show pattern when selected) */
    fillPattern?: string | unknown[];
}
/**
 * Props specific to line (stroke) layers.
 */
export interface LineStyleProps {
    /** Line/stroke color */
    lineColor?: DataDrivenValue<ColorValue>;
    /** Line width in pixels */
    lineWidth?: DataDrivenValue<number>;
    /** Line opacity (0-1) */
    lineOpacity?: DataDrivenValue<number>;
    /** Dash pattern [dash, gap, dash, gap, ...] */
    lineDashArray?: number[];
    /** Line cap style */
    lineCap?: 'butt' | 'round' | 'square';
    /** Line join style */
    lineJoin?: 'bevel' | 'round' | 'miter';
}
/**
 * Props specific to circle (point) layers.
 */
export interface CircleStyleProps {
    /** Circle radius in pixels */
    circleRadius?: DataDrivenValue<number>;
    /** Circle fill color */
    circleColor?: DataDrivenValue<ColorValue>;
    /** Circle opacity (0-1) */
    circleOpacity?: DataDrivenValue<number>;
    /** Circle stroke color */
    circleStrokeColor?: DataDrivenValue<ColorValue>;
    /** Circle stroke width in pixels */
    circleStrokeWidth?: DataDrivenValue<number>;
}
/**
 * Props for hover effect styling.
 *
 * @example Custom hover colors
 * ```tsx
 * <GeoJsonLayer
 *   id="regions"
 *   data={regionsGeoJson}
 *   fillColor="#3b82f6"
 *   hoverFillColor="#1d4ed8"
 *   hoverFillOpacity={0.8}
 *   hoverLineWidth={3}
 * />
 * ```
 */
export interface HoverStyleProps {
    /**
     * Fill color on hover. If not set, uses fillColor with increased opacity.
     */
    hoverFillColor?: ColorValue;
    /**
     * Fill opacity on hover (0-1).
     * @default fillOpacity + 0.2
     */
    hoverFillOpacity?: number;
    /**
     * Line color on hover.
     */
    hoverLineColor?: ColorValue;
    /**
     * Line width on hover.
     * @default lineWidth + 1
     */
    hoverLineWidth?: number;
}
/**
 * Text anchor position.
 */
export type TextAnchor = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
/**
 * Props for text labels on features.
 *
 * @example Show country names
 * ```tsx
 * <GeoJsonLayer
 *   id="countries"
 *   data={countriesGeoJson}
 *   labelField="name"
 *   labelSize={12}
 *   labelColor="#333"
 * />
 * ```
 *
 * @example Show formatted values
 * ```tsx
 * <GeoJsonLayer
 *   id="regions"
 *   data={regionsGeoJson}
 *   labelField={['concat', ['get', 'name'], '\n', ['get', 'population']]}
 *   labelSize={10}
 * />
 * ```
 */
export interface LabelStyleProps {
    /**
     * Property name or expression for label text.
     * Can be a string (property name) or MapLibre expression.
     *
     * @example
     * ```ts
     * labelField: 'name'  // Use 'name' property
     * labelField: ['get', 'title']  // Expression syntax
     * labelField: ['concat', ['get', 'name'], ' (', ['get', 'code'], ')']  // Formatted
     * ```
     */
    labelField?: string | unknown[];
    /**
     * Label text size in pixels.
     * @default 12
     */
    labelSize?: DataDrivenValue<number>;
    /**
     * Label text color.
     * @default '#333333'
     */
    labelColor?: DataDrivenValue<ColorValue>;
    /**
     * Label halo/outline color for better readability.
     * @default '#ffffff'
     */
    labelHaloColor?: ColorValue;
    /**
     * Label halo width in pixels.
     * @default 1
     */
    labelHaloWidth?: number;
    /**
     * Label font stack.
     * @default ['Open Sans Regular', 'Arial Unicode MS Regular']
     */
    labelFont?: string[];
    /**
     * Label anchor position relative to point.
     * @default 'center'
     */
    labelAnchor?: TextAnchor;
    /**
     * Offset [x, y] in pixels from anchor point.
     */
    labelOffset?: [number, number];
    /**
     * Minimum zoom level to show labels.
     */
    labelMinZoom?: number;
    /**
     * Maximum zoom level to show labels.
     */
    labelMaxZoom?: number;
    /**
     * Allow labels to overlap each other.
     * @default false
     */
    labelAllowOverlap?: boolean;
    /**
     * Format large numbers with K/M/B suffixes.
     * When enabled, numbers like 1000000 become "1M".
     * Only works when labelField is a property name (not an expression).
     *
     * @default false
     * @example
     * ```tsx
     * <GeoJsonLayer
     *   id="countries"
     *   data={countriesGeoJson}
     *   labelField="population"
     *   labelFormatNumbers={true}  // 45000000 → "45M"
     * />
     * ```
     */
    labelFormatNumbers?: boolean;
    /**
     * Filter expression for the label layer (e.g. hide small features at high zoom).
     * Uses MapLibre filter syntax.
     */
    labelFilter?: unknown[];
    /**
     * Label opacity: number (0–1) or MapLibre expression (e.g. zoom + feature-based).
     * Re-evaluates on zoom, so use for visibility by zoom/size instead of filter when filter doesn't update.
     * @default 1
     */
    labelOpacity?: number | unknown[];
}
/**
 * Props for GeoJsonLayer component — union of all layer type props.
 *
 * @example Fill layer (polygons)
 * ```tsx
 * <GeoJsonLayer
 *   id="countries"
 *   data={countriesGeoJson}
 *   type="fill"
 *   fillColor="#3b82f6"
 *   fillOpacity={0.5}
 *   lineColor="#1d4ed8"
 *   hoverable
 *   onFeatureClick={(e) => console.log(e.feature.properties)}
 * />
 * ```
 *
 * @example Circle layer (points)
 * ```tsx
 * <GeoJsonLayer
 *   id="cities"
 *   data={citiesGeoJson}
 *   type="circle"
 *   circleRadius={6}
 *   circleColor={['get', 'color']}
 * />
 * ```
 */
export interface GeoJsonLayerProps<P = GeoJSON.GeoJsonProperties> extends BaseLayerProps<P>, FillStyleProps, LineStyleProps, CircleStyleProps, LabelStyleProps, HoverStyleProps {
    /**
     * Layer rendering type.
     * - `fill`: Polygons with optional stroke
     * - `line`: Lines/strokes only
     * - `circle`: Points as circles
     *
     * @default 'fill'
     */
    type?: 'fill' | 'line' | 'circle';
}
/**
 * Controls for programmatic map manipulation.
 * Returned by useMapControls() hook.
 */
export interface MapControls {
    /**
     * Fit the map to the given bounds.
     */
    fitBounds: (bounds: GeoBounds | LngLatBoundsLike, options?: FitBoundsOptions) => void;
    /**
     * Fly to a location with animation.
     */
    flyTo: (options: FlyToOptions) => void;
    /**
     * Ease to a location with animation.
     */
    easeTo: (options: EaseToOptions) => void;
    /**
     * Jump to a location without animation.
     */
    jumpTo: (options: {
        center?: GeoCoordinates;
        zoom?: number;
        bearing?: number;
        pitch?: number;
    }) => void;
    /**
     * Set the map's zoom level.
     */
    setZoom: (zoom: number) => void;
    /**
     * Set the map's center.
     */
    setCenter: (center: GeoCoordinates) => void;
    /**
     * Get the current viewport state.
     */
    getViewport: () => MapViewport | null;
    /**
     * Get the current map bounds.
     */
    getBounds: () => GeoBounds | null;
}
/**
 * Popup anchor position relative to coordinates.
 */
export type PopupAnchor = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
/**
 * Props for the Popup component.
 *
 * @example
 * ```tsx
 * <Popup
 *   coordinates={[37.6173, 55.7558]}
 *   onClose={() => setIsOpen(false)}
 * >
 *   <h3>Moscow</h3>
 *   <p>Population: 12M</p>
 * </Popup>
 * ```
 */
export interface PopupProps {
    /**
     * Coordinates [lng, lat] where the popup is anchored.
     */
    coordinates: GeoCoordinates;
    /**
     * Content to display inside the popup.
     */
    children: React.ReactNode;
    /**
     * Called when the popup should close.
     */
    onClose?: () => void;
    /**
     * Additional CSS class for the popup container.
     */
    className?: string;
    /**
     * Anchor position of the popup relative to coordinates.
     * @default 'bottom'
     */
    anchor?: PopupAnchor;
    /**
     * Offset [x, y] in pixels from the anchor point.
     * @default [0, -10]
     */
    offset?: [number, number];
    /**
     * Show the close button.
     * @default true
     */
    closeButton?: boolean;
    /**
     * Close popup when clicking on it.
     * @default false
     */
    closeOnClick?: boolean;
    /**
     * Close popup when clicking elsewhere on the map.
     * @default true
     */
    closeOnMapClick?: boolean;
    /**
     * Maximum width of the popup.
     * @default '320px'
     */
    maxWidth?: string;
}
//# sourceMappingURL=index.d.ts.map