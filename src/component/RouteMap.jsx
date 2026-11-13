import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Transitous requires a source link and contact details beside its transit times.
const TRANSIT_ATTRIBUTION =
  '<a href="https://transitous.org/sources/" target="_blank" rel="noreferrer">Transitous</a> | ' +
  '<a href="https://github.com/peijinguo/travel-map" target="_blank" rel="noreferrer">專案聯絡</a>';
// Standard OpenStreetMap raster tiles; no API key needed.
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
const JAPAN_CENTER = [137.7, 38.2];
const JAPAN_ZOOM = 4;
const ROUTE_SOURCE_ID = "planner-route";

function getOverlappingMarkerOffsets(coordinates) {
  const groups = [];
  const overlapDistance = 0.001;

  coordinates.forEach(([lng, lat], index) => {
    const group = groups.find(({ center }) => {
      const latitudeScale = Math.cos((lat * Math.PI) / 180);
      const latGap = lat - center.lat;
      const lngGap = (lng - center.lng) * latitudeScale;
      return Math.hypot(latGap, lngGap) < overlapDistance;
    });

    if (group) {
      group.items.push({ lat, lng, index });
      const total = group.items.length;
      group.center = group.items.reduce(
        (center, item) => ({
          lat: center.lat + item.lat / total,
          lng: center.lng + item.lng / total,
        }),
        { lat: 0, lng: 0 },
      );
    } else {
      groups.push({ center: { lat, lng }, items: [{ lat, lng, index }] });
    }
  });

  const offsets = coordinates.map(() => [0, 0]);
  groups.forEach(({ items }) => {
    if (items.length < 2) return;
    const radius = 24;
    items.forEach(({ index }, itemIndex) => {
      if (itemIndex === 0) return;
      const angle = (Math.PI * 2 * (itemIndex - 1)) / (items.length - 1);
      offsets[index] = [
        Math.round(Math.cos(angle) * radius),
        Math.round(Math.sin(angle) * radius),
      ];
    });
  });

  return offsets;
}

// Each leg follows its road or rail path when one was found, so the stops
// are joined the way the trip actually goes instead of in straight lines.
const makeRouteLine = (coordinates, paths = []) => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "MultiLineString",
    coordinates: coordinates.slice(0, -1).map((start, index) => {
      const end = coordinates[index + 1];
      const path = paths[index];
      return path?.length > 1 ? [start, ...path, end] : [start, end];
    }),
  },
});

// The route is drawn as a trail of footprints, left and right steps turned to
// face the way the trip goes, with a darker wave of fresh prints walking
// forward from stop to stop.
const FOOTPRINT_SOURCE_ID = "planner-footprints";
const STEP_METERS = 20;
const MAX_STEPS_PER_LEG = 4000;
// Zoomed out, only every 2^k-th step is drawn so the prints stay about one
// step apart on screen: k = 0 at zoom 17 and grows by one per zoom level.
const FOOTPRINT_MIN_ZOOM = 5;
const FOOTPRINT_FULL_ZOOM = 17;
const skipLevels = Array.from(
  { length: FOOTPRINT_FULL_ZOOM - FOOTPRINT_MIN_ZOOM + 1 },
  (_, index) => ({ zoom: FOOTPRINT_MIN_ZOOM + index, k: FOOTPRINT_FULL_ZOOM - FOOTPRINT_MIN_ZOOM - index }),
);
// One expression per zoom level, switched by a top-level zoom step.
const byZoom = (makeExpression) => [
  "step",
  ["zoom"],
  makeExpression(skipLevels[0].k),
  ...skipLevels.slice(1).flatMap(({ zoom, k }) => [zoom, makeExpression(k)]),
];
const shownStep = (k) => ["floor", ["/", ["get", "step"], 2 ** k]];
const isLeftFoot = (k) => ["==", ["%", shownStep(k), 2], 0];
const STEP_TRAIL = 14; // how many prints behind the walker stay darkened
const STEP_PAUSE = 8; // ticks the walker waits at the last stop before starting over
const STEP_TICK_MS = 340;

const metersBetween = ([lng1, lat1], [lng2, lat2]) => {
  const latScale = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const dx = (lng2 - lng1) * latScale * 111320;
  const dy = (lat2 - lat1) * 110540;
  return Math.hypot(dx, dy);
};
const bearingBetween = ([lng1, lat1], [lng2, lat2]) => {
  const latScale = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return (Math.atan2((lng2 - lng1) * latScale, lat2 - lat1) * 180) / Math.PI;
};

