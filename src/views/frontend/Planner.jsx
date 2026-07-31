import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✨ 補上路由跳轉 Hook
import { snowTowns } from "./Home";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import "../../assets/pages/_planner.scss";

const STORAGE_KEY = "yuki-tabi-planner-days-v2";
const LEGACY_STORAGE_KEY = "yuki-tabi-planner-items";
const GEOCODE_CACHE_KEY = "yuki-tabi-google-geocode-cache-v3";
const LODGING_STORAGE_KEY = "yuki-tabi-lodgings-v1";
const ACTIVE_DAY_STORAGE_KEY = "yuki-tabi-planner-active-day-v1";
const pendingGeocodes = new Map();
const LODGING_PLACE_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "hostel",
  "guest_house",
  "resort",
  "campground",
  "rv_park",
]);
const NON_LODGING_LOCATION_PATTERN = /滑雪場|滑雪场|スキー場|ski\s*(?:area|resort)/iu;
const CHECKOUT_PATTERN = /退房|退宿|チェック[\s-]*アウト|check[\s-]*out/iu;
const JARTIC_URL = "https://www.jartic.or.jp/";

const isLodgingLocation = (location) =>
  Boolean(
    location?.types?.some((type) => LODGING_PLACE_TYPES.has(type)) &&
      !NON_LODGING_LOCATION_PATTERN.test(location.name ?? ""),
  );

const isLodgingStay = (location, itineraryText = "") =>
  isLodgingLocation(location) && !CHECKOUT_PATTERN.test(itineraryText);

function saveLodging(location, day, stayItemId = "") {
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    const nextLodging = {
      id: location.id,
      name: location.name,
      displayName: location.displayName,
      website: location.website ?? "",
      stayDate: day?.date ?? "",
      stayDayLabel: day?.label ?? "",
      stayDayId: day?.id ?? "",
      stayItemId,
      updatedAt: Date.now(),
    };
    const nextLodgings = [
      nextLodging,
      ...lodgings.filter(
        (lodging) =>
          lodging.id !== location.id ||
          lodging.stayDayId !== nextLodging.stayDayId ||
          lodging.stayItemId !== nextLodging.stayItemId,
      ),
    ];
    localStorage.setItem(LODGING_STORAGE_KEY, JSON.stringify(nextLodgings));
    window.dispatchEvent(new CustomEvent("lodgings-changed"));
  } catch {
    // 無法使用 localStorage 時仍可完成定位。
  }
}

function updateLodgingStayDate(dayId, stayDate) {
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    const nextLodgings = lodgings.map((lodging) =>
      lodging.stayDayId === dayId ? { ...lodging, stayDate } : lodging,
    );
    localStorage.setItem(LODGING_STORAGE_KEY, JSON.stringify(nextLodgings));
    window.dispatchEvent(new CustomEvent("lodgings-changed"));
  } catch {
    // 無法使用 localStorage 時仍可完成行程日期更新。
  }
}

function removeLodging(locationId, dayId, stayItemId = "") {
  if (!locationId && !stayItemId) return;
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    const nextLodgings = lodgings.filter((lodging) => {
      const belongsToDeletedItem =
        Boolean(stayItemId) && lodging.stayItemId === stayItemId;
      const isLegacyLodgingForDay =
        Boolean(locationId) &&
        lodging.id === locationId &&
        lodging.stayDayId === dayId;
      return !belongsToDeletedItem && !isLegacyLodgingForDay;
    });
    localStorage.setItem(LODGING_STORAGE_KEY, JSON.stringify(nextLodgings));
    window.dispatchEvent(new CustomEvent("lodgings-changed"));
  } catch {
    // 無法使用 localStorage 時仍可完成行程項目刪除。
  }
}

function removeLodgingsForDay(dayId) {
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    const nextLodgings = lodgings.filter(
      (lodging) => lodging.stayDayId !== dayId,
    );
    localStorage.setItem(LODGING_STORAGE_KEY, JSON.stringify(nextLodgings));
    window.dispatchEvent(new CustomEvent("lodgings-changed"));
  } catch {
    // 無法使用 localStorage 時仍可完成行程天數刪除。
  }
}

const townAliases = {
  niseko: [
    "二世古",
    "二世谷",
    "新雪谷",
    "比羅夫",
    "希拉夫",
    "安努普利",
    "花園雪場",
    "藻岩雪場",
    "niseko",
    "hirafu",
    "annupuri",
    "hanazono",
    "moiwa",
  ],
  otaru: ["小樽", "天狗山", "朝里川", "歐恩茲", "昂澤", "otaru", "onze"],
  sapporo: [
    "札幌",
    "手稻",
    "手稲",
    "札幌國際",
    "札幌国際",
    "盤溪",
    "盤渓",
    "藻岩山",
    "富士雪場",
    "sapporo",
    "fu's",
  ],
  mashike: [
    "增毛",
    "増毛",
    "暑寒別岳",
    "暑函別岳",
    "暑寒別岳滑雪場",
    "暑函別岳滑雪場",
    "暑寒別岳スキー場",
    "shokanbetsudake",
    "mashike",
  ],
  asahikawa: [
    "旭川",
    "神居",
    "神威",
    "卡姆伊",
    "聖誕老人公園",
    "asahikawa",
    "kamui",
    "santa present",
  ],
  toma: ["當麻", "tohma", "toma"],
  higashikawa: ["東川", "卡摩爾", "higashikawa", "canmore", "旭岳"],
  kamikawa: ["上川", "kamikawa", "黑岳", "黒岳", "層雲峽"],
  furano: [
    "富良野",
    "furano",
    "ペンション ラベンダー",
    "ペンションラベンダー",
    "pension lavender",
    "lavender pension",
    "薰衣草旅館",
    "薰衣草民宿",
  ],
  hachimantai: [
    "八幡平",
    "安比高原",
    "八幡平全景",
    "八幡平下倉",
    "hachimantai",
    "appi",
    "panorama",
  ],
  shizukuishi: ["雫石", "網張溫泉", "岩手高原", "shizukuishi"],
  kitakami: ["北上", "夏油高原", "kitakami", "geto"],
  zao: ["藏王", "蔵王", "藏王溫泉", "藏王猿倉", "山形", "zao"],
  yuzawa: [
    "湯澤",
    "湯沢",
    "gala",
    "神樂",
    "神楽",
    "苗場",
    "岩原",
    "神立",
    "中里",
    "石打丸山",
    "yuzawa",
  ],
  myoko: [
    "妙高",
    "樂天新井",
    "新井",
    "赤倉",
    "池之平",
    "杉之原",
    "關溫泉",
    "関温泉",
    "arai",
    "myoko",
  ],
  hakuba: ["白馬", "八方尾根", "五龍", "五竜", "岩岳", "佐野坂", "hakuba"],
  nozawa: ["野澤溫泉", "野沢温泉", "野澤", "野沢", "nozawa"],
  yamanouchi: [
    "山之內",
    "山ノ内",
    "志賀高原",
    "奧志賀",
    "奥志賀",
    "燒額山",
    "焼額山",
    "一之瀨",
    "一の瀬",
    "高天原",
    "寺小屋",
    "東館山",
    "發哺溫泉",
    "横手山",
    "澀峠",
    "渋峠",
    "熊之湯",
    "丸池",
    "蓮池",
    "yamanouchi",
    "shiga kogen",
  ],
};

