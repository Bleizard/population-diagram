import type maplibregl from 'maplibre-gl';
interface UseLayerVisibilityArgs {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    visible: boolean;
    layerIdFill: string;
    layerIdLine: string;
    layerIdCircle: string;
    layerIdLabel: string;
}
export declare function useLayerVisibility({ map, isLoaded, visible, layerIdFill, layerIdLine, layerIdCircle, layerIdLabel, }: UseLayerVisibilityArgs): void;
export {};
//# sourceMappingURL=useLayerVisibility.d.ts.map