const makeFootprints = (routeLine) => {
  const features = [];
  let step = 0;
  routeLine.geometry.coordinates.forEach((leg) => {
    const lengths = leg.slice(1).map((point, index) => metersBetween(leg[index], point));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    if (!total) return;
    const spacing = Math.max(STEP_METERS, total / MAX_STEPS_PER_LEG);
    let segment = 0;
    let walked = 0;
    for (let at = spacing / 2; at < total; at += spacing) {
      while (segment < lengths.length - 1 && walked + lengths[segment] < at) {
        walked += lengths[segment];
        segment += 1;
      }
      const [start, end] = [leg[segment], leg[segment + 1]];
      const ratio = lengths[segment] ? (at - walked) / lengths[segment] : 0;
      features.push({
        type: "Feature",
        properties: {
          step,
          // How many times 2 divides the step: a step with rank r is still drawn
          // when every 2^r-th step is.
          rank: step ? Math.min(Math.log2(step & -step), 12) : 12,
          bearing: bearingBetween(start, end),
        },
        geometry: {
          type: "Point",
          coordinates: [
            start[0] + (end[0] - start[0]) * ratio,
            start[1] + (end[1] - start[1]) * ratio,
          ],
        },
      });
      step += 1;
    }
  });
  return { type: "FeatureCollection", features };
};

// A small ink footprint pointing up: the ball of the foot, then the heel.
function makeFootprintImage(mirrored) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 14 * scale;
  canvas.height = 24 * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  if (mirrored) {
    context.translate(14, 0);
    context.scale(-1, 1);
  }
  // A white rim keeps the dark print readable on red and orange roads.
  const drawFoot = () => {
    context.beginPath();
    context.ellipse(7.6, 8.2, 4.4, 6.6, 0.16, 0, Math.PI * 2);
    context.moveTo(9.5, 19.2);
    context.ellipse(6.4, 19.2, 3.1, 3.6, 0.08, 0, Math.PI * 2);
  };
  drawFoot();
  context.lineWidth = 2.4;
  context.strokeStyle = "rgba(255, 255, 255, 0.95)";
  context.stroke();
  context.fillStyle = "#2f6487"; // a lighter navy than the stop pins
  context.fill();
  return { image: context.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: scale };
}

// The walker's head is a drawn-step number at the current zoom; prints just
// behind it are darkest and fade, prints ahead stay faint.
const footprintOpacity = (head) =>
  byZoom((k) => [
    "let",
    "behind",
    ["-", head, shownStep(k)],
    ["case",
      ["<", ["var", "behind"], 0], 0.45,
      ["<", ["var", "behind"], STEP_TRAIL],
      ["-", 1, ["*", ["/", ["var", "behind"], STEP_TRAIL], 0.3]],
      0.7],
  ]);

// Which drawn steps are on screen, in walking order, so the walker only
// walks the part of the route the traveller is looking at.
const visibleShownSteps = (map, features) => {
  const zoom = Math.floor(map.getZoom());
  if (zoom < FOOTPRINT_MIN_ZOOM) return [];
  const k = Math.max(FOOTPRINT_FULL_ZOOM - Math.min(zoom, FOOTPRINT_FULL_ZOOM), 0);
  const bounds = map.getBounds();
  const shown = new Set();
  features.forEach(({ properties, geometry }) => {
    if (properties.rank >= k && bounds.contains(geometry.coordinates)) {
      shown.add(Math.floor(properties.step / 2 ** k));
    }
  });
  return [...shown].sort((first, second) => first - second);
};

// Pins this close on screen overlap; a clicked pin zooms in until its nearest
// neighbour is at least this far away.
const PIN_SPREAD_PX = 56;
const MAX_FOCUS_ZOOM = 18;
// A clicked STOP tag lands at street level, close enough to read the blocks around it.
const STOP_FOCUS_ZOOM = 16;

function zoomToSpreadPins(map, coordinate, allCoordinates, minZoom = 0, duration = 700) {
  const here = map.project(coordinate);
  const nearest = allCoordinates.reduce((closest, other) => {
    if (other === coordinate) return closest;
    const point = map.project(other);
    const distance = Math.hypot(point.x - here.x, point.y - here.y);
    // Stops at the same spot are already fanned out by their offsets.
    return distance > 0.5 ? Math.min(closest, distance) : closest;
  }, Infinity);
  const zoom = map.getZoom();
  // Distances grow 2x per zoom level, so solve for the level that spreads them.
  const extraZoom =
    nearest < PIN_SPREAD_PX ? Math.log2(PIN_SPREAD_PX / nearest) + 0.3 : 0;
  map.flyTo({
    center: coordinate,
    zoom: Math.min(Math.max(zoom + extraZoom, zoom, minZoom), MAX_FOCUS_ZOOM),
    duration,
  });
}