const namedPlaces = [
  {
    id: "tohma-mountain-ski-area",
    name: "當麻山滑雪場",
    latitude: 43.835491,
    longitude: 142.534556,
    displayName: "北海道上川郡當麻町市街6區 當麻山滑雪場（旭川近郊）",
    aliases: [
      "當麻山滑雪場",
      "當麻滑雪場",
      "当麻山スキー場",
      "とうま山スキー場",
      "Tomachoei Ski Area",
      "Tomachoei Ski Resort",
      "tohma mountain ski area",
      "toma mountain ski area",
    ],
  },
  {
    id: "furano-ski-resort",
    name: "富良野滑雪場",
    latitude: 43.33,
    longitude: 142.350278,
    displayName: "北海道富良野市中御料 富良野滑雪場",
    aliases: [
      "富良野滑雪場",
      "富良野スキー場",
      "furano ski resort",
      "furano ski area",
    ],
  },
  {
    id: "sapporo-moiwa-ski-area",
    name: "札幌藻岩山スキー場",
    latitude: 43.011551,
    longitude: 141.333075,
    displayName: "北海道札幌市南区藻岩下1991 札幌藻岩山スキー場",
    aliases: [
      "藻岩山滑雪場",
      "札幌藻岩山滑雪場",
      "札幌藻岩山スキー場",
      "藻岩山スキー場",
      "sapporo moiwa ski area",
    ],
  },
  {
    id: "pension-lavender",
    name: "ペンション ラベンダー",
    latitude: 43.34388,
    longitude: 142.36402,
    displayName: "北海道富良野市北の峰町16-21",
    types: ["lodging"],
    aliases: [
      "ペンション ラベンダー",
      "ペンションラベンダー",
      "pension lavender",
      "lavender pension",
      "薰衣草旅館",
      "薰衣草民宿",
    ],
  },
];

const initialItems = [
  { id: "sample-1", text: "札幌市｜抵達後領取雪具，入住市區飯店", done: false },
  {
    id: "sample-2",
    text: "小樽市｜上午前往天狗山滑雪，傍晚逛運河",
    done: false,
  },
  { id: "sample-3", text: "二世古町｜安排一整天滑雪與溫泉", done: false },
];

const chineseVariantMap = {
  国: "國",
  场: "場",
  温: "溫",
  泽: "澤",
  沢: "澤",
  观: "觀",
  観: "觀",
  乐: "樂",
  楽: "樂",
  龙: "龍",
  竜: "龍",
  马: "馬",
  关: "關",
  関: "關",
  烧: "燒",
  焼: "燒",
  额: "額",
  額: "額",
  发: "發",
  發: "發",
  横: "橫",
  峡: "峽",
  増: "增",
  稲: "稻",
  嵐: "嵐",
};

const normalizeText = (text) =>
  [...text.toLocaleLowerCase()]
    .map((character) => chineseVariantMap[character] ?? character)
    .join("")
    .replace(
      /滑雪度假村|滑雪渡假村|滑雪場|滑雪场|スキー場|スキーリゾート|ski resort|ski area|snow resort|snow park/g,
      "",
    )
    .replace(/[\s・·｜|,，。/／()（）_\-－]/g, "");

const toJapaneseSearchText = (text) =>
  text.replace(
    /[國溫澤觀樂關燒發橫增稻]/g,
    (character) =>
      ({
        國: "国",
        溫: "温",
        澤: "沢",
        觀: "観",
        樂: "楽",
        關: "関",
        燒: "焼",
        發: "発",
        橫: "横",
        增: "増",
        稻: "稲",
      })[character],
  );

const getGeocodeQueries = (text) => {
  const original = getLocationQuery(text);
  const withoutType = original
    .replace(
      /(?:滑雪度假村|滑雪渡假村|滑雪場|滑雪场|雪場|雪场|飯店|酒店|旅館|民宿)$/u,
      "",
    )
    .trim();
  return [
    ...new Set(
      [
        original,
        toJapaneseSearchText(original),
        withoutType,
        toJapaneseSearchText(withoutType),
      ].filter(Boolean),
    ),
  ];
};

