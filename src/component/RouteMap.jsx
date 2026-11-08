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
  const popup = new maplibregl.Popup({ offset: 30 }).setLngLat(coordinate).setDOMContent(content);
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
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#3f5b69", "line-width": 2.5, "line-opacity": 0.95 },
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
    map.getSource(ROUTE_SOURCE_ID)?.setData(makeRouteLine(coordinates, pathsRef.current));
  }, [stopsKey, pathsKey, mapReady]);

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
