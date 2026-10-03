import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://asari-ski.com/slopes/#anchor01";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/asariLiftStatus.js");

const decodeHtml = (value) => value
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
  .replace(/\s+/g, " ")
  .trim();

function extractStatus(html) {
  const section = html.match(/<div class="asari-rift">([\s\S]*?)<\/div>\s*<!--リフト end-->/)?.[1];
  if (!section) throw new Error("找不到官網纜車運行區塊");

  const lifts = [...section.matchAll(
    /<div class="asari-rift__item">[\s\S]*?<p class="title">([\s\S]*?)<\/p>[\s\S]*?<p class="open-close"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/g,
  )].map((match) => ({
    officialName: decodeHtml(match[1]),
    officialStatus: decodeHtml(match[2]),
  }));

  if (lifts.length < 1) throw new Error("官網纜車資料為空");

  const date = decodeHtml(html.match(/<p class="curent-time">([\s\S]*?)<\/p>/)?.[1] ?? "");
  if (!date) throw new Error("找不到官網更新時間");
  return { updatedAt: date.replace(/\s*時$/, ":00"), lifts };
}

async function hasCachedData() {
  try {
    await access(outputPath);
    return true;
  } catch {
    return false;
  }
}

try {
  const response = await fetch(officialUrl, {
    headers: { "user-agent": "TravelMap-AsariStatusSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);

  const status = extractStatus(await response.text());
  const source = `// 此檔案由 scripts/sync-asari-lift-status.mjs 自動產生，請勿手動修改。\nexport const asariLiftStatus = ${JSON.stringify(status, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已從朝里川官網同步 ${status.lifts.length} 項纜車／運輸設備資料（${status.updatedAt}）。`);
} catch (error) {
  if (await hasCachedData()) {
    console.warn(`朝里川官網同步失敗，沿用上次資料：${error.message}`);
  } else {
    throw error;
  }
}
