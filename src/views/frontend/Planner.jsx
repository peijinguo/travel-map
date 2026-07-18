import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { snowTowns } from "./Home";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import "../../assets/pages/_planner.scss";

const STORAGE_KEY = "yuki-tabi-planner-days-v2";
const LEGACY_STORAGE_KEY = "yuki-tabi-planner-items";
const GEOCODE_CACHE_KEY = "yuki-tabi-nominatim-cache-v3";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;
const pendingGeocodes = new Map();

const townAliases = {
  niseko: ["二世古", "二世谷", "新雪谷", "比羅夫", "希拉夫", "安努普利", "花園雪場", "藻岩雪場", "niseko", "hirafu", "annupuri", "hanazono", "moiwa"],
  otaru: ["小樽", "天狗山", "朝里川", "歐恩茲", "昂澤", "otaru", "onze"],
  sapporo: ["札幌", "手稻", "手稲", "札幌國際", "札幌国際", "盤溪", "盤渓", "藻岩山", "富士雪場", "sapporo", "fu's"],
  mashike: ["增毛", "増毛", "暑寒別岳", "暑函別岳", "暑寒別岳滑雪場", "暑函別岳滑雪場", "暑寒別岳スキー場", "shokanbetsudake", "mashike"],
  asahikawa: ["旭川", "神居", "神威", "卡姆伊", "聖誕老人公園", "asahikawa", "kamui", "santa present"],
  toma: ["當麻", "tohma", "toma"],
  higashikawa: ["東川", "卡摩爾", "higashikawa", "canmore", "旭岳"],
  kamikawa: ["上川", "kamikawa", "黑岳", "黒岳", "層雲峽"],
  furano: [
    "富良野", "furano",
    "ペンション ラベンダー", "ペンションラベンダー",
    "pension lavender", "lavender pension", "薰衣草旅館", "薰衣草民宿",
  ],
  hachimantai: ["八幡平", "安比高原", "八幡平全景", "八幡平下倉", "hachimantai", "appi", "panorama"],
  shizukuishi: ["雫石", "網張溫泉", "岩手高原", "shizukuishi"],
  kitakami: ["北上", "夏油高原", "kitakami", "geto"],
  zao: ["藏王", "蔵王", "藏王溫泉", "藏王猿倉", "山形", "zao"],
  yuzawa: ["湯澤", "湯沢", "gala", "神樂", "神楽", "苗場", "岩原", "神立", "中里", "石打丸山", "yuzawa"],
  myoko: ["妙高", "樂天新井", "新井", "赤倉", "池之平", "杉之原", "關溫泉", "関温泉", "arai", "myoko"],
  hakuba: ["白馬", "八方尾根", "五龍", "五竜", "岩岳", "佐野坂", "hakuba"],
  nozawa: ["野澤溫泉", "野沢温泉", "野澤", "野沢", "nozawa"],
  yamanouchi: ["山之內", "山ノ内", "志賀高原", "奧志賀", "奥志賀", "燒額山", "焼額山", "一之瀨", "一の瀬", "高天原", "寺小屋", "東館山", "發哺溫泉", "横手山", "澀峠", "渋峠", "熊之湯", "丸池", "蓮池", "yamanouchi", "shiga kogen"],
};

const namedPlaces = [
  {
    id: "furano-ski-resort",
    name: "富良野滑雪場",
    latitude: 43.33,
    longitude: 142.350278,
    displayName: "北海道富良野市中御料 富良野滑雪場",
    aliases: ["富良野滑雪場", "富良野スキー場", "furano ski resort", "furano ski area"],
  },
  {
    id: "pension-lavender",
    name: "ペンション ラベンダー",
    latitude: 43.34388,
    longitude: 142.36402,
    displayName: "北海道富良野市北の峰町16-21",
    aliases: ["ペンション ラベンダー", "ペンションラベンダー", "pension lavender", "lavender pension", "薰衣草旅館", "薰衣草民宿"],
  },
];

const initialItems = [
  { id: "sample-1", text: "札幌市｜抵達後領取雪具，入住市區飯店", done: false },
  { id: "sample-2", text: "小樽市｜上午前往天狗山滑雪，傍晚逛運河", done: false },
  { id: "sample-3", text: "二世古町｜安排一整天滑雪與溫泉", done: false },
];

