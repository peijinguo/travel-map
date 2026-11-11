// Taiwan Taoyuan Airport's official flight board (yesterday, today and
// tomorrow) → src/data/flightStatus.js, for the flight cards on 機票住宿.
//
// - schedule: every flight between Taoyuan and Japan, by flight number: which
//   way it flies, the Taoyuan terminal, its usual time and the Japanese airport.
// - live: the trips' flights, on their own date, once the board shows that
//   date: gate, check-in counter, baggage belt, estimated time and status.
//   The flights come from the 機票住宿 page, which saves each trip's flight
//   codes and dates to Firebase (reportTrackedFlights in
//   src/services/firebase.js), plus src/data/trackedFlights.json.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "https://www.taoyuan-airport.com/uploads/flightx/a_flight_v4.txt";
const OUTPUT = new URL("../src/data/flightStatus.js", import.meta.url);

// The site's public Firebase web key and an anonymous sign-in, as the page
// itself uses (see scripts/unlocated_places.py); no secrets needed.
const API_KEY = "AIzaSyAglWZlcTSZWxr6ic-aafjAYvYaTzIyYMc";
const PROJECT = "travel-map-9c5c2";
const DIRECTORY_ID = createHash("sha256").update("travel-map:__trip-directory__").digest("hex");

async function tripFlights() {
  try {
    const signUp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }).then((response) => response.json());
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/syncSpaces/${DIRECTORY_ID}/appData/trackedFlights`,
      { headers: { Authorization: `Bearer ${signUp.idToken}` } },
    );
    if (!response.ok) return [];
    const fields = (await response.json()).fields?.flights?.mapValue?.fields ?? {};
    return Object.values(fields).map(({ mapValue }) => ({
      flight: mapValue?.fields?.flight?.stringValue ?? "",
      date: mapValue?.fields?.date?.stringValue ?? "",
    }));
  } catch (error) {
    console.warn("Could not read the trips' flights:", error.message);
    return [];
  }
}

const listed = JSON.parse(readFileSync(new URL("../src/data/trackedFlights.json", import.meta.url), "utf8"));
const TRACKED = [
  ...new Map(
    [...listed, ...(await tripFlights())]
      .filter(({ flight, date }) => /^[A-Z0-9]{3,7}$/u.test(flight) && /^\d{4}-\d{2}-\d{2}$/u.test(date))
      .map(({ flight, date }) => [`${flight}|${date}`, { flight, date }]),
  ).values(),
];

const JAPAN = new Set([
  "KIX", "NRT", "HND", "CTS", "NGO", "FUK", "OKA", "HKD", "SDJ", "KOJ", "TAK", "OKJ",
  "HIJ", "KMJ", "FSZ", "IBR", "AOJ", "KMQ", "TOY", "UKB", "MYJ", "KIJ", "ASJ", "ISG",
  "MMY", "AKJ", "NGS", "OIT", "KCZ", "UBJ", "YGJ", "IZO", "MMB", "OBO", "KUH", "HNA",
]);

const response = await fetch(SOURCE, { headers: { "User-Agent": "travel-map flight sync" } });
if (!response.ok) throw new Error(`Taoyuan flight board: HTTP ${response.status}`);
const text = new TextDecoder("big5").decode(await response.arrayBuffer());

// Columns: terminal, A(rrival)/D(eparture), airline code, airline name,
// number, gate, scheduled date, scheduled time, estimated date, estimated
// time, other airport, its English and Chinese names, status, aircraft, …,
// baggage belt (18), check-in counter (19).
const rows = text
  .split(/\r?\n/u)
  .map((line) => line.split(",").map((cell) => cell.trim()))
  .filter((cells) => cells.length >= 14 && JAPAN.has(cells[10]));

const hhmm = (time) => time.slice(0, 5);
const isoDate = (date) => date.replaceAll("/", "-");
// 「準時ON TIME」→「準時」
const statusText = (status) => status.replace(/[A-Z][A-Z\s]*$/u, "").trim() || status;

const schedule = {};
const seen = {};
for (const cells of rows) {
  const flight = `${cells[2]}${cells[4].replace(/^0+/u, "")}`;
  const key = `${cells[1]}|${cells[0]}|${hhmm(cells[7])}|${cells[10]}`;
  seen[flight] ??= {};
  seen[flight][key] = (seen[flight][key] ?? 0) + 1;
}
// A flight's usual pattern is the one it flies most often on the board.
for (const [flight, patterns] of Object.entries(seen).sort(([a], [b]) => a.localeCompare(b))) {
  const [key] = Object.entries(patterns).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const [way, terminal, time, airport] = key.split("|");
  schedule[flight] = { way, terminal, time, airport };
}

const live = {};
for (const { flight, date } of TRACKED) {
  const row = rows.find(
    (cells) => `${cells[2]}${cells[4].replace(/^0+/u, "")}` === flight && isoDate(cells[6]) === date,
  );
  if (!row) continue;
  live[`${flight}|${date}`] = {
    way: row[1],
    terminal: row[0],
    gate: row[5],
    time: hhmm(row[7]),
    estimatedDate: isoDate(row[8]),
    estimatedTime: hhmm(row[9]),
    airport: row[10],
    status: statusText(row[13]),
    belt: row[18] ?? "",
    counter: row[19] ?? "",
  };
}

// One flight a line: [way, terminal, time, airport].
const scheduleLines = Object.entries(schedule)
  .map(([flight, { way, terminal, time, airport }]) => `  ${JSON.stringify(flight)}: ${JSON.stringify([way, terminal, time, airport])},`)
  .join("\n");
const body = `// Generated by scripts/sync-flight-status.mjs from Taiwan Taoyuan Airport's
// official flight board. Do not edit by hand.
// schedule: flight → [A(rrives at Taoyuan) / D(eparts), Taoyuan terminal,
// usual time, Japanese airport]
export const flightSchedule = {
${scheduleLines}
};

export const flightLive = ${JSON.stringify(live, null, 2)};
`;
writeFileSync(OUTPUT, body);
console.log(`schedule: ${Object.keys(schedule).length} flights, live: ${Object.keys(live).length}`);
