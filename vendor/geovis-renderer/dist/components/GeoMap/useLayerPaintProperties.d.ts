import type maplibregl from 'maplibre-gl';
interface UseLayerPaintPropertiesArgs {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    hoverable: boolean;
    fillColor: unknown;
    fillOpacity: unknown;
    fillPattern?: unknown;
    hoverFillColor?: unknown;
    hoverFillOpacity?: number;
    lineColor: unknown;
    lineWidth: unknown;
    lineOpacity: unknown;
    hoverLineColor?: unknown;
    hoverLineWidth?: number;
    circleRadius: unknown;
    circleColor: unknown;
    circleOpacity: unknown;
    circleStrokeColor: unknown;
    circleStrokeWidth: unknown;
    layerIdFill: string;
    layerIdLine: string;
    layerIdCircle: string;
}
export declare function useLayerPaintProperties({ map, isLoaded, hoverable, fillColor, fillOpacity, fillPattern, hoverFillColor, hoverFillOpacity, lineColor, lineWidth, lineOpacity, hoverLineColor, hoverLineWidth, circleRadius, circleColor, circleOpacity, circleStrokeColor, circleStrokeWidth, layerIdFill, layerIdLine, layerIdCircle, }: UseLayerPaintPropertiesArgs): void;
export {};
//# sourceMappingURL=useLayerPaintProperties.d.ts.map