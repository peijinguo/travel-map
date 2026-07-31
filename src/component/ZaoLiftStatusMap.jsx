import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const normalStatuses = new Set(["平常運転", "通常運転", "運行中"]);

function ZaoLiftStatusMap({ lifts }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !lifts.length) return undefined;

    const geojson = {
      type: "FeatureCollection",
      features: lifts.map((lift) => ({
        type: "Feature",
        properties: {
          number: lift.number,
          name: lift.name,
          color: normalStatuses.has(lift.officialStatus) ? "#1747e8" : "#858b91",
        },
        geometry: {
          type: "LineString",
          coordinates: [lift.start, lift.end],
        },
      })),
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [140.4076, 38.162],
      zoom: 13,
      bearing: 80,
      attributionControl: true,
      cooperativeGestures: false,
    });

    map.scrollZoom.enable();
    map.dragPan.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    map.on("load", () => {
      map.addSource("zao-lifts", { type: "geojson", data: geojson });
      map.addLayer({
        id: "zao-lift-lines",
        type: "line",
        source: "zao-lifts",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.82,
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      lifts.forEach((lift) => {
        bounds.extend(lift.start);
        bounds.extend(lift.end);
      });
      map.fitBounds(bounds, { padding: 58, duration: 0 });
    });

    return () => map.remove();
  }, [lifts]);

  return (
    <div
      ref={containerRef}
      className="zao-live-lift-map"
      role="application"
      aria-label={`藏王溫泉 ${lifts.length} 條 Ropeway 與纜車互動地圖，可用滾輪縮放並拖曳`}
    />
  );
}

export default ZaoLiftStatusMap;