function findTownForText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  return (
    snowTowns.find((town) => {
      const candidates = [
        town.name,
        town.kana,
        ...(town.resorts ?? []),
        ...(townAliases[town.id] ?? []),
      ];
      return candidates.some((candidate) =>
        normalized.includes(normalizeText(candidate)),
      );
    }) ?? null
  );
}

function findKnownLocationForText(text) {
  const normalized = normalizeText(getLocationQuery(text));
  if (!normalized) return null;
  return (
    namedPlaces.find((place) =>
      place.aliases.some((alias) => normalized === normalizeText(alias)),
    ) ?? findTownForText(text)
  );
}

function findNamedPlaceForText(text) {
  const normalized = normalizeText(getLocationQuery(text));
  if (!normalized) return null;
  return (
    namedPlaces.find((place) =>
      place.aliases.some((alias) => normalized === normalizeText(alias)),
    ) ?? null
  );
}

const getLocationQuery = (text) => text.split(/[｜|\n]/)[0].trim();

const getGeocodingErrorMessage = (error) =>
  ({
    "geocoding-request_denied":
      "Google 拒絕定位：請確認 API Key 的 API 限制已加入 Geocoding API，且網站限制包含目前網址。",
    "geocoding-over_query_limit":
      "Google 定位已超過配額或帳單額度，請到 Google Cloud Console 檢查用量。",
    "geocoding-invalid_request": "定位內容無效，請補上飯店或景點的完整名稱。",
    "missing-google-maps-api-key":
      "找不到 Google Maps API Key，請確認 .env.local 設定後已重啟網站。",
    "google-maps-load-failed":
      "Google Maps 載入失敗，請確認網路與 API Key 的網站限制。",
  })[error?.message] ?? "定位服務暫時無法使用，請稍後再試。";

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
  const task = (async () => {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();
    let result = null;
    let matchedQuery = query;
    for (const candidate of getGeocodeQueries(text)) {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { address: `${candidate}, 日本`, region: "JP" },
          (results, status) => {
            if (status === "OK") resolve(results?.[0] ?? null);
            else if (status === "ZERO_RESULTS") resolve(null);
            else reject(new Error(`geocoding-${status.toLowerCase()}`));
          },
        );
      });
      if (response) {
        result = response;
        matchedQuery = candidate;
        break;
      }
    }
    const placeInfo = result
      ? await findPlaceInfo(maps, matchedQuery, result.place_id)
      : { types: [], website: "" };
    const location = result
      ? {
          id: `google-${result.place_id}`,
          name: matchedQuery,
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
          displayName: result.formatted_address,
          query: matchedQuery,
          types: [...new Set([...(result.types ?? []), ...placeInfo.types])],
          website: placeInfo.website,
        }
      : null;
    try {
      const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)) ?? {};
      localStorage.setItem(
        GEOCODE_CACHE_KEY,
        JSON.stringify({ ...cache, [cacheKey]: location }),
      );
    } catch {
      // 無法使用 localStorage 時仍可完成本次定位。
    }
    return location;
  })();
  pendingGeocodes.set(cacheKey, task);
  task.then(
    () => pendingGeocodes.delete(cacheKey),
    () => pendingGeocodes.delete(cacheKey),
  );
  return task;
}

function makeItem(text = "") {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `plan-${Date.now()}-${Math.random()}`,
    text,
    done: false,
  };
}

function formatItineraryDate(dateString, weekdayOnly = false) {
  if (!dateString) return weekdayOnly ? "" : "尚未設定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return weekdayOnly ? "" : dateString;
  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(
    date,
  );
  if (weekdayOnly) return weekday;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日（${weekday}）`;
}

const toDateInputValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function PlannerDatePicker({ value, onChange, onDelete, canDelete }) {
  const rootRef = useRef(null);
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? new Date(),
  );

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const moveMonth = (offset) =>
    setVisibleMonth(new Date(year, month + offset, 1));
  const selectDate = (day) => {
    onChange(toDateInputValue(new Date(year, month, day)));
    setOpen(false);
  };
  const chooseToday = () => {
    const today = new Date();
    setVisibleMonth(today);
    onChange(toDateInputValue(today));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="planner-calendar">
      <button
        className="planner-calendar-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setVisibleMonth(selectedDate ?? new Date());
          setOpen((current) => !current);
        }}
      >
        <span>{value ? value.replaceAll("-", "/") : "選擇日期"}</span>
        <span className="planner-calendar-icon" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="planner-calendar-popover"
          role="dialog"
          aria-label="選擇日期"
        >
          <div className="planner-calendar-head">
            <strong>
              {year} 年 {month + 1} 月
            </strong>
            <div>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="上個月"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="下個月"
              >
                ↓
              </button>
            </div>
          </div>
          <div className="planner-calendar-weekdays" aria-hidden="true">
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="planner-calendar-days">
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  className={
                    value === toDateInputValue(new Date(year, month, day))
                      ? "is-selected"
                      : ""
                  }
                  type="button"
                  key={`${year}-${month}-${day}`}
                  onClick={() => selectDate(day)}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="planner-calendar-actions">
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
            >
              刪除行程
            </button>
            <button type="button" onClick={chooseToday}>
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const makeDay = (index, items = [makeItem()]) => ({
  id: `day-${index}`,
  label: `第 ${index} 天`,
  date: "",
  items,
});

function getInitialDays() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      Array.isArray(saved) &&
      saved.length &&
      saved.every((day) => Array.isArray(day.items))
    )
      return saved.map((day) => ({ ...day, date: day.date ?? "" }));
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    return [
      makeDay(
        1,
        Array.isArray(legacy) && legacy.length ? legacy : initialItems,
      ),
      makeDay(2),
      makeDay(3),
    ];
  } catch {
    return [makeDay(1, initialItems), makeDay(2), makeDay(3)];
  }
}

let googleMapsPromise;

function loadGoogleMaps() {
  if (globalThis.google?.maps) return Promise.resolve(globalThis.google.maps);
  if (googleMapsPromise) return googleMapsPromise;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("missing-google-maps-api-key"));

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&language=zh-TW&region=TW`;
    script.async = true;
    script.onerror = () => reject(new Error("google-maps-load-failed"));
    script.onload = () => resolve(globalThis.google.maps);
    document.head.append(script);
  });
  return googleMapsPromise;
}

