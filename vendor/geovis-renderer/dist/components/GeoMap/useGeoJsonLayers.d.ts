import type maplibregl from 'maplibre-gl';
interface UseGeoJsonLayersArgs {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    data?: GeoJSON.GeoJSON | string | null;
    id: string;
    type: 'fill' | 'line' | 'circle';
    visible: boolean;
    minZoom?: number;
    maxZoom?: number;
    filter?: unknown[];
    sourceId: string;
    labelSourceId: string;
    layerIdFill: string;
    layerIdLine: string;
    layerIdCircle: string;
    layerIdLabel: string;
    fillColor: unknown;
    fillOpacity: unknown;
    fillPattern?: unknown;
    lineColor: unknown;
    lineWidth: unknown;
    lineOpacity: unknown;
    lineDashArray?: number[];
    lineCap?: 'butt' | 'round' | 'square';
    lineJoin?: 'bevel' | 'round' | 'miter';
    circleRadius: unknown;
    circleColor: unknown;
    circleOpacity: unknown;
    circleStrokeColor: unknown;
    circleStrokeWidth: unknown;
}
export declare function useGeoJsonLayers({ map, isLoaded, data, id, type, visible, minZoom, maxZoom, filter, sourceId, labelSourceId, layerIdFill, layerIdLine, layerIdCircle, layerIdLabel, fillColor, fillOpacity, fillPattern, lineColor, lineWidth, lineOpacity, lineDashArray, lineCap, lineJoin, circleRadius, circleColor, circleOpacity, circleStrokeColor, circleStrokeWidth, }: UseGeoJsonLayersArgs): void;
export {};
//# sourceMappingURL=useGeoJsonLayers.d.ts.map