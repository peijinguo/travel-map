import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// OpenFreeMap serves OpenStreetMap tiles without an API key or usage fees.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
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

const makeRouteLine = (coordinates) => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates },
});

function makeStopMarker(stop, index, coordinate, offset) {
  const pin = document.createElement("div");
  pin.className = "planner-route-pin";
  pin.textContent = String(index + 1);
  pin.title = `第 ${index + 1} 站：${stop.town.name}`;

  const content = document.createElement("div");
  const stopNumber = document.createElement("strong");
  const stopName = document.createElement("span");
  content.className = "planner-route-popup";
  stopNumber.textContent = `STOP ${String(index + 1).padStart(2, "0")}`;
  stopName.textContent = stop.town.name;
  content.append(stopNumber, stopName);

  return new maplibregl.Marker({ element: pin, anchor: "bottom", offset })
    .setLngLat(coordinate)
    .setPopup(new maplibregl.Popup({ offset: 40 }).setDOMContent(content));
}

function RouteMap({ stops }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const stopsRef = useRef(stops);
  const [mapReady, setMapReady] = useState(false);
  const [webglSupported] = useState(() =>
    Boolean(document.createElement("canvas").getContext("webgl2")),
  );
  const stopsKey = stops
    .map(({ item, town }) =>
      [item.id, town.id, town.latitude, town.longitude, town.name].join(":"),
    )
    .join("|");

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  useEffect(() => {
    if (!webglSupported || !canvasRef.current) return undefined;
    const map = new maplibregl.Map({
      container: canvasRef.current,
      style: MAP_STYLE_URL,
      center: JAPAN_CENTER,
      zoom: JAPAN_ZOOM,
      minZoom: 2,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.on("load", () => {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: makeRouteLine([]),
      });
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#8b5a3c", "line-width": 5, "line-opacity": 0.95 },
      });
      setMapReady(true);
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
      makeStopMarker(stop, index, coordinates[index], markerOffsets[index]).addTo(map),
    );
    map.getSource(ROUTE_SOURCE_ID)?.setData(makeRouteLine(coordinates));

    if (!coordinates.length) {
      map.jumpTo({ center: JAPAN_CENTER, zoom: JAPAN_ZOOM });
    } else if (coordinates.length === 1) {
      map.jumpTo({ center: coordinates[0], zoom: 12 });
    } else {
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, animate: false });
    }
  }, [stopsKey, mapReady]);

  if (!webglSupported)
    return (
      <div className="planner-route-status">
        <strong>地圖無法顯示</strong>
        <span>這個瀏覽器不支援 WebGL，請更新瀏覽器或改用其他裝置。</span>
      </div>
    );
  return (
    <div ref={canvasRef} className="planner-route-map" aria-label="日本雪旅行程地圖" />
  );
}

export default RouteMap;