function findPlaceInfo(maps, query, geocodePlaceId) {
  if (!maps.places?.PlacesService)
    return Promise.resolve({ types: [], website: "" });

  const service = new maps.places.PlacesService(document.createElement("div"));
  const getDetails = (placeId) =>
    new Promise((resolve) => {
      service.getDetails(
        { placeId, fields: ["types", "website"] },
        (place, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && place) {
            resolve({ types: place.types ?? [], website: place.website ?? "" });
            return;
          }
          resolve(null);
        },
      );
    });

  return getDetails(geocodePlaceId).then((placeInfo) => {
    if (placeInfo) return placeInfo;
    return new Promise((resolve) => {
      service.textSearch({ query: `${query}, 日本` }, async (results, status) => {
        if (status !== maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve({ types: [], website: "" });
          return;
        }
        const place =
          results.find((candidate) => candidate.place_id === geocodePlaceId) ??
          results[0];
        resolve(
          (await getDetails(place.place_id)) ?? {
            types: place.types ?? [],
            website: "",
          },
        );
      });
    });
  });
}

function getOverlappingMarkerOffsets(coordinates) {
  const groups = [];
  const overlapDistance = 0.001;

  coordinates.forEach((coordinate, index) => {
    const group = groups.find(({ center }) => {
      const latitudeScale = Math.cos((coordinate.lat * Math.PI) / 180);
      const latGap = coordinate.lat - center.lat;
      const lngGap = (coordinate.lng - center.lng) * latitudeScale;
      return Math.hypot(latGap, lngGap) < overlapDistance;
    });

    if (group) {
      group.items.push({ coordinate, index });
      const total = group.items.length;
      group.center = group.items.reduce(
        (center, item) => ({
          lat: center.lat + item.coordinate.lat / total,
          lng: center.lng + item.coordinate.lng / total,
        }),
        { lat: 0, lng: 0 },
      );
    } else {
      groups.push({ center: coordinate, items: [{ coordinate, index }] });
    }
  });

  const offsets = coordinates.map(() => ({ x: 0, y: 0 }));
  groups.forEach(({ items }) => {
    if (items.length < 2) return;
    const radius = 24;
    items.forEach(({ index }, itemIndex) => {
      if (itemIndex === 0) return;
      const angle = (Math.PI * 2 * (itemIndex - 1)) / (items.length - 1);
      offsets[index] = {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
      };
    });
  });

  return offsets;
}

function GoogleRouteMap({ stops }) {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);
  const infoWindowRef = useRef(null);
  const stopsRef = useRef(stops);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const stopsKey = stops
    .map(({ item, town }) =>
      [item.id, town.id, town.latitude, town.longitude, town.name].join(":"),
    )
    .join("|");

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        mapRef.current = new maps.Map(canvasRef.current, {
          center: { lat: 38.2, lng: 137.7 },
          zoom: 5,
          minZoom: 3,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
        });
        infoWindowRef.current = new maps.InfoWindow();
        setMapReady(true);
        setLoadError("");
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      routeRef.current?.setMap(null);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = globalThis.google?.maps;
    if (!map || !maps) return;
    const currentStops = stopsRef.current;
    const coordinates = currentStops.map(({ town }) => ({
      lat: town.latitude,
      lng: town.longitude,
    }));
    const markerOffsets = getOverlappingMarkerOffsets(coordinates);
    const markerIcon =
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path fill="#e53935" d="M16 0C7.2 0 0 7.2 0 16c0 11.8 16 26 16 26s16-14.2 16-26C32 7.2 24.8 0 16 0z"/><circle cx="16" cy="16" r="12" fill="#e53935"/></svg>');

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = currentStops.map((stop, index) => {
      const offset = markerOffsets[index];
      const marker = new maps.Marker({
        map,
        position: coordinates[index],
        icon: {
          url: markerIcon,
          size: new maps.Size(32, 42),
          anchor: new maps.Point(16 - offset.x, 42 - offset.y),
          labelOrigin: new maps.Point(16, 16),
        },
        label: { text: String(index + 1), color: "#ffffff", fontWeight: "800" },
        title: `第 ${index + 1} 站：${stop.town.name}`,
        zIndex: index + 1,
      });
      marker.addListener("click", () => {
        const content = document.createElement("div");
        const stopNumber = document.createElement("strong");
        const stopName = document.createElement("span");
        content.className = "planner-google-popup";
        stopNumber.textContent = `STOP ${String(index + 1).padStart(2, "0")}`;
        stopName.textContent = stop.town.name;
        content.append(stopNumber, stopName);
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      return marker;
    });

    routeRef.current?.setMap(null);
    routeRef.current = new maps.Polyline({
      map,
      path: coordinates,
      strokeColor: "#8b5a3c",
      strokeOpacity: 0.95,
      strokeWeight: 5,
      geodesic: true,
    });

    if (!coordinates.length) {
      map.setCenter({ lat: 38.2, lng: 137.7 });
      map.setZoom(5);
    } else if (coordinates.length === 1) {
      map.setCenter(coordinates[0]);
      map.setZoom(13);
    } else {
      const bounds = new maps.LatLngBounds();
      coordinates.forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds, 72);
    }
  }, [stopsKey, mapReady]);

  if (loadError)
    return (
      <div className="planner-google-status">
        <strong>Google 地圖尚未啟用</strong>
        <span>請在 .env 設定 VITE_GOOGLE_MAPS_API_KEY 後重新啟動網站。</span>
      </div>
    );
  return (
    <div
      ref={canvasRef}
      className="planner-google-map"
      aria-label="日本雪旅行程 Google 地圖"
    />
  );
}

