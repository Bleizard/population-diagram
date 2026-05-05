import type maplibregl from 'maplibre-gl';
interface UseGeoJsonSourceArgs {
    map: maplibregl.Map | null;
    isLoaded: boolean;
    data?: GeoJSON.GeoJSON | string | null;
    sourceId: string;
}
export declare function useGeoJsonSource({ map, isLoaded, data, sourceId, }: UseGeoJsonSourceArgs): void;
export {};
//# sourceMappingURL=useGeoJsonSource.d.ts.map