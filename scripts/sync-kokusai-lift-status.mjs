import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://www.sapporo-kokusai.jp/slopes/";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/kokusaiLiftStatus.js");
const liftDefinitions = [
  ["スカイキャビン８", "Sky Cabin 8", "8 人座", "2,000 m"],
  ["メルヘンクワッドリフト", "Meruhen Quad Lift", "4 人座", "1,300 m"],
  ["エコークワッドリフト", "Echo Quad Lift", "4 人座", "1,005 m"],
  ["ウッディーペアリフト", "Woody Pair Lift", "2 人座", "810 m"],
  ["スノーエスカレーター", "Snow Escalator", "雪地電扶梯", "—"],
];
const courseDefinitions = [
  ["林間コース", "初級", "12°", "8°", "1.2 km"],
  ["メルヘンコース", "初級", "12°", "8°", "2.4 km"],
  ["ウッディコース", "中級", "16°", "11°", "1.2 km"],
  ["スイングコース", "中級", "28°", "10°", "2.0 km"],
  ["ファミリーコース", "中級", "20°", "11°", "1.6 km"],
  ["エコーコース", "上級", "22°", "12°", "1.0 km"],
  ["ダウンヒルコース", "上級", "30°", "15°", "2.2 km"],
  ["初心者・そりコース", "初級", "—", "—", "—"],
];

const decodeHtml = (value) => value
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeStatus = (value) => {
  if (/運行中|営業中/.test(value)) return "運行中";
  if (/運行予定/.test(value)) return "運行予定";
  if (/天候調査/.test(value)) return "天候調查中";
  if (/一時運休/.test(value)) return "暫停運行";
  return "停止運行";
};
const normalizeCourseStatus = (value) => {
  if (/滑走可|オープン|open|[〇○]/i.test(value)) return "開放中";
  if (/予定/.test(value)) return "開放予定";
  if (/天候調査/.test(value)) return "天候調查中";
  return "未開放";
};

function extractStatus(html) {
  const text = decodeHtml(html);
  const courseSection = text.match(/コース情報([\s\S]*?)リフト運行情報/)?.[1];
  const section = text.match(/リフト運行情報([\s\S]*?)(?:パーク情報|本日の営業)/)?.[1];
  if (!courseSection || !section) throw new Error("找不到官網雪道／纜車運行區塊");

  const courses = courseDefinitions.map(([officialName, level, maxSlope, averageSlope, distance], index) => {
    const nextName = courseDefinitions[index + 1]?.[0];
    const boundary = nextName ? `(?=${escapeRegExp(nextName)})` : "$";
    const row = courseSection.match(new RegExp(`${escapeRegExp(officialName)}([\\s\\S]*?)${boundary}`))?.[1];
    if (!row) throw new Error(`找不到 ${officialName} 的官網資料`);
    return { id: index + 1, officialName, level, maxSlope, averageSlope, distance, status: normalizeCourseStatus(row) };
  });

  const lifts = liftDefinitions.map(([officialName, name, type, distance], index) => {
    const nextName = liftDefinitions[index + 1]?.[0];
    const boundary = nextName ? `(?=${escapeRegExp(nextName)})` : "$";
    const row = section.match(new RegExp(`${escapeRegExp(officialName)}([\\s\\S]*?)${boundary}`))?.[1];
    if (!row) throw new Error(`找不到 ${officialName} 的官網資料`);
    return { id: index + 1, officialName, name, type, distance, status: normalizeStatus(row) };
  });

  const syncedAt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date());
  return { syncedAt, sourceUrl: officialUrl, courses, lifts };
}

async function hasCachedData() {
  try { await access(outputPath); return true; } catch { return false; }
}

try {
  const response = await fetch(officialUrl, {
    headers: { "user-agent": "TravelMap-KokusaiStatusSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);
  const status = extractStatus(await response.text());
  const source = `// 此檔案由 scripts/sync-kokusai-lift-status.mjs 自動產生，請勿手動修改。\nexport const kokusaiLiftStatus = ${JSON.stringify(status, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步札幌國際 ${status.lifts.length} 項纜車資料（${status.syncedAt}）。`);
} catch (error) {
  if (await hasCachedData()) console.warn(`札幌國際纜車狀態同步失敗，沿用上次資料：${error.message}`);
  else throw error;
}
