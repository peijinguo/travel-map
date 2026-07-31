import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const officialUrl = "https://zaomountainresort.com/ropeway-lift-information/";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "src/data/zaoLiftStatus.js");

function extractRopewayData(html) {
  const match = html.match(/\bvar\s+ropewayData\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) throw new Error("找不到官網 ropewayData");
  return JSON.parse(match[1]);
}

function normalize(item) {
  return {
    number: Number(item.ropeway_number),
    name: item.name,
    start: [Number(item.startpoint_x), Number(item.startpoint_y)],
    end: [Number(item.endpoint_x), Number(item.endpoint_y)],
    officialStatus: item.status,
    openTime: item.open_time || "",
    closeTime: item.close_time || "",
  };
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
    headers: { "user-agent": "TravelMap-ZaoStatusSync/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`官網回應 HTTP ${response.status}`);

  const lifts = extractRopewayData(await response.text()).map(normalize);
  if (lifts.length < 1) throw new Error("官網纜車資料為空");

  const source = `// 此檔案由 scripts/sync-zao-lift-status.mjs 自動產生，請勿手動修改。\nexport const zaoLiftStatuses = ${JSON.stringify(lifts, null, 2)};\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, "utf8");
  console.log(`已從藏王官網同步 ${lifts.length} 條纜車資料。`);
} catch (error) {
  if (await hasCachedData()) {
    console.warn(`藏王官網同步失敗，沿用上次資料：${error.message}`);
  } else {
    throw error;
  }
}
