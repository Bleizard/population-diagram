import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import polylabel from 'polylabel';

const ROOT_DIR = new URL('..', import.meta.url);
const PUBLIC_DATA_DIR = new URL('../public/data/', import.meta.url);

const WORLD_INPUT_PATH = new URL('../public/data/world-countries.geojson', import.meta.url);
const WORLD_OUTPUT_PATH = new URL('../public/data/world-countries.optimized.geojson', import.meta.url);
const DESERTS_INPUT_PATH = new URL('../public/data/deserts_biome.geojson', import.meta.url);
const DESERTS_OUTPUT_PATH = new URL('../public/data/deserts_biome.optimized.geojson', import.meta.url);

const WORLD_SIMPLIFY_TOLERANCE = 0.12;
const DESERTS_SIMPLIFY_TOLERANCE = 0.2;
const WORLD_ROUNDING_DECIMALS = 4;
/** Deserts are background decoration: ~1 km precision is enough. */
const DESERTS_ROUNDING_DECIMALS = 2;
/** Desert patches whose outer ring bbox is below this (deg², ~600 km²) are invisible at map zooms. */
const DESERTS_MIN_POLYGON_BBOX_AREA = 0.05;

function roundCoordinate(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function pointsEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function squareDistance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function squareSegmentDistance(point, segmentStart, segmentEnd) {
  let x = segmentStart[0];
  let y = segmentStart[1];
  let dx = segmentEnd[0] - x;
  let dy = segmentEnd[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = segmentEnd[0];
      y = segmentEnd[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyRadialDistance(points, sqTolerance) {
  if (points.length <= 2) return points.slice();

  const simplified = [points[0]];
  let previous = points[0];

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (squareDistance(point, previous) > sqTolerance) {
      simplified.push(point);
      previous = point;
    }
  }

  const lastPoint = points[points.length - 1];
  if (!pointsEqual(previous, lastPoint)) {
    simplified.push(lastPoint);
  }

  return simplified;
}

function simplifyDouglasPeucker(points, sqTolerance) {
  const lastIndex = points.length - 1;
  const markerArray = new Uint8Array(points.length);
  const stack = [[0, lastIndex]];
  markerArray[0] = 1;
  markerArray[lastIndex] = 1;

  while (stack.length > 0) {
    const [firstIndex, endIndex] = stack.pop();
    let maxSqDistance = 0;
    let maxSqDistanceIndex = 0;

    for (let index = firstIndex + 1; index < endIndex; index += 1) {
      const sqDistance = squareSegmentDistance(
        points[index],
        points[firstIndex],
        points[endIndex],
      );

      if (sqDistance > maxSqDistance) {
        maxSqDistance = sqDistance;
        maxSqDistanceIndex = index;
      }
    }

    if (maxSqDistance > sqTolerance) {
      markerArray[maxSqDistanceIndex] = 1;
      stack.push([firstIndex, maxSqDistanceIndex], [maxSqDistanceIndex, endIndex]);
    }
  }

  const simplified = [];
  for (let index = 0; index <= lastIndex; index += 1) {
    if (markerArray[index]) {
      simplified.push(points[index]);
    }
  }

  return simplified;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2 || tolerance <= 0) return points.slice();

  const sqTolerance = tolerance * tolerance;
  return simplifyDouglasPeucker(simplifyRadialDistance(points, sqTolerance), sqTolerance);
}

function simplifyRing(ring, tolerance, decimals) {
  if (ring.length === 0) return ring;

  const isClosed = pointsEqual(ring[0], ring[ring.length - 1]);
  const openRing = isClosed ? ring.slice(0, -1) : ring.slice();
  const roundedRing = openRing.map(([lng, lat]) => [
    roundCoordinate(lng, decimals),
    roundCoordinate(lat, decimals),
  ]);

  const dedupedRing = roundedRing.filter((point, index) => {
    if (index === 0) return true;
    return !pointsEqual(point, roundedRing[index - 1]);
  });

  if (dedupedRing.length < 3) {
    const fallback = roundedRing.length >= 3 ? roundedRing : openRing;
    return [...fallback, fallback[0]];
  }

  const simplifiedRing = simplifyLine(dedupedRing, tolerance);
  const polygonRing = simplifiedRing.length >= 3 ? simplifiedRing : dedupedRing;
  const closedRing = [...polygonRing, polygonRing[0]];

  if (closedRing.length < 4) {
    return [...dedupedRing, dedupedRing[0]];
  }

  return closedRing;
}

function simplifyLineString(points, tolerance, decimals) {
  const rounded = points.map(([lng, lat]) => [
    roundCoordinate(lng, decimals),
    roundCoordinate(lat, decimals),
  ]);

  if (rounded.length <= 2) return rounded;
  const simplified = simplifyLine(rounded, tolerance);
  return simplified.length >= 2 ? simplified : rounded;
}

function computeBoundsFromPositions(positions, bounds = {
  minLng: Infinity,
  minLat: Infinity,
  maxLng: -Infinity,
  maxLat: -Infinity,
}) {
  if (!Array.isArray(positions)) return bounds;

  if (
    positions.length >= 2 &&
    typeof positions[0] === 'number' &&
    typeof positions[1] === 'number'
  ) {
    const [lng, lat] = positions;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    return bounds;
  }

  for (const item of positions) {
    computeBoundsFromPositions(item, bounds);
  }

  return bounds;
}

function boundsToArray(bounds) {
  if (!Number.isFinite(bounds.minLng)) return undefined;
  return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
}

function ringBBoxArea(ring) {
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

function computeLabelPoint(geometry) {
  if (geometry.type === 'Point') {
    return geometry.coordinates;
  }

  if (geometry.type === 'MultiPoint' && geometry.coordinates.length > 0) {
    return geometry.coordinates[0];
  }

  if (geometry.type === 'LineString' && geometry.coordinates.length > 0) {
    const mid = Math.floor(geometry.coordinates.length / 2);
    return geometry.coordinates[mid];
  }

  if (geometry.type === 'MultiLineString' && geometry.coordinates.length > 0) {
    const line = geometry.coordinates[0];
    const mid = Math.floor(line.length / 2);
    return line[mid];
  }

  if (geometry.type === 'Polygon' && geometry.coordinates.length > 0) {
    const result = polylabel(geometry.coordinates, 1.0);
    return [result[0], result[1]];
  }

  if (geometry.type === 'MultiPolygon' && geometry.coordinates.length > 0) {
    let largestPolygon = null;
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
      const result = polylabel(largestPolygon, 1.0);
      return [result[0], result[1]];
    }
  }

  if (geometry.type === 'GeometryCollection') {
    for (const nestedGeometry of geometry.geometries) {
      const point = computeLabelPoint(nestedGeometry);
      if (point) return point;
    }
  }

  return null;
}

function simplifyGeometry(geometry, tolerance, decimals) {
  switch (geometry.type) {
    case 'Point':
      return {
        ...geometry,
        coordinates: [
          roundCoordinate(geometry.coordinates[0], decimals),
          roundCoordinate(geometry.coordinates[1], decimals),
        ],
      };
    case 'MultiPoint':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map(([lng, lat]) => [
          roundCoordinate(lng, decimals),
          roundCoordinate(lat, decimals),
        ]),
      };
    case 'LineString':
      return {
        ...geometry,
        coordinates: simplifyLineString(geometry.coordinates, tolerance, decimals),
      };
    case 'MultiLineString':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((line) => simplifyLineString(line, tolerance, decimals)),
      };
    case 'Polygon':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, tolerance, decimals)),
      };
    case 'MultiPolygon':
      return {
        ...geometry,
        coordinates: geometry.coordinates.map((polygon) => (
          polygon.map((ring) => simplifyRing(ring, tolerance, decimals))
        )),
      };
    case 'GeometryCollection':
      return {
        ...geometry,
        geometries: geometry.geometries.map((nestedGeometry) => (
          simplifyGeometry(nestedGeometry, tolerance, decimals)
        )),
      };
    default:
      return geometry;
  }
}