function makeStopMarker(map, stop, index, coordinate, offset, allCoordinates = []) {
  const marker = document.createElement("div");
  marker.className = "planner-route-marker";
  const pin = document.createElement("div");
  pin.className = "planner-route-pin";
  // Number pins by their STOP, not their place among the located stops, so a
  // stop without a location never shifts the numbers after it.
  const stopOrder = stop.order ?? index + 1;
  pin.textContent = String(stopOrder);
  marker.append(pin);

  const content = document.createElement("div");
  const stopNumber = document.createElement("strong");
  const stopName = document.createElement("span");
  content.className = "planner-route-popup";
  stopNumber.textContent = String(stopOrder).padStart(2, "0");
  stopName.textContent = stop.town.name;
  content.append(stopNumber, stopName);

  // Hovering shows the stop's card; a click keeps it open until it is closed.
  const popup = new maplibregl.Popup({ offset: 35 }).setLngLat(coordinate).setDOMContent(content);
  let pinned = false;
  const show = () => {
    if (!popup.isOpen()) popup.addTo(map);
  };
  popup.on("close", () => {
    pinned = false;
  });
  marker.addEventListener("mouseenter", show);
  marker.addEventListener("mouseleave", () => {
    if (!pinned) popup.remove();
  });
  marker.addEventListener("click", (event) => {
    event.stopPropagation();
    pinned = !pinned;
    if (pinned) {
      show();
      // Crowded pins: zoom into the area so the neighbours pull apart.
      zoomToSpreadPins(map, coordinate, allCoordinates);
    } else popup.remove();
  });

  return new maplibregl.Marker({ element: marker, anchor: "bottom", offset }).setLngLat(coordinate);
}

