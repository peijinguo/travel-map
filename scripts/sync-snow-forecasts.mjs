import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Snow-Forecast's 6-day mid-mountain forecast for every resort page. The site
// cannot read snow-forecast.com from the browser, so this runs in the status
// workflow and writes src/data/snowForecasts.js. A forecast younger than
// REFRESH_HOURS is kept as is, so the 15-minute workflow fetches each page only
// a few times a day.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/snowForecasts.js");
const REFRESH_HOURS = 3;

// Resort pages (`town id/index` as in the URL) → Snow-Forecast resort. A few
// small hills have no page of their own and use the nearest resort's.
const resortSlugs = {
  "nanae/0": "HakodateNanae",
  "mori/0": "Greenpia-Onuma",
  "niseko/0": "Niseko",
  "niseko/1": "NisekoHigashiyama",
  "niseko/2": "NisekoAnnpuriKokusai",
  "niseko/3": "Niseko-Hanazono-Resort",
  "niseko/4": "Niseko-Moiwa",
  "otaru/0": "OtaruTenguyama",
  "otaru/1": "AsarigawaOnsen",
  "otaru/2": "Snow-CluesOnze",
  "utashinai/0": "Kamoidake-Kokusai",
  "sapporo/0": "TeineHighland",
  "sapporo/1": "SapporoKokusai",
  "sapporo/2": "SapporoBankei",
  "sapporo/3": "SapporoMoiwayama",
  "sapporo/4": "SapporoMoiwayama",
  "sapporo/5": "SapporoMoiwayama",
  "mashike/0": "Mashike-Choei-Syokanbetsudake",
  "horokanai/0": "Horotachi",
  "asahikawa/0": "KamuiSkiLinks",
  "asahikawa/1": "KamuiSkiLinks",
  "asahikawa/2": "KamuiSkiLinks",
  "pippu/0": "Pippu",
  "toma/0": "Pippu",
  "higashikawa/0": "Canmoa-Ski-Village",
  "higashikawa/1": "Asahidake",
  "kamikawa/0": "DaisetsuzanKurodake",
  "kamikawa/1": "DaisetsuzanKurodake",
  "furano/0": "Furano",
  "hachimantai/0": "Appi-Kogen",
  "hachimantai/1": "HachimantaiResort",
  "hachimantai/2": "Shimokura",
  "shizukuishi/0": "Shizukuishi",
  "shizukuishi/1": "Amihari",
  "shizukuishi/2": "Shizukuishi",
  "kitakami/0": "GetouKogen",
  "zao/0": "Yamagata-Zao-Onsen",
  "zao/1": "Zao-Sarukura",
  "yuzawa/0": "Gala-Yuzawa",
  "yuzawa/1": "Naeba",
  "yuzawa/2": "TashiroKaguraMitsumata",
  "yuzawa/3": "Iwappara",
  "yuzawa/4": "YuzawaKogen-Nunoba",
  "yuzawa/5": "PineRidgeResortsKandatsu",
  "yuzawa/6": "YuzawaNakazato",
  "myoko/0": "ARAIMountainandSpa",
  "myoko/1": "Akakura-Shin-Akakura",
  "myoko/2": "Akakura-Kumado",
  "myoko/3": "MyokoIkenotaira",
  "myoko/4": "MyokoSuginohara",
  "myoko/5": "MyokokogenSekiOnsen",
  "hakuba/0": "Happo-One",
  "hakuba/1": "HakubaGoryu",
  "hakuba/2": "Hakuba47",
  "hakuba/3": "HakubaIwatake",
  "hakuba/4": "SunAlpinaHakubaSanosaka",
  "nozawa/0": "Nozawa-Onsen",
  "yamanouchi/0": "OkushigaKogen",
  "yamanouchi/1": "Shiga-Kogen-Yakebitaiyama",
  "yamanouchi/2": "ShigaKogen-IchinoseDiamond",
  "yamanouchi/3": "TakamagaharaMammoth",
  "yamanouchi/4": "Terakoya",
  "yamanouchi/5": "Higashitateyama",
  "yamanouchi/6": "Yokoteyama",
  "yamanouchi/7": "ShigaKogenKumanoyu",
  "yamanouchi/8": "ShigaKogenSunValley",
};

const pageUrl = (slug) => `https://ja.snow-forecast.com/resorts/${slug}/6day/mid`;

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

