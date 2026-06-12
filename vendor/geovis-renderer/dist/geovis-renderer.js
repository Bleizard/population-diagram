import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { createContext, useContext, useRef, useState, useEffect, useMemo, useCallback } from "react";
import maplibregl, { NavigationControl, FullscreenControl } from "maplibre-gl";
import { createPortal } from "react-dom";
const GeoMapContext = createContext({
  map: null,
  isLoaded: false
});
function useGeoMap() {
  const context = useContext(GeoMapContext);
  if (context === void 0) {
    throw new Error("useGeoMap must be used within a GeoMap component");
  }
  return context;
}
const MAP_STYLE_URLS = {
  /**
   * Liberty — Clean, modern style based on OSM.
   * Provider: OpenFreeMap (free, no limits, ODbL license)
   * https://openfreemap.org
   */
  "liberty": "https://tiles.openfreemap.org/styles/liberty",
  /**
   * Bright — Colorful OSM-based style.
   * Provider: OpenFreeMap (free, no limits, ODbL license)
   */
  "bright": "https://tiles.openfreemap.org/styles/bright",
  /**
   * Positron — Light, minimal style with subtle colors.
   * Good for data visualization overlays.
   * Provider: OpenFreeMap (free, no limits, ODbL license)
   */
  "positron": "https://tiles.openfreemap.org/styles/positron",
  /**
   * Dark Matter — Dark style with bright labels.
   * Good for night mode and contrast with bright data.
   * Provider: OpenFreeMap (free, no limits, ODbL license)
   */
  "dark-matter": "https://tiles.openfreemap.org/styles/dark",
  /**
   * Nature — Style with custom nature colors (green land, blue water).
   * Based on Positron, colors applied dynamically in editor.
   */
  "nature": "https://tiles.openfreemap.org/styles/positron",
  /**
   * Custom — User-defined colors.
   * Based on Positron, colors applied dynamically in editor.
   */
  "custom": "https://tiles.openfreemap.org/styles/positron"
};
const DEFAULT_STYLE_PRESET = "positron";
function resolveMapStyle(style) {
  if (typeof style === "string" && style in MAP_STYLE_URLS) {
    return MAP_STYLE_URLS[style];
  }
  return style;
}
const container = "_container_df6hg_1";
const styles$1 = {
  container
};
const DEFAULT_VIEWPORT = {
  center: [37.6173, 55.7558],
  zoom: 4,
  bearing: 0,
  pitch: 0
};
function GeoMap({
  viewport,
  style = DEFAULT_STYLE_PRESET,
  className,
  containerStyle,
  onLoad,
  onViewportChange,
  controls = true,
  scrollZoom = true,
  dragPan = true,
  children
}) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialViewportRef = useRef({
    ...DEFAULT_VIEWPORT,
    ...viewport
  });
  const currentStyleRef = useRef(null);
  const resolvedStyle = resolveMapStyle(style);
  useEffect(() => {
    if (!containerRef.current || mapInstance) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolvedStyle,
      center: initialViewportRef.current.center,
      zoom: initialViewportRef.current.zoom,
      bearing: initialViewportRef.current.bearing,
      pitch: initialViewportRef.current.pitch,
      scrollZoom,
      dragPan,
      attributionControl: {}
    });
    if (controls) {
      map.addControl(new NavigationControl({ showCompass: true }), "top-right");
      map.addControl(new FullscreenControl(), "top-right");
    }
    map.on("load", () => {
      currentStyleRef.current = resolvedStyle;
      setIsLoaded(true);
      onLoad?.(map);
    });
    const handleMoveEnd = () => {
      if (!onViewportChange) return;
      const center = map.getCenter();
      onViewportChange({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch()
      });
    };
    map.on("moveend", handleMoveEnd);
    setMapInstance(map);
    return () => {
      map.off("moveend", handleMoveEnd);
      map.remove();
      setMapInstance(null);
      setIsLoaded(false);
    };
  }, []);
  useEffect(() => {
    if (mapInstance && isLoaded) {
      const newStyle = resolveMapStyle(style);
      if (currentStyleRef.current !== newStyle) {
        console.log(`[GeoMap] Style changed from ${currentStyleRef.current} to ${newStyle}`);
        currentStyleRef.current = newStyle;
        mapInstance.setStyle(newStyle);
      }
    }
  }, [style, isLoaded, mapInstance]);
  const containerClassName = [styles$1.container, className].filter(Boolean).join(" ");
  const contextValue = useMemo(() => ({
    map: mapInstance,
    isLoaded
  }), [mapInstance, isLoaded]);
  return /* @__PURE__ */ jsxs(GeoMapContext.Provider, { value: contextValue, children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        ref: containerRef,
        className: containerClassName,
        style: containerStyle,
        "data-testid": "geomap-container"
      }
    ),
    isLoaded && children
  ] });
}
function useFeatureHover({
  map,
  isLoaded,
  hoverable,
  type,
  sourceId,
  layerIdFill,
  layerIdCircle,
  hoveredFeatureId,
  onFeatureHover,
  createFeatureEvent: createFeatureEvent2
}) {
  useEffect(() => {
    if (!map || !isLoaded || !hoverable) return;
    const targetLayer = type === "circle" ? layerIdCircle : layerIdFill;
    if (!map.getLayer(targetLayer)) return;
    const handleMouseMove = (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      if (hoveredFeatureId.current !== null && hoveredFeatureId.current !== feature.id) {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureId.current },
          { hover: false }
        );
      }
      if (feature.id !== void 0) {
        hoveredFeatureId.current = feature.id;
        map.setFeatureState(
          { source: sourceId, id: feature.id },
          { hover: true }
        );
      }
      map.getCanvas().style.cursor = "pointer";
      if (onFeatureHover) {
        const coords = [e.lngLat.lng, e.lngLat.lat];
        onFeatureHover(createFeatureEvent2(feature, coords, e.originalEvent));
      }
    };
    const handleMouseLeave = () => {
      if (hoveredFeatureId.current !== null) {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureId.current },
          { hover: false }
        );
        hoveredFeatureId.current = null;
      }
      map.getCanvas().style.cursor = "";
      onFeatureHover?.(null);
    };
    map.on("mousemove", targetLayer, handleMouseMove);
    map.on("mouseleave", targetLayer, handleMouseLeave);
    return () => {
      map.off("mousemove", targetLayer, handleMouseMove);
      map.off("mouseleave", targetLayer, handleMouseLeave);
    };
  }, [
    map,
    isLoaded,
    hoverable,
    type,
    sourceId,
    onFeatureHover,
    layerIdFill,
    layerIdCircle,
    hoveredFeatureId,
    createFeatureEvent2
  ]);
}
function useFeatureClick({
  map,
  isLoaded,
  type,
  layerIdFill,
  layerIdLine,
  layerIdCircle,
  onFeatureClick,
  createFeatureEvent: createFeatureEvent2
}) {
  useEffect(() => {
    if (!map || !isLoaded || !onFeatureClick) return;
    if (type === "fill") {
      if (!map.getLayer(layerIdFill)) return;
      const handleMapClick = (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [layerIdFill] });
        if (!features || features.length === 0) return;
        const feature = features[0];
        const coords = [e.lngLat.lng, e.lngLat.lat];
        onFeatureClick(createFeatureEvent2(feature, coords, e.originalEvent));
      };
      map.on("click", handleMapClick);
      return () => {
        map.off("click", handleMapClick);
      };
    }
    const targetLayer = type === "line" ? layerIdLine : layerIdCircle;
    if (!map.getLayer(targetLayer)) return;
    const handleClick = (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const coords = [e.lngLat.lng, e.lngLat.lat];
      onFeatureClick(createFeatureEvent2(feature, coords, e.originalEvent));
    };
    map.on("click", targetLayer, handleClick);
    return () => {
      map.off("click", targetLayer, handleClick);
    };
  }, [
    map,
    isLoaded,
    onFeatureClick,
    type,
    layerIdFill,
    layerIdLine,
    layerIdCircle,
    createFeatureEvent2
  ]);
}
class TinyQueue {
  constructor(data = [], compare = (a, b) => a < b ? -1 : a > b ? 1 : 0) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare;
    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i);
    }
  }
  push(item) {
    this.data.push(item);
    this._up(this.length++);
  }
  pop() {
    if (this.length === 0) return void 0;
    const top = this.data[0];
    const bottom = this.data.pop();
    if (--this.length > 0) {
      this.data[0] = bottom;
      this._down(0);
    }
    return top;
  }
  peek() {
    return this.data[0];
  }
  _up(pos) {
    const { data, compare } = this;
    const item = data[pos];
    while (pos > 0) {
      const parent = pos - 1 >> 1;
      const current = data[parent];
      if (compare(item, current) >= 0) break;
      data[pos] = current;
      pos = parent;
    }
    data[pos] = item;
  }
  _down(pos) {
    const { data, compare } = this;
    const halfLength = this.length >> 1;
    const item = data[pos];
    while (pos < halfLength) {
      let bestChild = (pos << 1) + 1;
      const right = bestChild + 1;
      if (right < this.length && compare(data[right], data[bestChild]) < 0) {
        bestChild = right;
      }
      if (compare(data[bestChild], item) >= 0) break;
      data[pos] = data[bestChild];
      pos = bestChild;
    }
    data[pos] = item;
  }
}
function polylabel(polygon, precision = 1, debug = false) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.max(precision, Math.min(width, height));
  if (cellSize === precision) {
    const result2 = [minX, minY];
    result2.distance = 0;
    return result2;
  }
  const cellQueue = new TinyQueue([], (a, b) => b.max - a.max);
  let bestCell = getCentroidCell(polygon);
  const bboxCell = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;
  let numProbes = 2;
  function potentiallyQueue(x, y, h2) {
    const cell = new Cell(x, y, h2, polygon);
    numProbes++;
    if (cell.max > bestCell.d + precision) cellQueue.push(cell);
    if (cell.d > bestCell.d) {
      bestCell = cell;
      if (debug) console.log(`found best ${Math.round(1e4 * cell.d) / 1e4} after ${numProbes} probes`);
    }
  }
  let h = cellSize / 2;
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      potentiallyQueue(x + h, y + h, h);
    }
  }
  while (cellQueue.length) {
    const { max, x, y, h: ch } = cellQueue.pop();
    if (max - bestCell.d <= precision) break;
    h = ch / 2;
    potentiallyQueue(x - h, y - h, h);
    potentiallyQueue(x + h, y - h, h);
    potentiallyQueue(x - h, y + h, h);
    potentiallyQueue(x + h, y + h, h);
  }
  if (debug) {
    console.log(`num probes: ${numProbes}
best distance: ${bestCell.d}`);
  }
  const result = [bestCell.x, bestCell.y];
  result.distance = bestCell.d;
  return result;
}
function Cell(x, y, h, polygon) {
  this.x = x;
  this.y = y;
  this.h = h;
  this.d = pointToPolygonDist(x, y, polygon);
  this.max = this.d + this.h * Math.SQRT2;
}
function pointToPolygonDist(x, y, polygon) {
  let inside = false;
  let minDistSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (a[1] > y !== b[1] > y && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      minDistSq = Math.min(minDistSq, getSegDistSq(x, y, a, b));
    }
  }
  return minDistSq === 0 ? 0 : (inside ? 1 : -1) * Math.sqrt(minDistSq);
}
function getCentroidCell(polygon) {
  let area = 0;
  let x = 0;
  let y = 0;
  const points = polygon[0];
  for (let i = 0, len = points.length, j = len - 1; i < len; j = i++) {
    const a = points[i];
    const b = points[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  const centroid = new Cell(x / area, y / area, 0, polygon);
  if (area === 0 || centroid.d < 0) return new Cell(points[0][0], points[0][1], 0, polygon);
  return centroid;
}
function getSegDistSq(px, py, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
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
const geometryLabelPointCache = /* @__PURE__ */ new WeakMap();
function computeLabelPoint(geometry) {
  const cachedPoint = geometryLabelPointCache.get(geometry);
  if (cachedPoint !== void 0) {
    return cachedPoint;
  }
  let labelPoint = null;
  if (geometry.type === "Point") {
    labelPoint = geometry.coordinates;
  } else if (geometry.type === "MultiPoint" && geometry.coordinates.length > 0) {
    labelPoint = geometry.coordinates[0];
  } else if (geometry.type === "LineString" && geometry.coordinates.length > 0) {
    const mid = Math.floor(geometry.coordinates.length / 2);
    labelPoint = geometry.coordinates[mid];
  } else if (geometry.type === "MultiLineString" && geometry.coordinates.length > 0) {
    const line = geometry.coordinates[0];
    const mid = Math.floor(line.length / 2);
    labelPoint = line[mid];
  } else if (geometry.type === "Polygon" && geometry.coordinates.length > 0) {
    const result = polylabel(geometry.coordinates, 1);
    labelPoint = [result[0], result[1]];
  } else if (geometry.type === "MultiPolygon" && geometry.coordinates.length > 0) {
    let largestPolygon = null;
    let largestArea = 0;
    for (const polygon of geometry.coordinates) {
      if (polygon.length > 0) {
        const ring = polygon[0];
        const area = ringBBoxArea(ring);
        if (area > largestArea) {
          largestArea = area;
          largestPolygon = polygon;
        }
      }
    }
    if (largestPolygon) {
      const result = polylabel(largestPolygon, 1);
      labelPoint = [result[0], result[1]];
    }
  }
  geometryLabelPointCache.set(geometry, labelPoint);
  return labelPoint;
}
function formatNumber(value) {
  let numValue;
  if (typeof value === "number") {
    numValue = value;
  } else if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    numValue = parseFloat(cleaned);
    if (isNaN(numValue)) {
      return value;
    }
  } else {
    return String(value ?? "");
  }
  if (isNaN(numValue)) {
    return String(value ?? "");
  }
  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? "-" : "";
  if (absValue >= 1e9) {
    const formatted = absValue / 1e9;
    return sign + (formatted >= 100 ? Math.round(formatted) : formatted.toFixed(1).replace(/\.0$/, "")) + "B";
  }
  if (absValue >= 1e6) {
    const formatted = absValue / 1e6;
    return sign + (formatted >= 100 ? Math.round(formatted) : formatted.toFixed(1).replace(/\.0$/, "")) + "M";
  }
  if (absValue >= 1e3) {
    const formatted = absValue / 1e3;
    return sign + (formatted >= 100 ? Math.round(formatted) : formatted.toFixed(1).replace(/\.0$/, "")) + "K";
  }
  return String(numValue);
}
function createCentroidsGeoJson(data, labelField, formatNumbers) {
  const features = [];
  const formattedField = labelField ? `${labelField}_formatted` : void 0;
  const processFeature = (feature) => {
    const centroid = computeLabelPoint(feature.geometry);
    if (centroid) {
      let properties = { ...feature.properties };
      if (formatNumbers && labelField && formattedField && properties) {
        const value = properties[labelField];
        properties = {
          ...properties,
          [formattedField]: formatNumber(value)
        };
      }
      features.push({
        type: "Feature",
        properties,
        id: feature.id,
        geometry: {
          type: "Point",
          coordinates: centroid
        }
      });
    }
  };
  if (data.type === "FeatureCollection") {
    for (const feature of data.features) {
      processFeature(feature);
    }
  } else if (data.type === "Feature") {
    processFeature(data);
  }
  return {
    type: "FeatureCollection",
    features
  };
}
function useLabelLayer({
  map,
  isLoaded,
  data,
  labelField,
  labelFormatNumbers,
  labelFilter,
  labelOpacity,
  labelSize,
  labelColor,
  labelHaloColor,
  labelHaloWidth,
  labelFont,
  labelAnchor,
  labelOffset,
  labelMinZoom,
  labelMaxZoom,
  labelAllowOverlap,
  minZoom,
  maxZoom,
  labelSourceId,
  layerIdLabel
}) {
  useEffect(() => {
    if (!map || !isLoaded || !data) return;
    if (!labelField) {
      if (map.getLayer(layerIdLabel)) {
        map.removeLayer(layerIdLabel);
      }
      if (map.getSource(labelSourceId)) {
        map.removeSource(labelSourceId);
      }
      return;
    }
    const labelFieldName = typeof labelField === "string" ? labelField : void 0;
    const existingLabelSource = map.getSource(labelSourceId);
    if (!existingLabelSource) {
      const centroidsData = createCentroidsGeoJson(data, labelFieldName, labelFormatNumbers);
      map.addSource(labelSourceId, {
        type: "geojson",
        data: centroidsData
      });
    }
    if (!map.getLayer(layerIdLabel)) {
      const textField = typeof labelField === "string" ? labelFormatNumbers ? ["get", `${labelField}_formatted`] : ["get", labelField] : labelField;
      map.addLayer({
        id: layerIdLabel,
        type: "symbol",
        source: labelSourceId,
        minzoom: labelMinZoom ?? minZoom,
        maxzoom: labelMaxZoom ?? maxZoom,
        ...labelFilter && { filter: labelFilter },
        layout: {
          visibility: "visible",
          "text-field": textField,
          "text-font": labelFont,
          "text-size": labelSize,
          "text-anchor": labelAnchor,
          "text-allow-overlap": labelAllowOverlap,
          "text-ignore-placement": labelAllowOverlap,
          ...labelOffset && { "text-offset": labelOffset },
          "symbol-placement": "point"
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": labelHaloWidth,
          ...labelOpacity !== void 0 && {
            "text-opacity": Array.isArray(labelOpacity) ? labelOpacity : labelOpacity
          }
        }
      });
    }
  }, [
    map,
    isLoaded,
    data,
    labelField,
    labelFormatNumbers,
    labelFilter,
    labelOpacity,
    labelFont,
    labelSize,
    labelColor,
    labelHaloColor,
    labelHaloWidth,
    labelAnchor,
    labelOffset,
    labelAllowOverlap,
    labelMinZoom,
    labelMaxZoom,
    minZoom,
    maxZoom,
    labelSourceId,
    layerIdLabel
  ]);
  useEffect(() => {
    if (!map || !isLoaded || !labelField) return;
    if (!map.getLayer(layerIdLabel)) return;
    const textField = typeof labelField === "string" ? labelFormatNumbers ? ["get", `${labelField}_formatted`] : ["get", labelField] : labelField;
    map.setLayoutProperty(layerIdLabel, "text-field", textField);
    map.setLayoutProperty(layerIdLabel, "text-size", labelSize);
    map.setLayoutProperty(layerIdLabel, "text-anchor", labelAnchor);
    map.setLayoutProperty(layerIdLabel, "text-allow-overlap", labelAllowOverlap);
    map.setLayoutProperty(layerIdLabel, "text-ignore-placement", labelAllowOverlap);
    if (labelOffset) {
      map.setLayoutProperty(layerIdLabel, "text-offset", labelOffset);
    }
    if (labelFilter) {
      map.setFilter(layerIdLabel, labelFilter);
    }
  }, [
    map,
    isLoaded,
    labelField,
    labelFormatNumbers,
    labelSize,
    labelAnchor,
    labelOffset,
    labelAllowOverlap,
    labelFilter,
    layerIdLabel
  ]);
  useEffect(() => {
    if (!map || !isLoaded || !labelField) return;
    if (!map.getLayer(layerIdLabel)) return;
    map.setPaintProperty(layerIdLabel, "text-color", labelColor);
    map.setPaintProperty(layerIdLabel, "text-halo-color", labelHaloColor);
    map.setPaintProperty(layerIdLabel, "text-halo-width", labelHaloWidth);
    if (labelOpacity !== void 0) {
      map.setPaintProperty(
        layerIdLabel,
        "text-opacity",
        Array.isArray(labelOpacity) ? labelOpacity : labelOpacity
      );
    }
  }, [map, isLoaded, labelField, labelColor, labelHaloColor, labelHaloWidth, labelOpacity, layerIdLabel]);
  useEffect(() => {
    if (!map || !isLoaded || !data) return;
    const labelSource = map.getSource(labelSourceId);
    if (labelSource && labelField) {
      const labelFieldName = typeof labelField === "string" ? labelField : void 0;
      const centroidsData = createCentroidsGeoJson(data, labelFieldName, labelFormatNumbers);
      labelSource.setData(centroidsData);
    }
  }, [map, isLoaded, data, labelSourceId, labelField, labelFormatNumbers]);
}
function useLayerPaintProperties({
  map,
  isLoaded,
  hoverable,
  fillColor,
  fillOpacity,
  fillPattern,
  hoverFillColor,
  hoverFillOpacity,
  lineColor,
  lineWidth,
  lineOpacity,
  hoverLineColor,
  hoverLineWidth,
  circleRadius,
  circleColor,
  circleOpacity,
  circleStrokeColor,
  circleStrokeWidth,
  layerIdFill,
  layerIdLine,
  layerIdCircle
}) {
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer(layerIdFill)) {
      if (hoverable && hoverFillColor) {
        map.setPaintProperty(layerIdFill, "fill-color", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          hoverFillColor,
          fillColor
        ]);
      } else {
        map.setPaintProperty(layerIdFill, "fill-color", fillColor);
      }
      const hoverOpacity = hoverFillOpacity ?? Math.min(fillOpacity + 0.2, 1);
      map.setPaintProperty(
        layerIdFill,
        "fill-opacity",
        hoverable ? [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          hoverOpacity,
          fillOpacity
        ] : fillOpacity
      );
      if (fillPattern !== void 0) {
        map.setPaintProperty(
          layerIdFill,
          "fill-pattern",
          fillPattern
        );
      }
    }
    if (map.getLayer(layerIdLine)) {
      if (hoverable && hoverLineColor) {
        map.setPaintProperty(layerIdLine, "line-color", [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          hoverLineColor,
          lineColor
        ]);
      } else {
        map.setPaintProperty(layerIdLine, "line-color", lineColor);
      }
      const hoverWidth = hoverLineWidth ?? lineWidth + 1;
      map.setPaintProperty(
        layerIdLine,
        "line-width",
        hoverable ? [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          hoverWidth,
          lineWidth
        ] : lineWidth
      );
      map.setPaintProperty(layerIdLine, "line-opacity", lineOpacity);
    }
    if (map.getLayer(layerIdCircle)) {
      map.setPaintProperty(layerIdCircle, "circle-radius", circleRadius);
      map.setPaintProperty(layerIdCircle, "circle-color", circleColor);
      map.setPaintProperty(layerIdCircle, "circle-opacity", circleOpacity);
      map.setPaintProperty(layerIdCircle, "circle-stroke-color", circleStrokeColor);
      map.setPaintProperty(layerIdCircle, "circle-stroke-width", circleStrokeWidth);
    }
  }, [
    map,
    isLoaded,
    hoverable,
    fillColor,
    fillOpacity,
    fillPattern,
    hoverFillColor,
    hoverFillOpacity,
    lineColor,
    lineWidth,
    lineOpacity,
    hoverLineColor,
    hoverLineWidth,
    circleRadius,
    circleColor,
    circleOpacity,
    circleStrokeColor,
    circleStrokeWidth,
    layerIdFill,
    layerIdLine,
    layerIdCircle
  ]);
}
function useGeoJsonSource({
  map,
  isLoaded,
  data,
  sourceId
}) {
  useEffect(() => {
    if (!map || !isLoaded || !data) return;
    const existingSource = map.getSource(sourceId);
    if (existingSource) {
      existingSource.setData(data);
      return;
    }
    map.addSource(sourceId, {
      type: "geojson",
      data,
      generateId: true
    });
  }, [map, isLoaded, data, sourceId]);
}
function safelyRemoveLayer(map, layerId) {
  try {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  } catch {
  }
}
function safelyRemoveSource(map, sourceId) {
  try {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  } catch {
  }
}
function useGeoJsonLayers({
  map,
  isLoaded,
  data,
  id,
  type,
  visible,
  minZoom,
  maxZoom,
  filter,
  sourceId,
  labelSourceId,
  layerIdFill,
  layerIdLine,
  layerIdCircle,
  layerIdLabel,
  fillColor,
  fillOpacity,
  fillPattern,
  lineColor,
  lineWidth,
  lineOpacity,
  lineDashArray,
  lineCap,
  lineJoin,
  circleRadius,
  circleColor,
  circleOpacity,
  circleStrokeColor,
  circleStrokeWidth
}) {
  useEffect(() => {
    if (!map || !isLoaded || !data) {
      return;
    }
    if (!map.getSource(sourceId)) {
      return;
    }
    const layerOptions = {
      minzoom: minZoom,
      maxzoom: maxZoom,
      filter
    };
    if (type === "fill" || type === "line") {
      if (!map.getLayer(layerIdFill)) {
        try {
          map.addLayer({
            id: layerIdFill,
            type: "fill",
            source: sourceId,
            ...layerOptions,
            layout: {
              visibility: visible ? "visible" : "none"
            },
            paint: {
              "fill-color": fillColor,
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                Math.min(fillOpacity + 0.2, 1),
                fillOpacity
              ],
              ...fillPattern !== void 0 && {
                "fill-pattern": fillPattern
              }
            },
            filter: [
              "any",
              ["==", ["geometry-type"], "Polygon"],
              ["==", ["geometry-type"], "MultiPolygon"]
            ]
          });
        } catch (err) {
          console.error(`[GeoJsonLayer ${id}] Error creating fill layer:`, err);
        }
      }
      if (!map.getLayer(layerIdLine)) {
        try {
          map.addLayer({
            id: layerIdLine,
            type: "line",
            source: sourceId,
            ...layerOptions,
            layout: {
              visibility: visible ? "visible" : "none",
              ...lineCap && { "line-cap": lineCap },
              ...lineJoin && { "line-join": lineJoin }
            },
            paint: {
              "line-color": lineColor,
              "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                lineWidth + 1,
                lineWidth
              ],
              "line-opacity": lineOpacity,
              ...lineDashArray && { "line-dasharray": lineDashArray }
            },
            filter: [
              "any",
              ["==", ["geometry-type"], "Polygon"],
              ["==", ["geometry-type"], "MultiPolygon"],
              ["==", ["geometry-type"], "LineString"],
              ["==", ["geometry-type"], "MultiLineString"]
            ]
          });
        } catch (err) {
          console.error(`[GeoJsonLayer ${id}] Error creating line layer:`, err);
        }
      }
    }
    if (type === "circle") {
      if (!map.getLayer(layerIdCircle)) {
        map.addLayer({
          id: layerIdCircle,
          type: "circle",
          source: sourceId,
          ...layerOptions,
          layout: {
            visibility: visible ? "visible" : "none"
          },
          paint: {
            "circle-radius": circleRadius,
            "circle-color": circleColor,
            "circle-opacity": circleOpacity,
            "circle-stroke-color": circleStrokeColor,
            "circle-stroke-width": circleStrokeWidth
          },
          filter: ["any", ["==", ["geometry-type"], "Point"], ["==", ["geometry-type"], "MultiPoint"]]
        });
      }
    }
    return () => {
      safelyRemoveLayer(map, layerIdLabel);
      safelyRemoveLayer(map, layerIdFill);
      safelyRemoveLayer(map, layerIdLine);
      safelyRemoveLayer(map, layerIdCircle);
      safelyRemoveSource(map, labelSourceId);
      safelyRemoveSource(map, sourceId);
    };
  }, [map, isLoaded, id, type, sourceId, labelSourceId, layerIdFill, layerIdLine, layerIdCircle, layerIdLabel]);
}
function useLayerVisibility({
  map,
  isLoaded,
  visible,
  layerIdFill,
  layerIdLine,
  layerIdCircle,
  layerIdLabel
}) {
  useEffect(() => {
    if (!map || !isLoaded) return;
    const visibility = visible ? "visible" : "none";
    if (map.getLayer(layerIdFill)) {
      map.setLayoutProperty(layerIdFill, "visibility", visibility);
    }
    if (map.getLayer(layerIdLine)) {
      map.setLayoutProperty(layerIdLine, "visibility", visibility);
    }
    if (map.getLayer(layerIdCircle)) {
      map.setLayoutProperty(layerIdCircle, "visibility", visibility);
    }
    if (map.getLayer(layerIdLabel)) {
      map.setLayoutProperty(layerIdLabel, "visibility", visibility);
    }
  }, [map, isLoaded, visible, layerIdFill, layerIdLine, layerIdCircle, layerIdLabel]);
}
const DEFAULTS = {
  fillColor: "#3b82f6",
  fillOpacity: 0.5,
  lineColor: "#1d4ed8",
  lineWidth: 1,
  lineOpacity: 1,
  circleRadius: 6,
  circleColor: "#3b82f6",
  circleOpacity: 1,
  circleStrokeColor: "#ffffff",
  circleStrokeWidth: 1,
  // Label defaults
  labelSize: 12,
  labelColor: "#333333",
  labelHaloColor: "#ffffff",
  labelHaloWidth: 1.5,
  labelFont: ["Noto Sans Bold", "Noto Sans Regular"],
  labelAnchor: "center"
};
function createFeatureEvent(feature, coordinates, originalEvent) {
  return {
    feature: {
      type: "Feature",
      geometry: feature.geometry,
      properties: feature.properties,
      id: feature.id
    },
    originalFeature: feature,
    coordinates,
    originalEvent
  };
}
function GeoJsonLayer({
  id,
  data,
  type = "fill",
  visible = true,
  // zIndex, // TODO: implement layer ordering
  minZoom,
  maxZoom,
  filter,
  // Fill styles
  fillColor = DEFAULTS.fillColor,
  fillOpacity = DEFAULTS.fillOpacity,
  fillPattern,
  // Line styles
  lineColor = DEFAULTS.lineColor,
  lineWidth = DEFAULTS.lineWidth,
  lineOpacity = DEFAULTS.lineOpacity,
  lineDashArray,
  lineCap,
  lineJoin,
  // Circle styles
  circleRadius = DEFAULTS.circleRadius,
  circleColor = DEFAULTS.circleColor,
  circleOpacity = DEFAULTS.circleOpacity,
  circleStrokeColor = DEFAULTS.circleStrokeColor,
  circleStrokeWidth = DEFAULTS.circleStrokeWidth,
  // Label styles
  labelField,
  labelSize = DEFAULTS.labelSize,
  labelColor = DEFAULTS.labelColor,
  labelHaloColor = DEFAULTS.labelHaloColor,
  labelHaloWidth = DEFAULTS.labelHaloWidth,
  labelFont = DEFAULTS.labelFont,
  labelAnchor = DEFAULTS.labelAnchor,
  labelOffset,
  labelMinZoom,
  labelMaxZoom,
  labelAllowOverlap = false,
  labelFormatNumbers = false,
  labelFilter,
  labelOpacity,
  // Hover styles
  hoverFillColor,
  hoverFillOpacity,
  hoverLineColor,
  hoverLineWidth,
  // Interactions
  hoverable = false,
  onFeatureClick,
  onFeatureHover
}) {
  const { map, isLoaded } = useGeoMap();
  const sourceId = `${id}-source`;
  const labelSourceId = `${id}-label-source`;
  const layerIdFill = `${id}-fill`;
  const layerIdLine = `${id}-line`;
  const layerIdCircle = `${id}-circle`;
  const layerIdLabel = `${id}-label`;
  const hoveredFeatureId = useRef(null);
  useGeoJsonSource({
    map,
    isLoaded,
    data,
    sourceId
  });
  useGeoJsonLayers({
    map,
    isLoaded,
    data,
    id,
    type,
    visible,
    minZoom,
    maxZoom,
    filter,
    sourceId,
    labelSourceId,
    layerIdFill,
    layerIdLine,
    layerIdCircle,
    layerIdLabel,
    fillColor,
    fillOpacity,
    fillPattern,
    lineColor,
    lineWidth,
    lineOpacity,
    lineDashArray,
    lineCap,
    lineJoin,
    circleRadius,
    circleColor,
    circleOpacity,
    circleStrokeColor,
    circleStrokeWidth
  });
  useLayerVisibility({
    map,
    isLoaded,
    visible,
    layerIdFill,
    layerIdLine,
    layerIdCircle,
    layerIdLabel
  });
  useLayerPaintProperties({
    map,
    isLoaded,
    hoverable,
    fillColor,
    fillOpacity,
    fillPattern,
    hoverFillColor,
    hoverFillOpacity,
    lineColor,
    lineWidth,
    lineOpacity,
    hoverLineColor,
    hoverLineWidth,
    circleRadius,
    circleColor,
    circleOpacity,
    circleStrokeColor,
    circleStrokeWidth,
    layerIdFill,
    layerIdLine,
    layerIdCircle
  });
  useLabelLayer({
    map,
    isLoaded,
    data: typeof data === "string" ? null : data ?? null,
    labelField,
    labelFormatNumbers,
    labelFilter,
    labelOpacity,
    labelSize,
    labelColor,
    labelHaloColor,
    labelHaloWidth,
    labelFont,
    labelAnchor,
    labelOffset,
    labelMinZoom,
    labelMaxZoom,
    labelAllowOverlap,
    minZoom,
    maxZoom,
    labelSourceId,
    layerIdLabel
  });
  useFeatureHover({
    map,
    isLoaded,
    hoverable,
    type,
    sourceId,
    layerIdFill,
    layerIdCircle,
    hoveredFeatureId,
    onFeatureHover,
    createFeatureEvent
  });
  useFeatureClick({
    map,
    isLoaded,
    type,
    layerIdFill,
    layerIdLine,
    layerIdCircle,
    onFeatureClick,
    createFeatureEvent
  });
  return null;
}
const popup = "_popup_12ypd_8";
const popupContent = "_popupContent_12ypd_26";
const closeButton = "_closeButton_12ypd_50";
const content = "_content_12ypd_81";
const styles = {
  popup,
  popupContent,
  closeButton,
  content
};
function Popup({
  coordinates,
  children,
  onClose,
  className,
  anchor = "bottom",
  offset = [0, -10],
  closeButton: closeButton2 = true,
  closeOnClick = false,
  closeOnMapClick = true,
  maxWidth = "320px"
}) {
  const { map, isLoaded } = useGeoMap();
  const popupRef = useRef(null);
  const [container2, setContainer] = useState(null);
  useEffect(() => {
    if (!map || !isLoaded || !coordinates) return;
    const popupContainer = document.createElement("div");
    popupContainer.className = styles.popupContent;
    if (className) {
      popupContainer.classList.add(className);
    }
    const popup2 = new maplibregl.Popup({
      closeButton: false,
      // We'll render our own close button
      closeOnClick,
      closeOnMove: false,
      anchor,
      offset,
      maxWidth,
      className: styles.popup
    });
    popup2.setLngLat(coordinates);
    popup2.setDOMContent(popupContainer);
    popup2.addTo(map);
    popupRef.current = popup2;
    setContainer(popupContainer);
    const handleMapClick = () => {
      if (closeOnMapClick && onClose) {
        onClose();
      }
    };
    if (closeOnMapClick) {
      setTimeout(() => {
        map.on("click", handleMapClick);
      }, 100);
    }
    popup2.on("close", () => {
      onClose?.();
    });
    return () => {
      map.off("click", handleMapClick);
      popup2.remove();
      popupRef.current = null;
      setContainer(null);
    };
  }, [map, isLoaded, coordinates, anchor, offset, maxWidth, closeOnClick, closeOnMapClick, onClose, className]);
  useEffect(() => {
    if (popupRef.current && coordinates) {
      popupRef.current.setLngLat(coordinates);
    }
  }, [coordinates]);
  if (!container2) return null;
  return createPortal(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      closeButton2 && /* @__PURE__ */ jsx(
        "button",
        {
          className: styles.closeButton,
          onClick: onClose,
          "aria-label": "Закрыть",
          type: "button",
          children: "×"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: styles.content, children })
    ] }),
    container2
  );
}
function useMapControls() {
  const { map, isLoaded } = useGeoMap();
  const fitBounds = useCallback((bounds, options) => {
    if (!map || !isLoaded) return;
    map.fitBounds(bounds, options);
  }, [map, isLoaded]);
  const flyTo = useCallback((options) => {
    if (!map || !isLoaded) return;
    map.flyTo(options);
  }, [map, isLoaded]);
  const easeTo = useCallback((options) => {
    if (!map || !isLoaded) return;
    map.easeTo(options);
  }, [map, isLoaded]);
  const jumpTo = useCallback((options) => {
    if (!map || !isLoaded) return;
    map.jumpTo(options);
  }, [map, isLoaded]);
  const setZoom = useCallback((zoom) => {
    if (!map || !isLoaded) return;
    map.setZoom(zoom);
  }, [map, isLoaded]);
  const setCenter = useCallback((center) => {
    if (!map || !isLoaded) return;
    map.setCenter(center);
  }, [map, isLoaded]);
  const getViewport = useCallback(() => {
    if (!map || !isLoaded) return null;
    const center = map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch()
    };
  }, [map, isLoaded]);
  const getBounds = useCallback(() => {
    if (!map || !isLoaded) return null;
    const bounds = map.getBounds();
    return [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
  }, [map, isLoaded]);
  return useMemo(() => ({
    fitBounds,
    flyTo,
    easeTo,
    jumpTo,
    setZoom,
    setCenter,
    getViewport,
    getBounds
  }), [fitBounds, flyTo, easeTo, jumpTo, setZoom, setCenter, getViewport, getBounds]);
}
export {
  DEFAULT_STYLE_PRESET,
  GeoJsonLayer,
  GeoMap,
  MAP_STYLE_URLS,
  Popup,
  useGeoMap,
  useMapControls
};
//# sourceMappingURL=geovis-renderer.js.map