function simplifyFeature(feature, tolerance, decimals, includeLabelPoint) {
  const simplifiedGeometry = simplifyGeometry(feature.geometry, tolerance, decimals);
  const bbox = boundsToArray(computeBoundsFromPositions(simplifiedGeometry.coordinates ?? []));
  const labelPoint = includeLabelPoint ? computeLabelPoint(simplifiedGeometry) : null;

  return {
    ...feature,
    geometry: simplifiedGeometry,
    ...(bbox ? { bbox } : {}),
    properties: {
      ...(feature.properties ?? {}),
      ...(labelPoint ? { labelPoint } : {}),
    },
  };
}

/** Drops (Multi)Polygon parts whose outer ring bbox is smaller than `minArea`; null if nothing is left. */
function dropSmallPolygons(geometry, minArea) {
  if (geometry.type === 'Polygon') {
    return ringBBoxArea(geometry.coordinates[0] ?? []) >= minArea ? geometry : null;
  }

  if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.filter((polygon) => ringBBoxArea(polygon[0] ?? []) >= minArea);
    return polygons.length > 0 ? { ...geometry, coordinates: polygons } : null;
  }

  return geometry;
}

function simplifyFeatureCollection(inputPath, outputPath, options) {
  const raw = readFileSync(inputPath, 'utf8');
  const geoJson = JSON.parse(raw);

  if (geoJson.type !== 'FeatureCollection') {
    throw new Error(`Expected FeatureCollection in ${inputPath.pathname}`);
  }

  const features = geoJson.features
    .map((feature) => {
      const geometry = options.minPolygonBBoxArea
        ? dropSmallPolygons(feature.geometry, options.minPolygonBBoxArea)
        : feature.geometry;
      if (!geometry) return null;

      return {
        ...feature,
        geometry,
        properties: options.keepProperties === false ? {} : feature.properties,
      };
    })
    .filter(Boolean)
    .map((feature) => (
      simplifyFeature(feature, options.tolerance, options.decimals, options.includeLabelPoint)
    ));

  const simplified = {
    ...geoJson,
    features,
    bbox: boundsToArray(computeBoundsFromPositions(features.map((feature) => feature.geometry.coordinates ?? []))),
  };

  mkdirSync(dirname(outputPath.pathname), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(simplified)}\n`);

  const beforeBytes = statSync(inputPath).size;
  const afterBytes = statSync(outputPath).size;
  const ratio = beforeBytes === 0 ? 0 : (1 - afterBytes / beforeBytes) * 100;

  console.log(
    `${join(ROOT_DIR.pathname, outputPath.pathname.replace(ROOT_DIR.pathname, ''))}: `
    + `${(beforeBytes / 1024 / 1024).toFixed(1)} MB -> ${(afterBytes / 1024 / 1024).toFixed(1)} MB `
    + `(${ratio.toFixed(1)}% smaller)`
  );
}

function main() {
  console.log('Building optimized map assets...');

  simplifyFeatureCollection(WORLD_INPUT_PATH, WORLD_OUTPUT_PATH, {
    tolerance: WORLD_SIMPLIFY_TOLERANCE,
    decimals: WORLD_ROUNDING_DECIMALS,
    includeLabelPoint: true,
  });

  simplifyFeatureCollection(DESERTS_INPUT_PATH, DESERTS_OUTPUT_PATH, {
    tolerance: DESERTS_SIMPLIFY_TOLERANCE,
    decimals: DESERTS_ROUNDING_DECIMALS,
    includeLabelPoint: false,
    minPolygonBBoxArea: DESERTS_MIN_POLYGON_BBOX_AREA,
    // Only geometry is rendered; ecoregion attributes were most of the file size.
    keepProperties: false,
  });
}

main();
