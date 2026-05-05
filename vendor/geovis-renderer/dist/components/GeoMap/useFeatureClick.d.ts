import type maplibregl from 'maplibre-gl';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { FeatureEvent, GeoCoordinates, GeoJsonLayerProps } from '../../types';
type CreateFeatureEvent<P> = (feature: MapGeoJSONFeature, coordinates: GeoCoordinates, originalEvent: MouseEvent) => FeatureEvent<P>;
interface UseFeatureClickArgs<P> {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    type: GeoJsonLayerProps['type'];
    layerIdFill: string;
    layerIdLine: string;
    layerIdCircle: string;
    onFeatureClick?: (event: FeatureEvent<P>) => void;
    createFeatureEvent: CreateFeatureEvent<P>;
}
export declare function useFeatureClick<P>({ map, isLoaded, type, layerIdFill, layerIdLine, layerIdCircle, onFeatureClick, createFeatureEvent, }: UseFeatureClickArgs<P>): void;
export {};
//# sourceMappingURL=useFeatureClick.d.ts.map