const chineseVariantMap = {
  国: "國", 场: "場", 温: "溫", 泽: "澤", 沢: "澤", 观: "觀", 観: "觀", 乐: "樂", 楽: "樂",
  龙: "龍", 竜: "龍", 马: "馬", 关: "關", 関: "關", 烧: "燒", 焼: "燒", 额: "額", 額: "額",
  发: "發", 発: "發", 横: "橫", 峡: "峽", 増: "增", 稲: "稻", 嵐: "嵐",
};

const normalizeText = (text) => [...text.toLocaleLowerCase()]
  .map((character) => chineseVariantMap[character] ?? character)
  .join("")
  .replace(/滑雪度假村|滑雪渡假村|滑雪場|滑雪场|スキー場|スキーリゾート|ski resort|ski area|snow resort|snow park/g, "")
  .replace(/[\s・·｜|,，。/／()（）_\-－]/g, "");

const toJapaneseSearchText = (text) => text.replace(/[國溫澤觀樂關燒發橫增稻]/g, (character) => ({
  國: "国", 溫: "温", 澤: "沢", 觀: "観", 樂: "楽", 關: "関", 燒: "焼", 發: "発", 橫: "横", 增: "増", 稻: "稲",
})[character]);

const getGeocodeQueries = (text) => {
  const original = getLocationQuery(text);
  const withoutType = original.replace(/(?:滑雪度假村|滑雪渡假村|滑雪場|滑雪场|雪場|雪场|飯店|酒店|旅館|民宿)$/u, "").trim();
  return [...new Set([original, toJapaneseSearchText(original), withoutType, toJapaneseSearchText(withoutType)].filter(Boolean))];
};

function findTownForText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  return snowTowns.find((town) => {
    const candidates = [town.name, town.kana, ...(town.resorts ?? []), ...(townAliases[town.id] ?? [])];
    return candidates.some((candidate) => normalized.includes(normalizeText(candidate)));
  }) ?? null;
}

function findKnownLocationForText(text) {
  const normalized = normalizeText(getLocationQuery(text));
  if (!normalized) return null;
  return namedPlaces.find((place) => place.aliases.some((alias) => normalized === normalizeText(alias)))
    ?? findTownForText(text);
}

function findNamedPlaceForText(text) {
  const normalized = normalizeText(getLocationQuery(text));
  if (!normalized) return null;
  return namedPlaces.find((place) => place.aliases.some((alias) => normalized === normalizeText(alias))) ?? null;
}

const getLocationQuery = (text) => text.split(/[｜|\n]/)[0].trim();

function geocodeJapanesePlace(text) {
  const query = getLocationQuery(text);
  if (!query) return Promise.resolve(null);
  const cacheKey = query.toLocaleLowerCase();
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)) ?? {};
    if (Object.hasOwn(cache, cacheKey)) return Promise.resolve(cache[cacheKey]);
  } catch {
    // 快取損壞時直接重新查詢。
  }
  if (pendingGeocodes.has(cacheKey)) return pendingGeocodes.get(cacheKey);
  const task = async () => {
    let result;
    let matchedQuery = query;
    for (const candidate of getGeocodeQueries(text)) {
      const wait = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastNominatimRequestAt = Date.now();
      const params = new URLSearchParams({
        q: `${candidate}, 日本`,
        format: "jsonv2",
        countrycodes: "jp",
        addressdetails: "1",
        namedetails: "1",
        "accept-language": "zh-TW,ja,en",
        limit: "1",
      });
      const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`);
      if (!response.ok) throw new Error("geocoding-failed");
      [result] = await response.json();
      if (result) {
        matchedQuery = candidate;
        break;
      }
    }
    const location = result ? {
      id: `osm-${result.osm_type}-${result.osm_id}`,
      name: result.namedetails?.["name:zh-Hant"] || result.namedetails?.["name:zh"] || result.name || result.display_name.split(",")[0] || query,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      displayName: result.display_name,
      query: matchedQuery,
    } : null;
    try {
      const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)) ?? {};
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify({ ...cache, [cacheKey]: location }));
    } catch {
      // 無法使用 localStorage 時仍可完成本次定位。
    }
    return location;
  };
  const queued = nominatimQueue.then(task, task);
  nominatimQueue = queued.catch(() => undefined);
  pendingGeocodes.set(cacheKey, queued);
  queued.then(() => pendingGeocodes.delete(cacheKey), () => pendingGeocodes.delete(cacheKey));
  return queued;
}

function makeItem(text = "") {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now()}-${Math.random()}`,
    text,
    done: false,
  };
}

