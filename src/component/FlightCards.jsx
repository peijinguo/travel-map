import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { loadPlannerCloud, subscribePlannerCloud } from "../services/firebase";
import { flightLive, flightSchedule } from "../data/flightStatus";
import TRACKED_FLIGHTS from "../data/trackedFlights.json";

// The outbound and return flights at the top of 機票住宿, read from the trip
// in 行程規劃: a stop counts as a flight when its note names a flight number
// or says 航班 / 搭機 / 飛機; the first flight of the trip is 去程 and the last
// 回程; with none in the trip, the flights in src/data/trackedFlights.json.
//
// Taoyuan Airport's official flight board (synced into src/data/flightStatus.js
// every 15 minutes by .github/workflows/sync-teine-lift-status.yml) then fills
// in the Taoyuan side: terminal and scheduled time, and from the day before the
// flight its gate, counter, estimated time and status. Official data wins over
// the trip's notes. Each card can still be edited; an edit is kept on this
// device and applies while that flight (its number and date) stays in the trip.
const PLANNER_STORAGE_KEY = "yuki-tabi-planner-days-v2";
const EDIT_STORAGE_KEY = "yuki-tabi-flight-edits-v1";

const FLIGHT_WORD = /航班|班機|飛機|搭機|起飛|flight/iu;
// Two letters (or a letter and a digit) then 2-4 digits: BR132, JL 98, 7C1601.
const FLIGHT_NO = /\b((?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\s?\d{2,4})\b/u;
const TIME = /(\d{1,2})[:：](\d{2})/gu;
const TERMINAL = /(第\s*[一二三四1-4]\s*(?:航廈|航站|ターミナル)|T\s?[1-4]\b|Terminal\s?[1-4])/iu;
const AIRLINES = [
  [/長榮|EVA|\bBR/iu, "長榮航空"],
  [/華航|中華航空|China Airlines|\bCI/iu, "中華航空"],
  [/星宇|STARLUX|\bJX/iu, "星宇航空"],
  [/虎航|Tigerair|\bIT\d/iu, "台灣虎航"],
  [/樂桃|Peach|\bMM\d/iu, "樂桃航空"],
  [/捷星|Jetstar|\bGK\d/iu, "捷星日本"],
  [/日航|日本航空|JAL|\bJL\d/iu, "日本航空"],
  [/全日空|ANA|\bNH\d/iu, "全日空"],
  [/國泰|Cathay|\bCX\d/iu, "國泰航空"],
];
const KIND_LABELS = { outbound: "去程", return: "回程" };

const TAOYUAN = "台北桃園 TPE";
const AIRPORT_NAMES = {
  KIX: "大阪關西", NRT: "東京成田", HND: "東京羽田", CTS: "札幌新千歲", NGO: "名古屋中部",
  FUK: "福岡", OKA: "沖繩那霸", HKD: "函館", SDJ: "仙台", KOJ: "鹿兒島", TAK: "高松",
  OKJ: "岡山", HIJ: "廣島", KMJ: "熊本", FSZ: "靜岡", IBR: "茨城", AOJ: "青森", KMQ: "小松",
  TOY: "富山", UKB: "神戶", MYJ: "松山", KIJ: "新潟", ISG: "石垣", MMY: "宮古", AKJ: "旭川",
  NGS: "長崎", OIT: "大分",
};
const AIRLINE_BY_CODE = {
  BR: "長榮航空", CI: "中華航空", JX: "星宇航空", IT: "台灣虎航", MM: "樂桃航空",
  GK: "捷星日本", JL: "日本航空", NH: "全日空", CX: "國泰航空", AE: "華信航空",
};
const ZH_NUMBER = { 1: "一", 2: "二", 3: "三" };
// The Japanese end's terminal, where it is clear-cut.
const japanTerminal = (airport, code) => {
  const airline = code.slice(0, 2);
  if (airport === "KIX") return airline === "MM" ? "第二航廈" : "第一航廈";
  if (airport === "HND") return "第三航廈";
  if (airport === "NRT") {
    if (["BR", "NH"].includes(airline)) return "第一航廈";
    if (["CI", "JL", "CX", "JX"].includes(airline)) return "第二航廈";
    if (["MM", "GK"].includes(airline)) return "第三航廈";
    return "";
  }
  if (["CTS", "FUK", "OKA"].includes(airport)) return "國際線航廈";
  return "";
};
// Where to check a flight on its airline's own site.
const statusLink = (code) =>
  code.startsWith("BR")
    ? "https://booking.evaair.com/flyeva/eva/b2c/flight-status.aspx?lang=zh-tw"
    : code.startsWith("JX")
      ? "https://www.starlux-airlines.com/zh-TW/flight-status"
      : `https://www.google.com/search?q=${encodeURIComponent(`${code} 航班動態`)}`;

// The official Taoyuan board's word on this flight, laid over the card.
function withOfficial(flight) {
  const code = (flight.flightNo ?? "").toUpperCase().replace(/\s/gu, "");
  const schedule = flightSchedule[code];
  const live = flightLive[`${code}|${flight.date}`];
  if (!code || (!schedule && !live)) return { ...flight, code, official: null };
  const [way, terminal, time, airport] = live
    ? [live.way, live.terminal, live.time, live.airport]
    : schedule;
  const taoyuanTerminal = ZH_NUMBER[terminal] ? `第${ZH_NUMBER[terminal]}航廈` : "";
  const japan = AIRPORT_NAMES[airport] ? `${AIRPORT_NAMES[airport]} ${airport}` : airport;
  const japanSide = japanTerminal(airport, code);
  const official = { way, time, live };
  const airline = flight.airline || AIRLINE_BY_CODE[code.slice(0, 2)] || "";
  return way === "D"
    ? { ...flight, code, airline, official, from: TAOYUAN, fromTerminal: taoyuanTerminal, departTime: time,
        to: japan, toTerminal: japanSide || flight.toTerminal }
    : { ...flight, code, airline, official, to: TAOYUAN, toTerminal: taoyuanTerminal, arriveTime: time,
        from: japan, fromTerminal: japanSide || flight.fromTerminal };
}

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

// A stop's place: its located name, else the words before 「｜」 in its note.
const placeOf = (item) =>
  item?.location?.name || (item?.text ?? "").split(/[｜|\n]/u)[0].trim();

// Airport names read better short: 「桃園國際機場」→「桃園機場」.
const shortAirport = (name = "") => name.replace(/(?:國際|国際)(機場|空港)/u, "$1");

function flightsFromDays(days) {
  const flights = [];
  (Array.isArray(days) ? days : []).forEach((day) => {
    const items = day.items ?? [];
    items.forEach((item, index) => {
      const text = item.text ?? "";
      // 「JR 15分」 is a train, not a flight.
      const number = FLIGHT_NO.exec(text.replace(/JR\s?\d+/gu, ""))?.[1]?.replace(/\s/gu, "");
      if (!number && !FLIGHT_WORD.test(text)) return;
      const next = items.slice(index + 1).find((later) => placeOf(later));
      const times = [...text.matchAll(TIME)].map(([, h, m]) => `${h.padStart(2, "0")}:${m}`);
      const terminals = text.match(new RegExp(TERMINAL, "giu")) ?? [];
      flights.push({
        date: day.date ?? "",
        airline: AIRLINES.find(([pattern]) => pattern.test(text))?.[1] ?? "",
        flightNo: number ?? "",
        departTime: times[0] ?? "",
        arriveTime: times[1] ?? "",
        from: shortAirport(placeOf(item)),
        fromTerminal: terminals[0] ?? "",
        to: shortAirport(placeOf(next)),
        toTerminal: terminals[1] ?? (next ? TERMINAL.exec(next.text ?? "")?.[1] ?? "" : ""),
        note: /轉機|transfer/iu.test(text) ? "轉機" : "直飛",
      });
    });
  });
  if (!flights.length) {
    return TRACKED_FLIGHTS.map((tracked, index) => ({
      id: index ? "return" : "outbound",
      date: tracked.date,
      flightNo: tracked.flight,
      airline: "",
      departTime: "",
      arriveTime: "",
      from: "",
      fromTerminal: "",
      to: "",
      toTerminal: "",
      note: "直飛",
      ...tracked.card,
    }));
  }
  const outbound = { ...flights[0], id: "outbound" };
  if (flights.length === 1) return [outbound];
  return [outbound, { ...flights[flights.length - 1], id: "return" }];
}

// Hours ahead of UTC, guessed from the airport's name or code: Taiwan, Hong
// Kong and China are +8, Korea and Japan +9.
const utcOffset = (airport = "") =>
  /TPE|TSA|KHH|RMQ|桃園|松山|台|臺|高雄|HKG|香港|PVG|PEK|上海|北京/iu.test(airport) ? 8 : 9;

const toMinutes = (time) => {
  const [hours, minutes] = (time ?? "").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

const flightDuration = (flight) => {
  const depart = toMinutes(flight.departTime);
  const arrive = toMinutes(flight.arriveTime);
  if (depart === null || arrive === null) return "";
  let minutes = arrive - depart - (utcOffset(flight.to) - utcOffset(flight.from)) * 60;
  if (minutes <= 0) minutes += 24 * 60; // lands the next day
  const hours = Math.floor(minutes / 60);
  return `${hours ? `${hours}小時` : ""}${minutes % 60 ? `${minutes % 60}分` : ""}`;
};

const formatFlightDate = (dateString) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (!dateString || Number.isNaN(date.getTime())) return "日期未定";
  return `${dateString.replaceAll("-", "/")}（${"日一二三四五六"[date.getDay()]}）`;
};

const editKey = (flight) => `${flight.id}:${flight.flightNo}:${flight.date}`;

const FIELDS = [
  ["date", "日期", "date"],
  ["airline", "航空公司"],
  ["flightNo", "航班"],
  ["departTime", "起飛", "time"],
  ["arriveTime", "抵達", "time"],
  ["from", "出發機場"],
  ["fromTerminal", "出發航廈"],
  ["to", "抵達機場"],
  ["toTerminal", "抵達航廈"],
  ["note", "備註"],
];

// The line under a card: live status from the day before the flight, else
// the official timetable, and a link to the airline's own flight status.
function OfficialStatus({ flight }) {
  const { official, code } = flight;
  if (!official) return null;
  const live = official.live;
  const verb = official.way === "D" ? "起飛" : "抵達";
  const parts = live
    ? [
        live.status,
        live.estimatedTime && live.estimatedTime !== live.time ? `預計 ${live.estimatedTime} ${verb}` : "",
        live.counter && official.way === "D" ? `報到櫃檯 ${live.counter}` : "",
        live.gate ? `登機門 ${live.gate}` : "",
        live.belt && official.way === "A" ? `行李轉盤 ${live.belt}` : "",
      ]
    : [`桃園機場時刻表 ${official.time} ${verb}`, "前一天起顯示即時動態"];
  return (
    <p className={`flight-official ${live ? "is-live" : ""}`}>
      <span>{parts.filter(Boolean).join("・")}</span>
      <a href={statusLink(code)} target="_blank" rel="noreferrer">
        航空公司官網 ↗
      </a>
    </p>
  );
}

function FlightCard({ flight, onSave }) {
  const [draft, setDraft] = useState(null);
  const kind = flight.id;

  if (draft) {
    return (
      <form
        className={`flight-card is-${kind} is-editing`}
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
          setDraft(null);
        }}
      >
        <div className="flight-card-top">
          <span className="flight-kind">{KIND_LABELS[kind]}</span>
        </div>
        <div className="flight-form">
          {FIELDS.map(([key, label, type = "text"]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={draft[key] ?? ""}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <div className="flight-form-actions">
          <button type="button" className="is-quiet" onClick={() => setDraft(null)}>取消</button>
          <button type="submit">儲存</button>
        </div>
      </form>
    );
  }

  const duration = flightDuration(flight);
  return (
    <article className={`flight-card is-${kind}`}>
      <div className="flight-card-top">
        <span className="flight-kind">{KIND_LABELS[kind]}</span>
        <strong className="flight-no">{[flight.airline, flight.flightNo].filter(Boolean).join(" ") || "航班未填"}</strong>
        <span className="flight-date">{formatFlightDate(flight.date)}</span>
      </div>
      <div className="flight-route">
        <div className="flight-end">
          <strong>{flight.departTime || "--:--"}</strong>
          <b>{flight.from || "出發機場"}</b>
          {flight.fromTerminal && <small>{flight.fromTerminal}</small>}
        </div>
        <div className="flight-path">
          {duration && <span className="flight-duration">{duration}</span>}
          <span className="flight-line">
            <svg className="flight-plane" viewBox="0 0 64 40" aria-hidden="true">
              <path d="M6 20c0-5 4-8 10-8h26c8 0 16 4 16 8s-8 8-16 8H16c-6 0-10-3-10-8z" />
              <path d="M8 13 4 4h7l7 8" />
              <path d="M22 28l4 8h6l2-8" />
              <path d="M24 17h4M32 17h4M40 17h4" />
            </svg>
          </span>
          {flight.note && <span className="flight-note">{flight.note}</span>}
        </div>
        <div className="flight-end is-arrive">
          <strong>{flight.arriveTime || "--:--"}</strong>
          <b>{flight.to || "抵達機場"}</b>
          {flight.toTerminal && <small>{flight.toTerminal}</small>}
        </div>
      </div>
      <OfficialStatus flight={flight} />
      <button
        type="button"
        className="flight-edit"
        aria-label={`編輯${KIND_LABELS[kind]}航班`}
        onClick={() => setDraft(flight)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 1-4L16 5l3 3L9 18zM14 7l3 3" /></svg>
      </button>
    </article>
  );
}

function FlightCards() {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [days, setDays] = useState(() => readJson(PLANNER_STORAGE_KEY, []));
  const [edits, setEdits] = useState(() => readJson(EDIT_STORAGE_KEY, {}));

  // The synced trip, when there is one, so the flights follow 行程規劃 live.
  useEffect(() => {
    if (!cloudKey) return undefined;
    let cancelled = false;
    const apply = (cloud) => {
      if (!cancelled && Array.isArray(cloud?.days) && cloud.days.length) setDays(cloud.days);
    };
    loadPlannerCloud(cloudKey).then(apply).catch(() => {});
    const stop = subscribePlannerCloud(cloudKey, apply, () => {});
    return () => {
      cancelled = true;
      stop();
    };
  }, [cloudKey]);

  const flights = flightsFromDays(days).map((flight) =>
    withOfficial({ ...flight, ...edits[editKey(flight)], id: flight.id }),
  );

  const save = (original, updated) => {
    // Keep only what was typed, not the official data laid over it.
    const { official, code, ...typed } = updated;
    const next = { ...edits, [editKey(original)]: typed };
    setEdits(next);
    try {
      localStorage.setItem(EDIT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or blocked: keep the change for this visit
    }
  };

  if (!flights.length) {
    return (
      <div className="hotel-empty flight-empty">
        行程裡還沒有航班。在行程規劃的機場那一站寫上航班，例如「長榮 BR132 08:20 起飛 11:55 抵達」。
      </div>
    );
  }

  const base = flightsFromDays(days);
  return (
    <section className="flight-cards" aria-label="機票">
      {flights.map((flight, index) => (
        <FlightCard key={flight.id} flight={flight} onSave={(updated) => save(base[index], updated)} />
      ))}
    </section>
  );
}

export default FlightCards;