const routePoint = (location) => ({
  lat: location.latitude,
  lng: location.longitude,
});

function requestDirections(maps, request) {
  const service = new maps.DirectionsService();
  return new Promise((resolve, reject) => {
    service.route(request, (result, status) => {
      if (status === maps.DirectionsStatus.OK && result) resolve(result);
      else reject(new Error(`directions-${String(status).toLowerCase()}`));
    });
  });
}

function getTransitDepartureTime(dateString) {
  const departure = dateString
    ? new Date(`${dateString}T08:00:00`)
    : new Date();
  const minimum = new Date(Date.now() + 5 * 60 * 1000);
  return departure > minimum ? departure : minimum;
}

function collectTransitLines(steps = []) {
  return [
    ...new Set(
      steps.flatMap((step) => {
        const details = step.transit;
        if (!details) return [];
        const line =
          details.line?.short_name ??
          details.line?.name ??
          details.line?.agencies?.[0]?.name;
        const vehicle = details.line?.vehicle?.name;
        return [line ?? vehicle].filter(Boolean);
      }),
    ),
  ];
}

function summarizeTransitRoute(route, index) {
  const leg = route.legs?.[0];
  if (!leg) return null;
  return {
    id: `${index}-${leg.departure_time?.value?.getTime?.() ?? leg.duration?.value ?? 0}`,
    departure: leg.departure_time?.text ?? "依現場時刻",
    arrival: leg.arrival_time?.text ?? "",
    duration: leg.duration?.text ?? "",
    lines: collectTransitLines(leg.steps),
  };
}

function estimateRoadTrip(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const straightDistance =
    earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadDistance = Math.max(straightDistance * 1.28, 1);
  const minutes = Math.max(Math.round((roadDistance / 52) * 60 + 8), 5);
  return {
    distance: `約 ${Math.round(roadDistance)} 公里`,
    duration:
      minutes >= 60
        ? `約 ${Math.floor(minutes / 60)} 小時 ${minutes % 60 || ""} 分鐘`.replace("  分鐘", "")
        : `約 ${minutes} 分鐘`,
  };
}

