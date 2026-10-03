import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://www.bankei.co.jp/ski/";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/bankeiStatus.js");
const liftNames = ["センタートリプル", "オレンジペア", "ウエストペア", "イーストペア"];
const courseNames = [
  "センターAコース", "センターBコース", "センターCコース", "オレンジコース", "くるみコース",
  "どんぐりコース", "きのこコース", "グリーンAコース", "グリーンBコース", "イーストAコース",
  "イーストBコース", "オレンジ連絡コース", "スラロームバーン", "モーグルバーン", "モーグルパーク",
  "ハーフパイプ", "ウエストAコース", "ウエスト林間コース", "わくわくスノーランド",
];
const decodeHtml = (value) => value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function extractRows(html, names, openStatus, closedStatus) {
  return names.map((officialName) => {
    const match = html.match(new RegExp(`<td[^>]*>\\s*${escapeRegExp(officialName)}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
    if (!match) throw new Error(`找不到 ${officialName} 的官網資料`);
    const hours = decodeHtml(match[1]);
    return { officialName, status: hours ? openStatus : closedStatus, hours };
  });
}

function extractStatus(html) {
  const updatedAt = decodeHtml(html).match(/リフト・コース運行情報\s*(\d{2}\/\d{2})\s*(\d{1,2}:\d{2})\s*現在/);
  if (!updatedAt) throw new Error("找不到盤溪官網更新時間");
  return {
    updatedAt: `${updatedAt[1]} ${updatedAt[2]}`,
    sourceUrl: officialUrl,
    lifts: extractRows(html, liftNames, "運行中", "停止運行"),
    courses: extractRows(html, courseNames, "開放", "關閉"),
  };
}

async function hasCachedData() { try { await access(outputPath); return true; } catch { return false; } }

try {
  const response = await fetch(officialUrl, { headers: { "user-agent": "TravelMap-BankeiStatusSync/1.0" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);
  const status = extractStatus(await response.text());
  const source = `// 此檔案由 scripts/sync-bankei-status.mjs 自動產生，請勿手動修改。\nexport const bankeiStatus = ${JSON.stringify(status, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步 Bankei ${status.lifts.length} 座纜車與 ${status.courses.length} 項雪道資料（${status.updatedAt}）。`);
} catch (error) {
  if (await hasCachedData()) console.warn(`Bankei 狀態同步失敗，沿用上次資料：${error.message}`);
  else throw error;
}
