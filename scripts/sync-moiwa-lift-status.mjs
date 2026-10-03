import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://sapporo-moiwa.jp/skiareainformation/#course-guide";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/moiwaLiftStatus.js");
const liftNames = ["第1リフトA線", "第1ペアリフトB線", "第2トリプルリフト", "第3ペアリフト", "第4トリプルリフト"];
const courseNames = [
  "1うさぎ平コース", "2ダイナミックコース 上部", "2ダイナミックコース 下部",
  "3クリスタルコース", "4パノラマコース 上部", "4パノラマコース 下部",
  "5ファミリーゲレンデ", "6フレンドリーゲレンデ", "7連絡路コース",
  "8観光道路コース", "9からまつコース A", "9からまつコース B",
  "10林間コース", "11 Fun×Fun SQUARE",
];

const decodeHtml = (value) => value
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&times;|&#215;|&#xd7;/gi, "×")
  .replace(/&cir;|&#9675;|&#x25cb;/gi, "○")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ")
  .trim();

function extractStatus(html) {
  const text = decodeHtml(html);
  const updated = text.match(/(20\d{2})[./年](\d{1,2})[./月](\d{1,2})[.日\s]+(\d{1,2}):(\d{2})\s*更新/);
  if (!updated) throw new Error("找不到札幌藻岩山官網更新時間");

  const readStatus = (officialName, openLabel, closedLabel) => {
    const escapedName = officialName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escapedName}\\s*([○△×])(?:\\s*(OPEN|CLOSE|運行中|一時運休中|運休中))?`, "i"));
    if (!match) throw new Error(`找不到 ${officialName} 的官網狀態`);
    const status = match[1] === "○" ? openLabel : match[1] === "△" ? "部分開放" : closedLabel;
    return { officialName, mark: match[1], status };
  };

  const lifts = liftNames.map((name) => readStatus(name, "運行中", "停止運行"));
  const courses = courseNames.map((name) => readStatus(name, "開放", "關閉"));

  return {
    updatedAt: `${updated[1]}/${updated[2].padStart(2, "0")}/${updated[3].padStart(2, "0")} ${updated[4].padStart(2, "0")}:${updated[5]}`,
    sourceUrl: officialUrl,
    lifts,
    courses,
  };
}

async function hasCachedData() {
  try { await access(outputPath); return true; } catch { return false; }
}

try {
  const response = await fetch(officialUrl, {
    headers: { "user-agent": "TravelMap-MoiwaStatusSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);
  const status = extractStatus(await response.text());
  const source = `// 此檔案由 scripts/sync-moiwa-lift-status.mjs 自動產生，請勿手動修改。\nexport const moiwaLiftStatus = ${JSON.stringify(status, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步札幌藻岩山 ${status.lifts.length} 座纜車與 ${status.courses.length} 項雪道資料（${status.updatedAt}）。`);
} catch (error) {
  if (await hasCachedData()) console.warn(`札幌藻岩山纜車狀態同步失敗，沿用上次資料：${error.message}`);
  else throw error;
}