function makeGoogleDirectionsUrl(from, to, travelMode) {
  const parameters = new URLSearchParams({
    api: "1",
    origin: `${from.latitude},${from.longitude}`,
    destination: `${to.latitude},${to.longitude}`,
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${parameters}`;
}

function TravelSegment({ segment, from, to }) {
  const fromName = from.name;
  const toName = to.name;
  const estimate = estimateRoadTrip(from, to);
  const drivingUrl = makeGoogleDirectionsUrl(from, to, "driving");
  const transitUrl = makeGoogleDirectionsUrl(from, to, "transit");
  return (
    <li className="planner-travel-segment" aria-label={`${fromName}到${toName}的交通資訊`}>
      <div className="planner-travel-line" aria-hidden="true">
        <span />
        <i>↓</i>
      </div>
      <div className="planner-travel-content">
        <p>
          <b>{fromName}</b>
          <span>前往</span>
          <b>{toName}</b>
        </p>
        {segment?.status === "loading" && (
          <small className="planner-travel-message">正在查詢交通時間…</small>
        )}
        {segment?.status === "error" && (
          <div className="planner-travel-fallback">
            <section className="planner-driving-option">
              <span aria-hidden="true">🚗</span>
              <div>
                <strong>開車 {estimate.duration}</strong>
                <small>{estimate.distance}・依兩點距離推算</small>
              </div>
            </section>
            <div className="planner-route-links">
              <a href={drivingUrl} target="_blank" rel="noreferrer">查看開車路線 ↗</a>
              <a href={transitUrl} target="_blank" rel="noreferrer">查看大眾運輸班次 ↗</a>
            </div>
          </div>
        )}
        {segment?.status === "ready" && (
          <div className="planner-travel-options">
            <section className="planner-driving-option">
              <span aria-hidden="true">🚗</span>
              <div>
                <strong>開車約 {segment.driving?.duration ?? "無資料"}</strong>
                {segment.driving?.distance && <small>{segment.driving.distance}</small>}
              </div>
            </section>
            <section className="planner-transit-option">
              <span aria-hidden="true">🚆</span>
              <div>
                <strong>公共交通班次</strong>
                {segment.transit.length ? (
                  <ul>
                    {segment.transit.map((route) => (
                      <li key={route.id}>
                        <time>{route.departure}</time>
                        <span>→ {route.arrival || "抵達時間依班次"}</span>
                        <em>{route.duration}</em>
                        {route.lines.length > 0 && (
                          <small>{route.lines.join("・")}</small>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <small>此區間查無可用的大眾運輸路線</small>
                    <a className="planner-transit-link" href={transitUrl} target="_blank" rel="noreferrer">
                      到 Google Maps 查看其他班次 ↗
                    </a>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
        <div className="planner-road-links">
            <a
              className="is-jartic"
              href={JARTIC_URL}
              target="_blank"
              rel="noreferrer"
              title="手機會由 JARTIC 自動顯示行動版"
            >
              JARTIC 即時交通 ↗
            </a>
        </div>
      </div>
    </li>
  );
}

function RoadConditionSummary({ stops }) {
  if (!stops.length) return null;

  return (
    <section className="planner-road-summary" aria-labelledby="planner-road-summary-title">
      <div className="planner-road-summary-icon" aria-hidden="true">雪</div>
      <div>
        <p>MLIT ROAD CONDITIONS</p>
        <h3 id="planner-road-summary-title">沿途道路即時資訊</h3>
        <small>手機開啟時會自動顯示 JARTIC 手機版即時交通資訊</small>
      </div>
      <div className="planner-road-summary-actions">
        <a
          className="is-jartic"
          href={JARTIC_URL}
          target="_blank"
          rel="noreferrer"
          title="手機會由 JARTIC 自動顯示行動版"
        >
          <span>●</span>
          JARTIC 即時交通
          <i>↗</i>
        </a>
      </div>
    </section>
  );
}

function Planner() {
  const navigate = useNavigate(); // ✨ 補上宣告 navigate
  const [days, setDays] = useState(getInitialDays);
  const [activeDayId, setActiveDayId] = useState(
    () => {
      const initialDays = getInitialDays();
      const savedActiveDayId = localStorage.getItem(ACTIVE_DAY_STORAGE_KEY);
      return initialDays.some((day) => day.id === savedActiveDayId)
        ? savedActiveDayId
        : initialDays[0]?.id ?? "day-1";
    },
  );
  const dayBoardRef = useRef(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [locating, setLocating] = useState({});
  const [locationErrors, setLocationErrors] = useState({});
  const [travelSegments, setTravelSegments] = useState({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, activeDayId);
  }, [activeDayId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const board = dayBoardRef.current;
      const activeSheet = [...(board?.children ?? [])].find(
        (sheet) => sheet.dataset.dayId === activeDayId,
      );
      if (!board || !activeSheet) return;
      board.scrollTo({
        left: activeSheet.offsetLeft,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDayId]);

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const items = activeDay.items;
  const setItems = (updater) =>
    setDays((current) =>
      current.map((day) => {
        if (day.id !== activeDayId) return day;
        return {
          ...day,
          items: typeof updater === "function" ? updater(day.items) : updater,
        };
      }),
    );
  const updateDay = (dayId, patch) => {
    if (Object.hasOwn(patch, "date")) updateLodgingStayDate(dayId, patch.date);
    setDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    );
  };

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
    const nextActive =
      nextDays[Math.min(Math.max(activeIndex - 1, 0), nextDays.length - 1)];
    removeLodgingsForDay(activeDayId);
    setDays(nextDays);
    setActiveDayId(nextActive.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const plannedStops = useMemo(
    () =>
      items
        .map((item, index) => {
          const town =
            findNamedPlaceForText(item.text) ??
            item.location ??
            findKnownLocationForText(item.text);
          return town ? { item, town, order: index + 1 } : null;
        })
        .filter(Boolean),
    [items],
  );

  const travelPairs = useMemo(
    () =>
      items.slice(0, -1).flatMap((item, index) => {
        const nextItem = items[index + 1];
        const from =
          findNamedPlaceForText(item.text) ??
          item.location ??
          findKnownLocationForText(item.text);
        const to =
          findNamedPlaceForText(nextItem.text) ??
          nextItem.location ??
          findKnownLocationForText(nextItem.text);
        if (!from || !to) return [];
        return [{
          id: `${item.id}--${nextItem.id}`,
          fromItemId: item.id,
          from,
          to,
        }];
      }),
    [items],
  );
  const travelPairsRef = useRef(travelPairs);
  const travelPairsKey = travelPairs
    .map((pair) =>
      [
        pair.fromItemId,
        pair.from.id,
        pair.from.latitude,
        pair.from.longitude,
        pair.to.id,
        pair.to.latitude,
        pair.to.longitude,
      ].join(":"),
    )
    .join("|");

  useEffect(() => {
    travelPairsRef.current = travelPairs;
  }, [travelPairs]);

  useEffect(() => {
    let cancelled = false;
    const currentTravelPairs = travelPairsRef.current;
    if (!currentTravelPairs.length) {
      setTravelSegments({});
      return undefined;
    }

    setTravelSegments(
      Object.fromEntries(
        currentTravelPairs.map((pair) => [pair.fromItemId, { status: "loading" }]),
      ),
    );

    loadGoogleMaps()
      .then(async (maps) => {
        const departureTime = getTransitDepartureTime(activeDay.date);
        const results = await Promise.all(
          currentTravelPairs.map(async (pair) => {
            const baseRequest = {
              origin: routePoint(pair.from),
              destination: routePoint(pair.to),
            };
            try {
              const [drivingResult, transitResult] = await Promise.all([
                requestDirections(maps, {
                  ...baseRequest,
                  travelMode: maps.TravelMode.DRIVING,
                }),
                requestDirections(maps, {
                  ...baseRequest,
                  travelMode: maps.TravelMode.TRANSIT,
                  provideRouteAlternatives: true,
                  transitOptions: { departureTime },
                }).catch(() => null),
              ]);
              const drivingLeg = drivingResult.routes?.[0]?.legs?.[0];
              return [
                pair.fromItemId,
                {
                  status: "ready",
                  driving: drivingLeg
                    ? {
                        duration: drivingLeg.duration?.text,
                        distance: drivingLeg.distance?.text,
                      }
                    : null,
                  transit: (transitResult?.routes ?? [])
                    .slice(0, 3)
                    .map(summarizeTransitRoute)
                    .filter(Boolean),
                },
              ];
            } catch {
              return [pair.fromItemId, { status: "error" }];
            }
          }),
        );
        if (!cancelled) setTravelSegments(Object.fromEntries(results));
      })
      .catch(() => {
        if (cancelled) return;
        setTravelSegments(
          Object.fromEntries(
            currentTravelPairs.map((pair) => [
              pair.fromItemId,
              { status: "error" },
            ]),
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [travelPairsKey, activeDay.date]);

  const updateItem = (id, patch) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateItemText = (id, text) => {
    setLocationErrors((current) => ({ ...current, [id]: "" }));
    if (CHECKOUT_PATTERN.test(text)) {
      const currentItem = items.find((item) => item.id === id);
      removeLodging(currentItem?.location?.id, activeDayId, id);
    }
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
    );
  };
  const locateItem = async (item) => {
    if (!item.text.trim() || locating[item.id]) return;
    const namedPlace = findNamedPlaceForText(item.text);
    if (namedPlace) {
      if (isLodgingStay(namedPlace, item.text)) {
        saveLodging(namedPlace, activeDay, item.id);
      } else if (CHECKOUT_PATTERN.test(item.text)) {
        removeLodging(namedPlace.id, activeDayId, item.id);
      }
      setLocationErrors((current) => ({ ...current, [item.id]: "" }));
      setDays((current) =>
        current.map((day) => ({
          ...day,
          items: day.items.map((candidate) =>
            candidate.id === item.id
              ? { ...candidate, location: namedPlace }
              : candidate,
          ),
        })),
      );
      return;
    }
    setLocating((current) => ({ ...current, [item.id]: true }));
    setLocationErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const location = await geocodeJapanesePlace(item.text);
      if (!location) {
        const fallbackTown = findTownForText(item.text);
        if (fallbackTown) {
          setDays((current) =>
            current.map((day) => ({
              ...day,
              items: day.items.map((candidate) =>
                candidate.id === item.id
                  ? { ...candidate, location: fallbackTown }
                  : candidate,
              ),
            })),
          );
          return;
        }
        setLocationErrors((current) => ({
          ...current,
          [item.id]: "找不到地點，請補上都道府縣或日文名稱",
        }));
        return;
      }
      if (isLodgingStay(location, item.text)) {
        saveLodging(location, activeDay, item.id);
      } else if (CHECKOUT_PATTERN.test(item.text)) {
        removeLodging(location.id, activeDayId, item.id);
      }
      setDays((current) =>
        current.map((day) => ({
          ...day,
          items: day.items.map((candidate) =>
            candidate.id === item.id ? { ...candidate, location } : candidate,
          ),
        })),
      );
    } catch (error) {
      setLocationErrors((current) => ({
        ...current,
        [item.id]: getGeocodingErrorMessage(error),
      }));
    } finally {
      setLocating((current) => ({ ...current, [item.id]: false }));
    }
  };
  const removeItem = (id) => {
    const item = items.find((candidate) => candidate.id === id);
    const lodgingLocation = item?.location ?? findNamedPlaceForText(item?.text ?? "");
    // 即使地點後來被重新判定為非住宿，也要清除先前已收錄的住宿資料。
    removeLodging(lodgingLocation?.id, activeDayId, item.id);
    setItems((current) => current.filter((item) => item.id !== id));
  };
  const addItem = (text = "") =>
    setItems((current) => [...current, makeItem(text)]);

  const moveItem = (id, direction) =>
    setItems((current) => {
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
      <div className="planner-doodle planner-doodle--mountain">
        <HandDrawnMotif type="yotei" />
      </div>
      <div className="planner-doodle planner-doodle--ropeway">
        <HandDrawnMotif type="kamikawaRopeway" />
      </div>
      <div className="planner-doodle planner-doodle--penguin">
        <HandDrawnMotif type="penguin" />
      </div>
      <div className="planner-doodle planner-doodle--snow-monster">
        <HandDrawnMotif type="juhyo" />
      </div>
      <div className="planner-doodle planner-doodle--skier">
        <HandDrawnMotif type="skier" />
      </div>
      <div className="planner-doodle planner-doodle--onsen">
        <HandDrawnMotif type="onsen" />
      </div>
      <div className="planner-doodle planner-doodle--bear">
        <HandDrawnMotif type="bear" />
      </div>
      <header className="planner-heading">
        <div>
          <p>
            <span>JAPAN</span> TRIP PLANNER
          </p>
          <h1>
            我的<em>雪旅手帳</em>
          </h1>
        </div>
      </header>
      <section className="planner-workspace">
        <div className="planner-map-card">
          <div className="planner-card-title">
            <div>
              <span>ROUTE MAP</span>
              <h2>日本雪旅路線</h2>
            </div>
            <strong>{plannedStops.length} 個停靠點</strong>
          </div>
          <div className="planner-map-stage has-google-map">
            <GoogleRouteMap stops={plannedStops} />
          </div>
          <p className="planner-map-hint">
            <span>↗</span> 地圖路線會跟著目前選取的日期與行程順序即時更新。
          </p>
        </div>

        <aside className="planner-list-card">
          <div className="planner-card-title">
            <div>
              <span>MY ITINERARY</span>
              <h2>{days.length} 天行程表</h2>
            </div>
          </div>
          <nav className="planner-day-picker" aria-label="選擇行程天數">
            {days.map((day, dayIndex) => {
              const active = day.id === activeDayId;
              return (
                <button
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-pressed={active}
                  key={day.id}
                  onClick={() => setActiveDayId(day.id)}
                >
                  DAY {dayIndex + 1} 
                </button>
              );
            })}
            <div
              className="planner-day-inline-actions"
              role="group"
              aria-label="調整行程天數"
            >
              <button
                type="button"
                onClick={removeActiveDay}
                disabled={days.length <= 1}
                aria-label="刪除目前這一天"
              >
                −
              </button>
              <button type="button" onClick={addDay} aria-label="增加一天">
                ＋
              </button>
            </div>
          </nav>
          <div
            ref={dayBoardRef}
            className="planner-day-board"
            role="tablist"
            aria-label="三天行程表"
          >
            {days.map((day, dayIndex) => {
              const active = day.id === activeDayId;
              return (
                <section
                  data-day-id={day.id}
                  className={`planner-day-sheet planner-day-sheet--${(dayIndex % 3) + 1} ${active ? "is-active" : "is-muted"}`}
                  key={day.id}
                  role="tabpanel"
                  aria-label={`第 ${dayIndex + 1} 天`}
                  onClick={() => !active && setActiveDayId(day.id)}
                >
                  <button
                    className="planner-day-select"
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setActiveDayId(day.id);
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                  >
                    <span>DAY {String(dayIndex + 1).padStart(2)}</span>
                  </button>
                  <div className="planner-date-field">
                    {active ? (
                      <div className="planner-date-input">
                        <PlannerDatePicker
                          value={day.date}
                          onChange={(date) => updateDay(day.id, { date })}
                          onDelete={removeActiveDay}
                          canDelete={days.length > 1}
                        />
                        {day.date && (
                          <em>{formatItineraryDate(day.date, true)}</em>
                        )}
                      </div>
                    ) : (
                      <b>{formatItineraryDate(day.date)}</b>
                    )}
                  </div>
                  {active ? (
                    <>
                      <ol className="planner-list">
                        {items.map((item, index) => {
                          const resolvedLocation =
                            findNamedPlaceForText(item.text) ??
                            item.location ??
                            findKnownLocationForText(item.text);
                          const nextItem = items[index + 1];
                          const nextLocation = nextItem
                            ? findNamedPlaceForText(nextItem.text) ??
                              nextItem.location ??
                              findKnownLocationForText(nextItem.text)
                            : null;
                          return (
                            <Fragment key={item.id}>
                            <li
                              className={`${item.done ? "is-done" : ""} ${dragOverId === item.id ? "is-drag-over" : ""}`}
                              onDragEnd={() => {
                                setDraggedId(null);
                                setDragOverId(null);
                              }}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDragOverId(item.id);
                              }}
                              onDrop={() => dropItem(item.id)}
                            >
                              <button
                                className="planner-drag-handle"
                                type="button"
                                draggable
                                onDragStart={() => setDraggedId(item.id)}
                                aria-label="拖曳調整順序"
                                title="拖曳調整順序"
                              >
                                ⠿
                              </button>
                              <label className="planner-check">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  onChange={(event) =>
                                    updateItem(item.id, {
                                      done: event.target.checked,
                                    })
                                  }
                                />
                                <span aria-hidden="true">✓</span>
                              </label>
                              <div className="planner-item-copy">
                                <div className="planner-item-meta">
                                  <b>
                                    STOP {String(index + 1).padStart(2, "0")}
                                  </b>
                                  {resolvedLocation ? (
                                    <>
                                      <span title={item.location?.displayName}>
                                        已定位 · {resolvedLocation.name}
                                      </span>
                                      <div className="planner-meta-actions-group">
                                        <button
                                          className="planner-locate"
                                          type="button"
                                          disabled={locating[item.id]}
                                          onClick={() => locateItem(item)}
                                        >
                                          {locating[item.id] ? (
                                            "定位中…"
                                          ) : (
                                            <>
                                              <span className="planner-locate-icon" aria-hidden="true">⌖</span>
                                              重新定位
                                            </>
                                          )}
                                        </button>

                                        {/* ✨ 修正後的飯店官網按鈕區塊 */}
                                        {isLodgingStay(resolvedLocation, item.text) && (
                                          <button
                                            className="planner-locate planner-hotel-intro-btn"
                                            type="button"
                                            onClick={() => {
                                              navigate(
                                                `/hotel?lodging=${encodeURIComponent(resolvedLocation.id)}`,
                                              );
                                            }}
                                          >
                                            <svg className="planner-hotel-intro-icon" viewBox="0 0 24 24" aria-hidden="true">
                                              <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M8 10h.01M16 10h.01" />
                                            </svg>
                                            查看住宿
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      className="planner-locate"
                                      type="button"
                                      disabled={
                                        !item.text.trim() || locating[item.id]
                                      }
                                      onClick={() => locateItem(item)}
                                    >
                                      {locating[item.id] ? (
                                        "定位中…"
                                      ) : (
                                        <>
                                          <span className="planner-locate-icon" aria-hidden="true">⌖</span>
                                          定位
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                                <textarea
                                  rows="2"
                                  value={item.text}
                                  placeholder="輸入行程"
                                  onChange={(event) =>
                                    updateItemText(item.id, event.target.value)
                                  }
                                  onBlur={() => {
                                    if (!item.location && item.text.trim())
                                      locateItem(item);
                                  }}
                                />
                                {locationErrors[item.id] && (
                                  <small className="planner-location-error">
                                    {locationErrors[item.id]}
                                  </small>
                                )}
                              </div>
                              <div className="planner-item-actions">
                                <button
                                  type="button"
                                  onClick={() => moveItem(item.id, -1)}
                                  disabled={index === 0}
                                  aria-label="向上移動"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveItem(item.id, 1)}
                                  disabled={index === items.length - 1}
                                  aria-label="向下移動"
                                >
                                  ↓
                                </button>
                                <button
                                  className="is-delete"
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  aria-label="刪除待辦"
                                >
                                  ×
                                </button>
                              </div>
                            </li>
                            {resolvedLocation && nextLocation && (
                              <TravelSegment
                                key={`travel-${item.id}-${nextItem.id}`}
                                segment={travelSegments[item.id]}
                                from={resolvedLocation}
                                to={nextLocation}
                              />
                            )}
                            </Fragment>
                          );
                        })}
                      </ol>
                      <button
                        className="planner-add"
                        type="button"
                        onClick={() => addItem()}
                      >
                        <span>＋</span> 新增當日行程
                      </button>
                    </>
                  ) : (
                    <div className="planner-day-preview">
                      {day.items.slice(0, 1).map((item) => (
                        <div key={item.id}>
                          <span>{item.done ? "✓" : ""}</span>
                          <p>{item.text || "點選後輸入行程"}</p>
                          <i>⠿</i>
                        </div>
                      ))}
                    </div>
                  )}
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