function formatItineraryDate(dateString, weekdayOnly = false) {
  if (!dateString) return weekdayOnly ? "" : "尚未設定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return weekdayOnly ? "" : dateString;
  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(date);
  if (weekdayOnly) return weekday;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日（${weekday}）`;
}

const toDateInputValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const makeDay = (index, items = [makeItem()]) => ({
  id: `day-${index}`,
  label: `第 ${index} 天`,
  date: "",
  items,
});

function getInitialDays() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length && saved.every((day) => Array.isArray(day.items))) return saved.map((day) => ({ ...day, date: day.date ?? "" }));
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    return [makeDay(1, Array.isArray(legacy) && legacy.length ? legacy : initialItems), makeDay(2), makeDay(3)];
  } catch {
    return [makeDay(1, initialItems), makeDay(2), makeDay(3)];
  }
}

function MapLibreRouteMap({ stops }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const map = new maplibregl.Map({
      container: canvasRef.current,
      center: [137.7, 38.2],
      zoom: 4.7,
      minZoom: 3,
      maxZoom: 17,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", () => {
      map.addSource("itinerary", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: "itinerary-halo",
        type: "line",
        source: "itinerary",
        paint: { "line-color": "#fff8ec", "line-width": 9, "line-opacity": 0.88 },
      });
      map.addLayer({
        id: "itinerary-line",
        type: "line",
        source: "itinerary",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#8b5a3c",
          "line-width": 5,
          "line-opacity": 0.95,
          "line-dasharray": [1.25, 1.45],
        },
      });
      setMapReady(true);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const coordinates = stops.map(({ town }) => [town.longitude, town.latitude]);
    map.getSource("itinerary")?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coordinates.length > 1 ? coordinates : [] },
    });

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stops.map((stop, index) => {
      const markerElement = document.createElement("button");
      markerElement.className = "planner-map-marker";
      markerElement.type = "button";
      const markerNumber = document.createElement("span");
      markerNumber.textContent = String(index + 1);
      markerElement.append(markerNumber);
      markerElement.setAttribute("aria-label", `第 ${index + 1} 站：${stop.town.name}`);
      const popupContent = document.createElement("div");
      const popupStop = document.createElement("strong");
      const popupName = document.createElement("span");
      popupStop.textContent = `STOP ${String(index + 1).padStart(2, "0")}`;
      popupName.textContent = stop.town.name;
      popupContent.append(popupStop, popupName);
      const popup = new maplibregl.Popup({ offset: 22, closeButton: false }).setDOMContent(popupContent);
      return new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
        .setLngLat(coordinates[index])
        .setPopup(popup)
        .addTo(map);
    });

    if (!coordinates.length) {
      map.easeTo({ center: [137.7, 38.2], zoom: 4.7, duration: 700 });
    } else if (coordinates.length === 1) {
      map.easeTo({ center: coordinates[0], zoom: 12.5, duration: 700 });
    } else {
      const bounds = coordinates.reduce((result, coordinate) => result.extend(coordinate), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
      map.fitBounds(bounds, { padding: 72, maxZoom: 9, duration: 700 });
    }
  }, [stops, mapReady]);

  return <div className="planner-maplibre"><div ref={canvasRef} className="planner-maplibre-canvas" /></div>;
}

function Planner() {
  const [days, setDays] = useState(getInitialDays);
  const [activeDayId, setActiveDayId] = useState("day-1");
  const dayBoardRef = useRef(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [locating, setLocating] = useState({});
  const [locationErrors, setLocationErrors] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const board = dayBoardRef.current;
      const activeSheet = [...(board?.children ?? [])].find((sheet) => sheet.dataset.dayId === activeDayId);
      if (!board || !activeSheet) return;
      board.scrollTo({
        left: activeSheet.offsetLeft,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDayId]);

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const items = activeDay.items;
  const setItems = (updater) => setDays((current) => current.map((day) => {
    if (day.id !== activeDayId) return day;
    return { ...day, items: typeof updater === "function" ? updater(day.items) : updater };
  }));
  const updateDay = (dayId, patch) => setDays((current) => current.map((day) => day.id === dayId ? { ...day, ...patch } : day));

  const addDay = () => {
    const previousDate = days.at(-1)?.date;
    const date = previousDate ? new Date(`${previousDate}T00:00:00`) : null;
    if (date && !Number.isNaN(date.getTime())) date.setDate(date.getDate() + 1);
    const nextDay = {
      ...makeDay(days.length + 1),
      id: `day-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: date ? toDateInputValue(date) : "",
    };
    setDays((current) => [...current, nextDay]);
    setActiveDayId(nextDay.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const removeActiveDay = () => {
    if (days.length <= 1) return;
    const activeIndex = days.findIndex((day) => day.id === activeDayId);
    const nextDays = days.filter((day) => day.id !== activeDayId);
    const nextActive = nextDays[Math.min(Math.max(activeIndex - 1, 0), nextDays.length - 1)];
    setDays(nextDays);
    setActiveDayId(nextActive.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const plannedStops = useMemo(() => items.map((item, index) => {
    const town = item.location ?? findKnownLocationForText(item.text);
    return town ? { item, town, order: index + 1 } : null;
  }).filter(Boolean), [items]);

  const updateItem = (id, patch) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateItemText = (id, text) => {
    setLocationErrors((current) => ({ ...current, [id]: "" }));
    setItems((current) => current.map((item) => item.id === id ? { ...item, text, location: undefined } : item));
  };
  const locateItem = async (item) => {
    if (!item.text.trim() || locating[item.id]) return;
    const namedPlace = findNamedPlaceForText(item.text);
    if (namedPlace) {
      setLocationErrors((current) => ({ ...current, [item.id]: "" }));
      setDays((current) => current.map((day) => ({
        ...day,
        items: day.items.map((candidate) => candidate.id === item.id ? { ...candidate, location: namedPlace } : candidate),
      })));
      return;
    }
    setLocating((current) => ({ ...current, [item.id]: true }));
    setLocationErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const location = await geocodeJapanesePlace(item.text);
      if (!location) {
        const fallbackTown = findTownForText(item.text);
        if (fallbackTown) {
          setDays((current) => current.map((day) => ({
            ...day,
            items: day.items.map((candidate) => candidate.id === item.id ? { ...candidate, location: fallbackTown } : candidate),
          })));
          return;
        }
        setLocationErrors((current) => ({ ...current, [item.id]: "找不到地點，請補上都道府縣或日文名稱" }));
        return;
      }
      setDays((current) => current.map((day) => ({
        ...day,
        items: day.items.map((candidate) => candidate.id === item.id ? { ...candidate, location } : candidate),
      })));
    } catch {
      setLocationErrors((current) => ({ ...current, [item.id]: "定位服務暫時無法使用，請稍後再試" }));
    } finally {
      setLocating((current) => ({ ...current, [item.id]: false }));
    }
  };
  const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id));
  const addItem = (text = "") => setItems((current) => [...current, makeItem(text)]);

  const moveItem = (id, direction) => setItems((current) => {
    const from = current.findIndex((item) => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.length) return current;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });

  const dropItem = (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === draggedId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="planner-page">
      <div className="planner-doodle planner-doodle--mountain"><HandDrawnMotif type="yotei" /></div>
      <div className="planner-doodle planner-doodle--ropeway"><HandDrawnMotif type="kamikawaRopeway" /></div>
      <header className="planner-heading">
        <div>
          <p><span>JAPAN</span> TRIP PLANNER</p>
          <h1>我的<em>雪旅手帳</em></h1>
        </div>
      </header>
      <section className="planner-workspace">
        <div className="planner-map-card">
          <div className="planner-card-title">
            <div><span>ROUTE MAP</span><h2>日本雪旅路線</h2></div>
            <strong>{plannedStops.length} 個停靠點</strong>
          </div>
          <div className="planner-map-stage has-maplibre-map">
            <MapLibreRouteMap key="route-map-clean-v1" stops={plannedStops} />
          </div>
          <p className="planner-map-hint"><span>↗</span> 地圖路線會跟著目前選取的日期與行程順序即時更新。</p>
        </div>

        <aside className="planner-list-card">
          <div className="planner-card-title">
            <div><span>MY ITINERARY</span><h2>{days.length} 天行程表</h2></div>
            <div className="planner-day-count" aria-label="調整行程天數">
              <button type="button" onClick={removeActiveDay} disabled={days.length <= 1} aria-label="刪除目前這一天">−</button>
              <strong>{days.length} DAYS</strong>
              <button type="button" onClick={addDay} aria-label="增加一天">＋</button>
            </div>
          </div>
          <div ref={dayBoardRef} className="planner-day-board" role="tablist" aria-label="三天行程表">
            {days.map((day, dayIndex) => {
              const active = day.id === activeDayId;
              return (
                <section data-day-id={day.id} className={`planner-day-sheet planner-day-sheet--${dayIndex % 3 + 1} ${active ? "is-active" : "is-muted"}`} key={day.id} role="tabpanel" aria-label={`第 ${dayIndex + 1} 天`} onClick={() => !active && setActiveDayId(day.id)}>
                  <button className="planner-day-select" type="button" role="tab" aria-selected={active} onClick={() => { setActiveDayId(day.id); setDraggedId(null); setDragOverId(null); }}>
                    <span>DAY {String(dayIndex + 1).padStart(2, "0")}</span>
                  </button>
                  <label className="planner-date-field">
                    {active ? <div className="planner-date-input"><input type="date" value={day.date} onChange={(event) => updateDay(day.id, { date: event.target.value })} />{day.date && <em>{formatItineraryDate(day.date, true)}</em>}</div> : <b>{formatItineraryDate(day.date)}</b>}
                  </label>
                  <div className="planner-sheet-heading"><span>行程安排</span><i aria-hidden="true">⌁</i></div>
                  {active ? <>
                    <ol className="planner-list">
                      {items.map((item, index) => {
                        const resolvedLocation = item.location ?? findKnownLocationForText(item.text);
                        return (
                          <li className={`${item.done ? "is-done" : ""} ${dragOverId === item.id ? "is-drag-over" : ""}`} key={item.id} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }} onDragOver={(event) => { event.preventDefault(); setDragOverId(item.id); }} onDrop={() => dropItem(item.id)}>
                            <button className="planner-drag-handle" type="button" draggable onDragStart={() => setDraggedId(item.id)} aria-label="拖曳調整順序" title="拖曳調整順序">⠿</button>
                            <label className="planner-check"><input type="checkbox" checked={item.done} onChange={(event) => updateItem(item.id, { done: event.target.checked })} /><span aria-hidden="true">✓</span></label>
                            <div className="planner-item-copy">
                              <div className="planner-item-meta">
                                <b>STOP {String(index + 1).padStart(2, "0")}</b>
                                {resolvedLocation
                                  ? <span title={item.location?.displayName}>已定位 · {resolvedLocation.name}</span>
                                  : <button className="planner-locate" type="button" disabled={!item.text.trim() || locating[item.id]} onClick={() => locateItem(item)}>{locating[item.id] ? "定位中…" : "⌖ 定位"}</button>}
                              </div>
                              <textarea
                                rows="2"
                                value={item.text}
                                placeholder="例如：美唄市｜午餐；新宿王子大飯店｜入住"
                                onChange={(event) => updateItemText(item.id, event.target.value)}
                                onBlur={() => {
                                  const hasPlaceDetail = /[｜|;；、\n]/u.test(item.text) || item.text.trim().split(/\s+/u).length > 1;
                                  if (!item.location && item.text.trim() && (!resolvedLocation || hasPlaceDetail)) locateItem(item);
                                }}
                              />
                              {locationErrors[item.id] && <small className="planner-location-error">{locationErrors[item.id]}</small>}
                            </div>
                            <div className="planner-item-actions"><button type="button" onClick={() => moveItem(item.id, -1)} disabled={index === 0} aria-label="向上移動">↑</button><button type="button" onClick={() => moveItem(item.id, 1)} disabled={index === items.length - 1} aria-label="向下移動">↓</button><button className="is-delete" type="button" onClick={() => removeItem(item.id)} aria-label="刪除待辦">×</button></div>
                          </li>
                        );
                      })}
                    </ol>
                    <button className="planner-add" type="button" onClick={() => addItem()}><span>＋</span> 新增當日行程</button>
                  </> : <div className="planner-day-preview">{day.items.slice(0, 1).map((item) => <div key={item.id}><span>{item.done ? "✓" : ""}</span><p>{item.text || "點選後輸入行程"}</p><i>⠿</i></div>)}</div>}
                </section>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}

export default Planner;