function RouteMap({ stops, paths = [], label = "行程路線地圖", focus = null }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const stopsRef = useRef(stops);
  const pathsRef = useRef(paths);
  const footprintsRef = useRef([]);
  const visibleStepsRef = useRef([]);
  const tickRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [webglSupported] = useState(() =>
    Boolean(document.createElement("canvas").getContext("webgl2")),
  );
  const stopsKey = stops
    .map(({ item, town, order }) =>
      [item.id, order, town.id, town.latitude, town.longitude, town.name].join(":"),
    )
    .join("|");
  const pathsKey = paths
    .map((path) => (path ? `${path.length}:${path[0]}:${path.at(-1)}` : "-"))
    .join("|");

  useEffect(() => {
    stopsRef.current = stops;
    pathsRef.current = paths;
  }, [stops, paths]);

  useEffect(() => {
    if (!webglSupported || !canvasRef.current) return undefined;
    const map = new maplibregl.Map({
      container: canvasRef.current,
      style: MAP_STYLE,
      center: JAPAN_CENTER,
      zoom: JAPAN_ZOOM,
      minZoom: 2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    // The data licences require attribution, so keep it behind an info button.
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: TRANSIT_ATTRIBUTION,
      }),
    );
    // "load" waits for every visible tile, which takes seconds on the free
    // tile server; the style is enough to draw the stops and the route.
    map.once("style.load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: makeRouteLine([]),
      });
      // A dashed line along the whole route, under the footprints; it keeps
      // the route readable when zoomed far out, where the footprints thin out.
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#24506e",
          "line-width": 2,
          "line-opacity": 0.55,
          "line-dasharray": [1, 4.5],
        },
      });
      map.addImage("footprint-left", makeFootprintImage(false).image, { pixelRatio: 2 });
      map.addImage("footprint-right", makeFootprintImage(true).image, { pixelRatio: 2 });
      map.addSource(FOOTPRINT_SOURCE_ID, {
        type: "geojson",
        data: makeFootprints(makeRouteLine([])),
      });
      map.addLayer({
        id: FOOTPRINT_SOURCE_ID,
        type: "symbol",
        source: FOOTPRINT_SOURCE_ID,
        // Below zoom 5 (all of Japan) only the faint dotted guide is drawn.
        minzoom: FOOTPRINT_MIN_ZOOM,
        filter: byZoom((k) => [">=", ["get", "rank"], k]),
        layout: {
          "icon-image": byZoom((k) => ["case", isLeftFoot(k), "footprint-left", "footprint-right"]),
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-offset": byZoom((k) => ["case", isLeftFoot(k), ["literal", [-5, 0]], ["literal", [5, 0]]]),
          "icon-size": 1.05,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-padding": 0,
        },
        paint: { "icon-opacity": footprintOpacity(-1) },
      });
      setMapReady(true);
    });
    map.once("load", () => {
      map
        .getContainer()
        .querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    });
    return () => {
      markersRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [webglSupported]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const currentStops = stopsRef.current;
    const coordinates = currentStops.map(({ town }) => [town.longitude, town.latitude]);
    const markerOffsets = getOverlappingMarkerOffsets(coordinates);

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = currentStops.map((stop, index) =>
      makeStopMarker(map, stop, index, coordinates[index], markerOffsets[index], coordinates).addTo(map),
    );

    if (!coordinates.length) {
      map.jumpTo({ center: JAPAN_CENTER, zoom: JAPAN_ZOOM });
    } else if (coordinates.length === 1) {
      map.jumpTo({ center: coordinates[0], zoom: 12 });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((coordinate) => bounds.extend(coordinate));
      // Zoom in as far as street level so stops a short walk apart are
      // spread out instead of piled up; pins rise above their point, so the
      // top keeps extra room.
      map.fitBounds(bounds, {
        padding: { top: 72, right: 48, bottom: 40, left: 48 },
        maxZoom: 17,
        animate: false,
      });
    }
  }, [stopsKey, mapReady]);

  // Routes arrive after the stops, so the line is redrawn on its own without
  // moving the view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const coordinates = stopsRef.current.map(({ town }) => [town.longitude, town.latitude]);
    const routeLine = makeRouteLine(coordinates, pathsRef.current);
    map.getSource(ROUTE_SOURCE_ID)?.setData(routeLine);
    const footprints = makeFootprints(routeLine);
    map.getSource(FOOTPRINT_SOURCE_ID)?.setData(footprints);
    // A changed route starts the walk over from the first stop on screen.
    footprintsRef.current = footprints.features;
    visibleStepsRef.current = visibleShownSteps(map, footprints.features);
    tickRef.current = 0;
  }, [stopsKey, pathsKey, mapReady]);

  // Walk the footprints forward through the stretch on screen, in stop order,
  // then start that stretch again; panning or zooming picks the new stretch.
  // Still for people who ask for less motion.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      map.setPaintProperty(FOOTPRINT_SOURCE_ID, "icon-opacity", 0.8);
      return undefined;
    }
    const refreshVisible = () => {
      visibleStepsRef.current = visibleShownSteps(map, footprintsRef.current);
      tickRef.current = 0;
    };
    map.on("moveend", refreshVisible);
    const timer = window.setInterval(() => {
      if (mapRef.current !== map) return;
      const steps = visibleStepsRef.current;
      const lap = steps.length + STEP_TRAIL + STEP_PAUSE;
      const position = tickRef.current % Math.max(lap, 1);
      tickRef.current += 1;
      const head = steps.length ? steps[Math.min(position, steps.length - 1)] + Math.max(position - steps.length + 1, 0) : -1;
      map.setPaintProperty(FOOTPRINT_SOURCE_ID, "icon-opacity", footprintOpacity(head));
    }, STEP_TICK_MS);
    return () => {
      window.clearInterval(timer);
      map.off("moveend", refreshVisible);
    };
  }, [mapReady]);

  // A clicked STOP tag flies the map to its pin, zoomed in until the pins
  // around it separate, and makes the pin bounce.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focus) return;
    const index = stopsRef.current.findIndex(({ item }) => item.id === focus.itemId);
    const marker = markersRef.current[index];
    if (!marker) return;
    const container = map.getContainer();
    const { top, bottom } = container.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      container.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Zoom into the area too, so pins crowded around this one pull apart.
    const coordinates = stopsRef.current.map(({ town }) => [town.longitude, town.latitude]);
    zoomToSpreadPins(map, coordinates[index], coordinates, STOP_FOCUS_ZOOM, 900);
    const pin = marker.getElement().querySelector(".planner-route-pin");
    pin.classList.remove("is-bouncing");
    void pin.offsetWidth; // restart the animation on repeated clicks
    pin.classList.add("is-bouncing");
    pin.addEventListener("animationend", () => pin.classList.remove("is-bouncing"), { once: true });
  }, [focus, mapReady]);

  if (!webglSupported)
    return (
      <div className="planner-route-status">
        <strong>地圖無法顯示</strong>
        <span>這個瀏覽器不支援 WebGL，請更新瀏覽器或改用其他裝置。</span>
      </div>
    );
  return (
    <div ref={canvasRef} className="planner-route-map" aria-label={label} />
  );
}

export default RouteMap;