function extractForecast(html, slug) {
  const dayHeads = [...html.matchAll(/<td[^>]*colspan="(\d+)"[^>]*data-column-head="" data-date="(\d{4}-\d{2}-\d{2})"/g)]
    .map((match) => ({ span: Number(match[1]), date: match[2] }));
  if (dayHeads.length < 6) throw new Error("預報日期不足 6 天");
  const periodCount = dayHeads.slice(0, 6).reduce((sum, day) => sum + day.span, 0);

  const phrases = rowCells(html, "phrases");
  const snow = rowCells(html, "snow").map(number);
  const max = rowCells(html, "temperature-max").map(number);
  const min = rowCells(html, "temperature-min").map(number);
  const wind = [...(html.match(/<tr class="[^"]*" data-row="wind">([\s\S]*?)<\/tr>/)?.[1] ?? "")
    .matchAll(/data-speed="([\d.]+)"/g)].map((match) => Number(match[1]));
  if ([phrases, snow, max, min, wind].some((row) => row.length < periodCount))
    throw new Error("預報時段資料不完整");

  const issuedAt = text(html.match(/<span class="(?:location-subheader-issued|location-issued)__value"><b>([\s\S]*?)<\/b>/)?.[1] ?? "");
  const elevation = Number(html.match(/data-forecast-elevation="mid"[^>]*><span class="height">([\d,]+)<\/span>/)?.[1]?.replace(",", "")) || null;

  // Every forecast slot (morning, afternoon, night), so the page can show the
  // one that is current when it is opened. A first day already under way
  // has fewer than 3 slots: those are its later ones.
  const periods = [];
  let slot = 0;
  dayHeads.slice(0, 6).forEach(({ date, span }) => {
    for (let index = 0; index < span; index += 1, slot += 1) {
      periods.push({
        date,
        part: Math.max(0, 3 - span) + index,
        weather: phrases[slot],
        temperature: max[slot],
        wind: wind[slot],
        snowfall: snow[slot],
      });
    }
  });

  let start = 0;
  const days = dayHeads.slice(0, 6).map(({ date, span }) => {
    const end = start + span;
    const day = {
      date,
      snowfall: Math.round(snow.slice(start, end).reduce((sum, value) => sum + value, 0) * 10) / 10,
      min: Math.min(...min.slice(start, end)),
      max: Math.max(...max.slice(start, end)),
      wind: Math.max(...wind.slice(start, end)),
      // The day's most telling phrase: snow or rain over cloud or sun.
      weather: phrases.slice(start, end).sort((a, b) => weight(b) - weight(a))[0] ?? "",
    };
    start = end;
    return day;
  });

  return {
    sourceUrl: pageUrl(slug),
    elevation,
    issuedAt,
    periods,
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

function weight(phrase) {
  if (/雷/u.test(phrase)) return 5;
  if (/雪|みぞれ/u.test(phrase)) return 4;
  if (/雨/u.test(phrase)) return 3;
  if (/曇|雲/u.test(phrase)) return 2;
  return 1;
}

async function readPrevious() {
  try {
    await access(outputPath);
    const { snowForecasts } = await import(`${pathToFileURL(outputPath).href}?t=${Date.now()}`);
    return snowForecasts;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const previous = await readPrevious();
const fresh = previous?.fetchedAt && Date.now() - Date.parse(previous.fetchedAt) < REFRESH_HOURS * 3600000;
if (fresh && !process.argv.includes("--force")) {
  console.log(`Snow-Forecast 預報仍是 ${REFRESH_HOURS} 小時內的資料，略過。`);
} else {
  const forecasts = { ...(previous?.forecasts ?? {}) };
  const failures = [];
  for (const slug of [...new Set(Object.values(resortSlugs))]) {
    try {
      const response = await fetch(pageUrl(slug), {
        headers: { "user-agent": "TravelMap-SnowForecastSync/1.0" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      forecasts[slug] = extractForecast(await response.text(), slug);
    } catch (error) {
      failures.push(`${slug}：${error.message}`);
    }
    await sleep(800);
  }
  const fetched = Object.keys(forecasts).length;
  if (!fetched) throw new Error(`Snow-Forecast 全部同步失敗：${failures.join("；")}`);
  const data = { fetchedAt: new Date().toISOString(), resorts: resortSlugs, forecasts };
  const source = `// 此檔案由 scripts/sync-snow-forecasts.mjs 自動產生，請勿手動修改。\nexport const snowForecasts = ${JSON.stringify(data, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步 ${fetched} 個 Snow-Forecast 雪場預報。`);
  if (failures.length) console.warn(`以下雪場同步失敗，沿用上次資料：${failures.join("；")}`);
}
