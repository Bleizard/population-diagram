import type maplibregl from 'maplibre-gl';
import type { GeoJsonLayerProps } from '../../types';
interface UseLabelLayerArgs {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    data: GeoJSON.GeoJSON | null | undefined;
    labelField?: GeoJsonLayerProps['labelField'];
    labelFormatNumbers: boolean;
    labelFilter?: GeoJsonLayerProps['labelFilter'];
    labelOpacity?: GeoJsonLayerProps['labelOpacity'];
    labelSize: number;
    labelColor: string;
    labelHaloColor: string;
    labelHaloWidth: number;
    labelFont: string[];
    labelAnchor: GeoJsonLayerProps['labelAnchor'];
    labelOffset?: GeoJsonLayerProps['labelOffset'];
    labelMinZoom?: number;
    labelMaxZoom?: number;
    labelAllowOverlap: boolean;
    minZoom?: number;
    maxZoom?: number;
    labelSourceId: string;
    layerIdLabel: string;
}
export declare function useLabelLayer({ map, isLoaded, data, labelField, labelFormatNumbers, labelFilter, labelOpacity, labelSize, labelColor, labelHaloColor, labelHaloWidth, labelFont, labelAnchor, labelOffset, labelMinZoom, labelMaxZoom, labelAllowOverlap, minZoom, maxZoom, labelSourceId, layerIdLabel, }: UseLabelLayerArgs): void;
export {};
//# sourceMappingURL=useLabelLayer.d.ts.map