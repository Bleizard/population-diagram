import type maplibregl from 'maplibre-gl';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { FeatureEvent, GeoCoordinates, GeoJsonLayerProps } from '../../types';
type CreateFeatureEvent<P> = (feature: MapGeoJSONFeature, coordinates: GeoCoordinates, originalEvent: MouseEvent) => FeatureEvent<P>;
interface UseFeatureHoverArgs<P> {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    hoverable: boolean;
    type: GeoJsonLayerProps['type'];
    sourceId: string;
    layerIdFill: string;
    layerIdCircle: string;
    hoveredFeatureId: React.MutableRefObject<string | number | null>;
    onFeatureHover?: (event: FeatureEvent<P> | null) => void;
    createFeatureEvent: CreateFeatureEvent<P>;
}
export declare function useFeatureHover<P>({ map, isLoaded, hoverable, type, sourceId, layerIdFill, layerIdCircle, hoveredFeatureId, onFeatureHover, createFeatureEvent, }: UseFeatureHoverArgs<P>): void;
export {};
//# sourceMappingURL=useFeatureHover.d.ts.map