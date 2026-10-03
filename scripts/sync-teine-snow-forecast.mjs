import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceUrl = "https://ja.snow-forecast.com/resorts/TeineHighland/6day/mid";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/teineSnowForecast.js");

const text = (html) => html
  .replace(/<[^>]+>/g, " ")
  .replace(/&(?:thinsp|nbsp);|&#x200A;/gi, " ")
  .replace(/&deg;/gi, "°")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ")
  .trim();

const rowCells = (html, row) => {
  const content = html.match(new RegExp(`<tr class="[^"]*" data-row="${row}">([\\s\\S]*?)<\\/tr>`))?.[1];
  if (!content) throw new Error(`找不到 ${row} 資料列`);
  return [...content.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => text(match[1]));
};

const number = (value) => {
  const parsed = Number.parseFloat(value.replace("—", "0"));
  return Number.isFinite(parsed) ? parsed : 0;
};

function extractForecast(html) {
  const dates = [...html.matchAll(/data-column-head="" data-date="(\d{4}-\d{2}-\d{2})"/g)]
    .map((match) => match[1]);
  if (dates.length < 6) throw new Error("預報日期不足 6 天");

  const phrases = rowCells(html, "phrases");
  const snow = rowCells(html, "snow").map(number);
  const max = rowCells(html, "temperature-max").map(number);
  const min = rowCells(html, "temperature-min").map(number);
  const wind = [...(html.match(/<tr class="[^"]*" data-row="wind">([\s\S]*?)<\/tr>/)?.[1] ?? "")
    .matchAll(/data-speed="([\d.]+)"/g)].map((match) => Number(match[1]));
  if ([phrases, snow, max, min, wind].some((row) => row.length < 18))
    throw new Error("預報時段資料不完整");

  const issuedAt = text(html.match(/<span class="location-issued__value"><b>([\s\S]*?)<\/b>/)?.[1] ?? "");
  if (!issuedAt) throw new Error("找不到預報發布時間");

  const days = dates.slice(0, 6).map((date, dayIndex) => {
    const start = dayIndex * 3;
    return {
      date,
      snowfall: snow.slice(start, start + 3).reduce((sum, value) => sum + value, 0),
      min: Math.min(...min.slice(start, start + 3)),
      max: Math.max(...max.slice(start, start + 3)),
    };
  });
  const seventh = new Date(`${days.at(-1).date}T12:00:00Z`);
  seventh.setUTCDate(seventh.getUTCDate() + 1);
  days.push({ date: seventh.toISOString().slice(0, 10), snowfall: null, min: null, max: null });

  return {
    sourceUrl,
    elevation: 682,
    issuedAt,
    current: {
      weather: phrases[0],
      temperature: max[0],
      minTemperature: min[0],
      wind: wind[0],
      snowfall: snow[0],
    },
    days,
  };
}

async function hasCachedData() {
  try { await access(outputPath); return true; } catch { return false; }
}

try {
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "TravelMap-TeineForecastSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Snow-Forecast 回應 HTTP ${response.status}`);
  const forecast = extractForecast(await response.text());
  const source = `// 此檔案由 scripts/sync-teine-snow-forecast.mjs 自動產生，請勿手動修改。\nexport const teineSnowForecast = ${JSON.stringify(forecast, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步 Sapporo Teine ${forecast.days.length - 1} 天公開預報（${forecast.issuedAt}）。`);
} catch (error) {
  if (await hasCachedData()) console.warn(`Sapporo Teine 預報同步失敗，沿用上次資料：${error.message}`);
  else throw error;
}
