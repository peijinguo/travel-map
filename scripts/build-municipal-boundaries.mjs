import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "boundary-source");
const output = join(here, "..", "src", "municipalityPaths.js");

const towns = {
  niseko: ["01395"],
  otaru: ["01203"],
  utashinai: ["01227"],
  sapporo: ["01101", "01102", "01103", "01104", "01105", "01106", "01107", "01108", "01109", "01110"],
  mashike: ["01481"],
  horokanai: ["01472"],
  asahikawa: ["01204"],
  pippu: ["01455"],
  toma: ["01454"],
  higashikawa: ["01458"],
  kamikawa: ["01457"],
  furano: ["01229"],
  hachimantai: ["03214"],
  shizukuishi: ["03301"],
  kitakami: ["03206"],
  zao: ["06201"],
  yuzawa: ["15461"],
  myoko: ["15217"],
  hakuba: ["20485"],
  nozawa: ["20563"],
  yamanouchi: ["20561"],
};

const project = ([longitude, latitude]) => [
  1090 + (longitude - 129) * 25.1,
  1320 + (45.52 - latitude) * 34,
];

const distanceToSegmentSq = (point, start, end) => {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0]; y = end[1];
    } else if (t > 0) {
      x += dx * t; y += dy * t;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
};

const simplify = (points, toleranceSq = 0.035) => {
  if (points.length <= 4) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = toleranceSq;
  let index = -1;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegmentSq(points[i], first, last);
    if (distance > maxDistance) { index = i; maxDistance = distance; }
  }
  if (index === -1) return [first, last];
  return [...simplify(points.slice(0, index + 1), toleranceSq).slice(0, -1), ...simplify(points.slice(index), toleranceSq)];
};

const area = (ring) => Math.abs(ring.reduce((sum, point, index) => {
  const next = ring[(index + 1) % ring.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2);

const geometryPolygons = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
};

const ringPath = (ring) => {
  const points = simplify(ring.map(project));
  if (points.length < 3) return "";
  return `${points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")} Z`;
};

const result = {};
for (const [town, codes] of Object.entries(towns)) {
  const polygons = [];
  for (const code of codes) {
    const geojson = JSON.parse(await readFile(join(source, `${code}.geojson`), "utf8"));
    for (const feature of geojson.features) {
      for (const polygon of geometryPolygons(feature.geometry)) {
        const projectedOuter = polygon[0].map(project);
        polygons.push({ polygon, size: area(projectedOuter) });
      }
    }
  }

  const kept = polygons
    .sort((a, b) => b.size - a.size)
    .filter((item, index) => index < 16 && (item.size >= 0.08 || index === 0));

  result[town] = kept.map(({ polygon }) => polygon.map(ringPath).filter(Boolean).join(" ")).filter(Boolean);
}

const japanGeojson = JSON.parse(await readFile(join(source, "japan.geojson"), "utf8"));
const japanPrefecturePaths = japanGeojson.features
  .filter((feature) => String(feature.properties.id) !== "47")
  .map((feature) => {
    const polygons = geometryPolygons(feature.geometry)
      .map((polygon) => ({ polygon, size: area(polygon[0].map(project)) }))
      .sort((a, b) => b.size - a.size)
      // Keep only the main landmass for each prefecture so remote islands do
      // not appear as detached shapes around the illustrated map.
      .slice(0, 1);
    return {
      id: String(feature.properties.id).padStart(2, "0"),
      name: feature.properties.nam_ja,
      paths: polygons.map(({ polygon }) => polygon.map(ringPath).filter(Boolean).join(" ")).filter(Boolean),
    };
  });

const header = `// Generated from Geoshape Repository municipal GeoJSON (MLIT National Land Numerical Information).\n// Run: node scripts/build-municipal-boundaries.mjs\n`;
await writeFile(
  output,
  `${header}export const municipalityPaths = ${JSON.stringify(result, null, 2)};\n\nexport const japanPrefecturePaths = ${JSON.stringify(japanPrefecturePaths, null, 2)};\n`,
  "utf8",
);
console.log(`Generated ${output}`);
