import { useState } from "react";

// The outbound and return flights at the top of 機票住宿, kept on this device.
// Each card can be edited in place; the flight time is worked out from the
// local departure and arrival times and each airport's time zone.
const FLIGHT_STORAGE_KEY = "yuki-tabi-flights-v1";

const DEFAULT_FLIGHTS = [
  {
    id: "outbound",
    date: "2026-11-24",
    airline: "長榮航空",
    flightNo: "BR132",
    departTime: "08:20",
    arriveTime: "11:55",
    from: "台北桃園 TPE",
    fromTerminal: "第二航廈",
    to: "大阪關西 KIX",
    toTerminal: "第一航廈",
    note: "直飛不停",
  },
  {
    id: "return",
    date: "2026-11-29",
    airline: "長榮航空",
    flightNo: "BR131",
    departTime: "12:55",
    arriveTime: "15:05",
    from: "大阪關西 KIX",
    fromTerminal: "第一航廈",
    to: "台北桃園 TPE",
    toTerminal: "第二航廈",
    note: "直飛不停",
  },
];

const KIND_LABELS = { outbound: "去程", return: "回程" };

// Hours ahead of UTC, guessed from the airport's name or code: Taiwan, Hong
// Kong and China are +8, Korea and Japan +9.
const utcOffset = (airport = "") => {
  if (/TPE|TSA|KHH|RMQ|台|臺|HKG|香港|PVG|PEK|上海|北京/iu.test(airport)) return 8;
  return 9;
};

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
  const weekday = "日一二三四五六"[date.getDay()];
  return `${dateString.replaceAll("-", "/")} (${weekday})`;
};

function loadFlights() {
  try {
    const saved = JSON.parse(localStorage.getItem(FLIGHT_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // fall back to the defaults below
  }
  return DEFAULT_FLIGHTS;
}

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

function FlightCard({ flight, onSave }) {
  const [draft, setDraft] = useState(null);
  const kind = flight.id === "return" ? "return" : "outbound";

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
        <span className="flight-date">{formatFlightDate(flight.date)}</span>
        <span className="flight-no">{flight.airline} {flight.flightNo}</span>
      </div>
      <div className="flight-route">
        <div className="flight-end">
          <strong>{flight.departTime || "--:--"}</strong>
          <b>{flight.from}</b>
          <small>{flight.fromTerminal}</small>
        </div>
        <div className="flight-path">
          {duration && (
            <span className="flight-duration">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
              {duration}
            </span>
          )}
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
          <b>{flight.to}</b>
          <small>{flight.toTerminal}</small>
        </div>
      </div>
      <div className="flight-card-foot">
        <button type="button" onClick={() => setDraft(flight)}>編輯</button>
      </div>
    </article>
  );
}

function FlightCards() {
  const [flights, setFlights] = useState(loadFlights);
  const save = (updated) => {
    const next = flights.map((flight) => (flight.id === updated.id ? updated : flight));
    setFlights(next);
    try {
      localStorage.setItem(FLIGHT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage full or blocked: keep the change for this visit
    }
  };

  return (
    <section className="flight-cards" aria-label="機票">
      {flights.map((flight) => (
        <FlightCard key={flight.id} flight={flight} onSave={save} />
      ))}
    </section>
  );
}

export default FlightCards;
