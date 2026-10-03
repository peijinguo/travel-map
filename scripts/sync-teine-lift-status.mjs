import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://sapporo-teine.com/snow/gelande-report";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/teineLiftStatus.js");

const lifts = [
  ["Highland Zone", "パノラマ1号", "Panorama No. 1"],
  ["Highland Zone", "パノラマ2号", "Panorama No. 2"],
  ["Highland Zone", "サミットエクスプレス", "Summit Express"],
  ["Highland Zone", "パラダイスリフト", "Paradise Lift"],
  ["Olympia Zone", "エイトゴンドラ", "Eight Gondola"],
  ["Olympia Zone", "白樺第1リフト", "Shirakaba No. 1 Lift"],
  ["Olympia Zone", "白樺第2リフト", "Shirakaba No. 2 Lift"],
  ["Olympia Zone", "白樺第3リフト", "Shirakaba No. 3 Lift"],
  ["Olympia Zone", "聖火台第1リフト", "Olympic Cauldron No. 1 Lift"],
  ["Olympia Zone", "スノーエスカレーター", "Snow Escalator"],
];

const courses = [
  ["HZ-1", "Highland Zone", "シティビュークルーズ"],
  ["HZ-2", "Highland Zone", "シティビューパノラマ"],
  ["HZ-3", "Highland Zone", "女子大回転"],
  ["HZ-4", "Highland Zone", "北かべ"],
  ["HZ-5", "Highland Zone", "ナチュラル"],
  ["HZ-6", "Highland Zone", "男女回転"],
  ["HZ-7", "Highland Zone", "パラダイス"],
  ["OZ-1", "Olympia Zone", "レインボー"],
  ["OZ-2", "Olympia Zone", "白樺サンシャイン"],
  ["OZ-3", "Olympia Zone", "白樺サントラップ"],
  ["OZ-4", "Olympia Zone", "白樺サンライズ"],
  ["OZ-5", "Olympia Zone", "白樺サンダンス"],
  ["OZ-6", "Olympia Zone", "聖火台オーシャンダイブ"],
  ["OZ-7", "Olympia Zone", "聖火台オーシャンクルーズ"],
  ["OZ-8", "Olympia Zone", "聖火台オーシャンストリーム"],
];

const decodeHtml = (value) => value
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function extractStatus(html) {
  const plainText = decodeHtml(html);
  const updatedAt = plainText.match(/UPDATED\s*(\d{4}\.\d{2}\.\d{2})\s*(\d{1,2}:\d{2})/i);
  if (!updatedAt) throw new Error("找不到官網更新時間");

  const items = lifts.map(([zone, officialName, name], index) => {
    const nextName = lifts[index + 1]?.[1];
    const boundary = nextName ? `(?=${escapeRegExp(nextName)})` : "(?=オープン HZ|コースオープン状況|$)";
    const match = plainText.match(new RegExp(`${escapeRegExp(officialName)}\\s*([\\s\\S]*?)${boundary}`));
    if (!match) throw new Error(`找不到 ${officialName} 的官網資料`);
    const detail = match[1].trim();
    const status = /運行中|営業中/.test(detail)
      ? "運行中"
      : /運行予定/.test(detail)
        ? "運行予定"
        : /天候調査/.test(detail)
          ? "天候調查中"
          : /一時運休/.test(detail)
            ? "暫停運行"
            : "停止運行";
    return { id: index + 1, zone, name, officialName, status, detail };
  });

  const courseItems = courses.map(([id, zone, officialName]) => {
    const match = html.match(new RegExp(`<li[^>]*data-label=["']${escapeRegExp(id)}["'][^>]*>([\\s\\S]*?)<\\/li>`, "i"));
    if (!match) throw new Error(`找不到 ${id} ${officialName} 的官網資料`);
    const detail = decodeHtml(match[1]);
    const status = /一部|part(?:ly|ial)/iu.test(detail)
      ? "部分開放"
      : /オープン|open/iu.test(detail) && !/クローズ|close/iu.test(detail)
        ? "開放"
        : "關閉";
    return { id, zone, officialName, status };
  });

  return { updatedAt: `${updatedAt[1]} ${updatedAt[2]}`, sourceUrl: officialUrl, lifts: items, courses: courseItems };
}

async function hasCachedData() {
  try { await access(outputPath); return true; } catch { return false; }
}

try {
  const response = await fetch(officialUrl, {
    headers: { "user-agent": "TravelMap-TeineStatusSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);
  const status = extractStatus(await response.text());
  const source = `// 此檔案由 scripts/sync-teine-lift-status.mjs 自動產生，請勿手動修改。\nexport const teineLiftStatus = ${JSON.stringify(status, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已同步 Sapporo Teine ${status.lifts.length} 項纜車資料（${status.updatedAt}）。`);
} catch (error) {
  if (await hasCachedData()) console.warn(`Sapporo Teine 纜車狀態同步失敗，沿用上次資料：${error.message}`);
  else throw error;
}
