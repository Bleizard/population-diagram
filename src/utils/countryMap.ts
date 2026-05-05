import type { CountryMeta } from '../data/countries';
import polylabel from 'polylabel';

const GEO_CODE_ALIASES: Record<string, string> = {
  GR: 'EL',
};

const GEO_NAME_OVERRIDES: Record<string, string> = {
  France: 'FR',
  Norway: 'NO',
};

export type CountryMapFeatureProperties = GeoJSON.GeoJsonProperties & {
  code: string;
  flag: string;
  localizedName: string;
  mapLabel: string;
};

function getFeatureName(properties: GeoJSON.GeoJsonProperties | null | undefined): string | null {
  const rawName = properties?.name;
  return typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;
}

export function resolveCountryCodeFromFeature(
  properties: GeoJSON.GeoJsonProperties | null | undefined
): string | null {
  const alpha2 = properties?.['ISO3166-1-Alpha-2'];

  if (typeof alpha2 === 'string' && alpha2.trim() && alpha2 !== '-99') {
    return GEO_CODE_ALIASES[alpha2] ?? alpha2;
  }

  const name = getFeatureName(properties);
  if (name && GEO_NAME_OVERRIDES[name]) {
    return GEO_NAME_OVERRIDES[name];
  }

  return null;
}

export function createCountryMapGeoJson(
  rawGeoJson: GeoJSON.GeoJSON,
  countries: CountryMeta[],
  localizedNames: Map<string, string>
): GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryMapFeatureProperties> {
  const countryMap = new Map(countries.map((country) => [country.code, country]));
  const features =
    rawGeoJson.type === 'FeatureCollection'
      ? rawGeoJson.features
      : rawGeoJson.type === 'Feature'
        ? [rawGeoJson]
        : [];

  const mappedFeatures: GeoJSON.Feature<GeoJSON.Geometry, CountryMapFeatureProperties>[] = [];

  for (const feature of features) {
    const code = resolveCountryCodeFromFeature(feature.properties);
    if (!code) continue;

    const country = countryMap.get(code);
    if (!country) continue;

    const localizedName = localizedNames.get(code) ?? country.name;
    mappedFeatures.push({
      type: 'Feature',
      id: feature.id ?? code,
      geometry: feature.geometry,
      properties: {
        ...(feature.properties ?? {}),
        code,
        flag: country.flag,
        localizedName,
        mapLabel: `${country.flag} ${localizedName}`,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features: mappedFeatures,
  };
}

export function getGeoJsonBounds(geoJson: GeoJSON.GeoJSON): [number, number, number, number] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visitCoordinates = (value: unknown) => {
    if (!Array.isArray(value)) return;

    if (
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      const [lng, lat] = value as [number, number];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      return;
    }

    for (const item of value) {
      visitCoordinates(item);
    }
  };

  const visitGeometry = (geometry: GeoJSON.Geometry) => {
    if (geometry.type === 'GeometryCollection') {
      for (const nestedGeometry of geometry.geometries) {
        visitGeometry(nestedGeometry);
      }
      return;
    }

    visitCoordinates(geometry.coordinates);
  };

  const features =
    geoJson.type === 'FeatureCollection'
      ? geoJson.features
      : geoJson.type === 'Feature'
        ? [geoJson]
        : [];

  for (const feature of features) {
    visitGeometry(feature.geometry);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
    return null;
  }

  return [minLng, minLat, maxLng, maxLat];
}

function ringBBoxArea(ring: GeoJSON.Position[]): number {
  if (ring.length === 0) return 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const coord of ring) {
    if (coord[0] < minX) minX = coord[0];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[1] > maxY) maxY = coord[1];
  }

  return (maxX - minX) * (maxY - minY);
}

export function getGeometryLabelPoint(geometry: GeoJSON.Geometry): [number, number] | null {
  if (geometry.type === 'Point') {
    return geometry.coordinates as [number, number];
  }

  if (geometry.type === 'MultiPoint' && geometry.coordinates.length > 0) {
    return geometry.coordinates[0] as [number, number];
  }

  if (geometry.type === 'LineString' && geometry.coordinates.length > 0) {
    const mid = Math.floor(geometry.coordinates.length / 2);
    return geometry.coordinates[mid] as [number, number];
  }

  if (geometry.type === 'MultiLineString' && geometry.coordinates.length > 0) {
    const line = geometry.coordinates[0];
    const mid = Math.floor(line.length / 2);
    return line[mid] as [number, number];
  }

  if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
    const result = polylabel(geometry.coordinates as number[][][], 1.0);
    return [result[0], result[1]];
  }

  if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 0) {
    let largestPolygon: GeoJSON.Position[][] | null = null;
    let largestArea = 0;

    for (const polygon of geometry.coordinates) {
      if (polygon.length === 0) continue;
      const area = ringBBoxArea(polygon[0]);
      if (area > largestArea) {
        largestArea = area;
        largestPolygon = polygon;
      }
    }

    if (largestPolygon) {
      const result = polylabel(largestPolygon as number[][][], 1.0);
      return [result[0], result[1]];
    }
  }

  if (geometry.type === 'GeometryCollection') {
    for (const nestedGeometry of geometry.geometries) {
      const point = getGeometryLabelPoint(nestedGeometry);
      if (point) return point;
    }
  }

  return null;
}
