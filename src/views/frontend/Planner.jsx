import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { snowTowns } from "./Home";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import RouteMap from "../../component/RouteMap";
import walkingStepsIcon from "../../assets/walking-steps-icon.png?inline";
import { useAuth } from "../../context/AuthContext";
import {
  listBackupsCloud,
  loadPlannerCloud,
  replaceMenusCloud,
  reportUnlocatedPlace,
  subscribeUnlocatedPlaces,
  saveDailyBackupCloud,
  saveMenuCloud,
  savePlannerCloud,
  subscribeMenusCloud,
  subscribePlannerCloud,
} from "../../services/firebase";
import {
  findCoordinatesInText,
  isLodgingName,
  requestRoute,
  requestTransitTime,
  searchJapanPlace,
} from "../../services/freeMaps";
import "../../assets/pages/_planner.scss";

const STORAGE_KEY = "yuki-tabi-planner-days-v2";
const LEGACY_STORAGE_KEY = "yuki-tabi-planner-items";
const GEOCODE_CACHE_KEY = "yuki-tabi-google-geocode-cache-v4";
const PENDING_LOOKUPS_KEY = "travel-map-pending-lookups";
const withoutKey = (object, key) => {
  if (!(key in object)) return object;
  const copy = { ...object };
  delete copy[key];
  return copy;
};
const LODGING_STORAGE_KEY = "yuki-tabi-lodgings-v1";
const ACTIVE_DAY_STORAGE_KEY = "yuki-tabi-planner-active-day-v1";
const DRAFT_STORAGE_KEY = "yuki-tabi-planner-drafts-v1";
// 記住本機行程屬於哪個同步空間；在其他頁面切換同步碼後，行程頁才知道要換資料。
const PLANNER_SPACE_STORAGE_KEY = "yuki-tabi-planner-space-v1";
const pendingGeocodes = new Map();

function loadItemDrafts() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)) ?? {};
    return new Map(Object.entries(saved));
  } catch {
    return new Map();
  }
}

function persistItemDrafts(drafts) {
  localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(drafts)),
  );
}
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
const FOOD_PLACE_TYPES = new Set([
  "restaurant",
  "cafe",
  "food",
  "bakery",
  "bar",
  "meal_takeaway",
  "meal_delivery",
]);

const NON_LODGING_LOCATION_PATTERN = /滑雪場|滑雪场|スキー場|ski\s*(?:area|resort)/iu;
const CHECKOUT_PATTERN = /退房|退宿|チェック[\s-]*アウト|check[\s-]*out/iu;
const JARTIC_URL = "https://www.jartic.or.jp/";

// Stops located before untyped hotel-named places were marked as lodging
// (see getPlaceTypes in freeMaps) are recognized by their name too.
const isLodgingLocation = (location) =>
  Boolean(
    (location?.types?.some((type) => LODGING_PLACE_TYPES.has(type)) ||
      (location && !location.types?.length && isLodgingName(location.name))) &&
      !NON_LODGING_LOCATION_PATTERN.test(location.name ?? ""),
  );

const isLodgingStay = (location, itineraryText = "") =>
  isLodgingLocation(location) && !CHECKOUT_PATTERN.test(itineraryText);

const isFoodLocation = (location) =>
  !isLodgingLocation(location) &&
  Boolean(location?.types?.some((type) => FOOD_PLACE_TYPES.has(type)));

const SKI_AREA_PATTERN = /滑雪場|滑雪场|スキー場|スノーパーク|ski\s*(?:area|resort)|snow\s*(?:resort|park)/iu;

const fullTextOf = (noteText, placeName) => `${noteText} ${placeName}`;
const headlineOf = (noteText, placeName) => `${noteText.split("\n")[0]} ${placeName}`;

const getItineraryMotif = (location, itineraryText = "") => {
  const noteText = String(itineraryText);
  const placeName = String(location?.name ?? "");
  // A ski area run by a resort hotel (e.g. グリーンピア大沼) is tagged as
  // lodging by Google, so check the stop's own name before the lodging test.
  // Ski areas served by a T-bar or rope tow, such as 臼尻スキー場, get the towed skier.
  if (/臼尻|usujiri/iu.test(headlineOf(noteText, placeName)) ||
    (SKI_AREA_PATTERN.test(fullTextOf(noteText, placeName)) && /t[\s-]*bar|Tバー|ロープトウ|rope\s*tow|拖牽|拖拉/iu.test(noteText))) return "skiTow";
  if (SKI_AREA_PATTERN.test(`${noteText.split(/\r?\n/)[0]} ${placeName}`)) return "chairlift";
  // Car rentals, including ones named after the airport they serve.
  if (/レンタカー|rent[\s-]*a?[\s-]*car|car\s*rental|租車/iu.test(headlineOf(noteText, placeName))) return "rental";
  if (isLodgingLocation(location)) return "hotel";
  // Only the stop's own name, so a note like 「之後去機場」 does not count.
  if (location?.types?.some((type) => type === "airport" || type === "aerodrome") ||
    (/機場|机场|空港|airport/iu.test(headlineOf(noteText, placeName)) &&
      // Gas stations, car rentals and shops named after the airport are not the airport.
      !/(?:^|[^a-z])SS(?:[^a-z]|$)|ENEOS|ガソリン|gas\s*station|加油站|レンタカー|rent[\s-]*a?[\s-]*car|car\s*rental|租車|営業所|營業所|ホテル|hotel/iu.test(
        headlineOf(noteText, placeName),
      ))) return "airport";
  if (/ENEOS|加油|ガソリン|gas\s*station|(?:^|[^a-z])SS(?:[^a-z]|$)|出光|apollostation|コスモ石油|cosmo\s*oil|エッソ|\besso\b|shell/iu.test(headlineOf(noteText, placeName))) return "fuel";
  const placeCuisine = String(location?.cuisine ?? "");
  const placeText = `${noteText} ${placeName}`;
  if (/family\s*mart|ファミリーマート|ファミマ/iu.test(placeText)) return "familymart";
  if (/7\s*[-‐‑–—]?\s*eleven|seven\s*eleven|セブン[\s-]*イレブン|セブンイレブン/iu.test(placeText)) return "seveneleven";
  if (SKI_AREA_PATTERN.test(`${noteText} ${placeName}`)) return "chairlift";
  const headline = `${noteText.split(/\r?\n/)[0]} ${placeName}`;
  // Store-specific signature dishes that the generic keywords cannot infer.
  // Match only the stop's own name (first line), so a note mentioning another
  // restaurant, e.g. a sushi fallback, does not override the store's icon.
  if (/沼の家|numa\s*no\s*ya/iu.test(placeName)) return "numanoyaDango";
  if (/サク男ともち子|saku\s*o\s*to\s*mochiko/iu.test(headline)) return "crepe";
  if (/吉田商店|yoshida\s*shoten|湯咖哩|湯咖喱|汤咖喱|スープカレー|soup\s*curry/iu.test(headline)) return "curry";
  // Roadside stations (道の駅), before parking so 「道の駅 … 駐車場」 keeps this icon.
  if (/道の駅|道之驛|道之驿|公路休息站|michi[\s-]*no[\s-]*eki|road(?:side)?\s*station/iu.test(headline)) return "michiNoEki";
  // After the shop rules, so 「駐車場(…吉田商店)」 keeps its shop's icon.
  if (/駐車場|停車場|パーキング|parking/iu.test(headline)) return "parking";
  // Parks, after parking so 「大沼公園 南駐車場」 stays a car park; shops named
  // after a park (「五稜郭公園前店」, 「大沼公園インター店」) keep their own icon.
  if (/公園|公园|(?:^|[^a-z])park(?:[^a-z]|$)/iu.test(headline) &&
    !/公園前|公園インター|公園駅|公園站|公園通|interchange|店/iu.test(headline)) return "park";
  if (/ハセガワストア|hasegawa\s*store|長谷川商店|长谷川商店|やきとり弁当|燒鳥便當|烤雞肉串便當|烤肉串便當|yakitori\s*bento/iu.test(headline)) return "yakitoriBento";
  // Japanese stores commonly write sushi as 「寿し」; recognize it even when
  // the Google place category has not been returned yet.
  if (/壽司|寿司|寿し|すし|鮨|鮓|sushi|海鮮丼/iu.test(`${noteText} ${placeName}`)) return "sushi";
  if (/天婦羅|天ぷら|天丼|tempura/iu.test(`${noteText} ${placeName}`)) return "tempura";
  const foodPlace = isFoodLocation(location);
  // An onsen stop that the map only knows as the 温泉 area, not as a hotel.
  if (!foodPlace && location && /温泉|溫泉|onsen/iu.test(`${noteText.split(/\r?\n/)[0]} ${placeName}`)) return "onsen";
  if (!foodPlace) return null;
  // Read the complete note first, then the primary place name. Do not use the
  // formatted Google address because nearby category words can cause false matches.
  const classifyFood = (text) => {
    if (/居酒屋|酒場|ビール|生ビール|beer|izakaya/iu.test(text)) return "beer";
    if (/烤羊|羊肉|羊排|成吉思汗|ジンギスカン|ラム(?:肉|焼|ステーキ)?|lamb|mutton/iu.test(text)) return "lamb";
    if (/牛排|牛肉|和牛|燒肉|烧肉|焼肉|ステーキ|steak|beef|wagyu|yakiniku|hamburg/iu.test(text)) return "steak";
    if (/壽司|寿司|寿し|すし|鮨|鮓|sushi|海鮮丼/iu.test(text)) return "sushi";
    if (/天婦羅|天ぷら|天丼|tempura/iu.test(text)) return "tempura";
    if (/咖哩|咖喱|カレー|curry/iu.test(text)) return "curry";
    if (/糰子|团子|団子|dango|和菓子|麻糬|mochi|もち/iu.test(text)) return "dango";
    if (/聖代|圣代|芭菲|parfait|パフェ|冰淇淋|霜淇淋|アイスクリーム|ソフトクリーム|soft\s*cream/iu.test(text)) return "parfait";
    if (/可麗餅|可丽饼|クレープ|cr[eê]pe/iu.test(text)) return "crepe";
    if (/拉麵|拉面|ラーメン|ramen/iu.test(text)) return "ramen";
    if (/烏龍|乌冬|うどん|蕎麥|荞麦|そば|麵|面|noodle/iu.test(text)) return "ramen";
    return null;
  };
  const noteMotif = classifyFood(noteText);
  if (noteMotif) return noteMotif;
  const nameMotif = classifyFood(`${placeName} ${placeCuisine}`);
  if (nameMotif) return nameMotif;
  return "ramen";
};

const FOOD_MOTIFS = new Set([
  "numanoyaDango",
  "crepe",
  "yakitoriBento",
  "sushi",
  "tempura",
  "beer",
  "lamb",
  "steak",
  "curry",
  "dango",
  "parfait",
  "ramen",
]);

const getItineraryMotifLabel = (motif) =>
  ({
    onsen: "泡湯",
    hotel: "住宿",
    rental: "租車",
    airport: "機場",
    fuel: "加油站",
    parking: "停車場",
    michiNoEki: "道の駅",
    curry: "咖哩",
    familymart: "FamilyMart",
    seveneleven: "7-Eleven",
    lamb: "烤羊肉",
    beer: "居酒屋",
    crepe: "可麗餅",
    ramen: "拉麵",
    dango: "糰子",
    numanoyaDango: "沼の家糰子",
    yakitoriBento: "烤雞肉串便當",
    chairlift: "滑雪場",
    park: "公園",
    skiTow: "滑雪場",
  })[motif] ?? "吃的";

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
    id: "taiwan-taoyuan-international-airport",
    name: "桃園國際機場",
    latitude: 25.0796514,
    longitude: 121.234217,
    displayName: "桃園市大園區航站南路9號 桃園國際機場",
    types: ["airport"],
    aliases: [
      "桃園國際機場",
      "台灣桃園國際機場",
      "臺灣桃園國際機場",
      "桃園機場",
      "Taoyuan International Airport",
      "Taiwan Taoyuan International Airport",
      "TPE Airport",
      "TPE",
    ],
  },
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
  {
    id: "lumber-house-onuma",
    name: "Lumber House ランバーハウス",
    // 函館近郊的大沼地區（行政區為七飯町）。固定使用此地點，避免
    // 同名店家被 Google 的文字搜尋誤判到其他城市。
    latitude: 42.009,
    longitude: 140.67,
    displayName: "北海道亀田郡七飯町字軍川19-32（函館・大沼）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "大沼牛 ステーキ steak",
    aliases: [
      "Lumber House",
      "Lumber House ランバーハウス",
      "ランバーハウス",
      "ランバー ハウス",
      "ランバーハウス 函館",
      "ランバーハウス 大沼",
    ],
  },
  {
    id: "livemax-resort-hakodate-shikabe",
    name: "リブマックスリゾート函館 鹿部温泉",
    // 免費搜尋找不到這家飯店，又會因名稱中的「函館」退回函館市中心。
    // 座標取自 OSM 上同地址的舊名「鹿部ロイヤルホテル」。
    latitude: 42.07222,
    longitude: 140.77195,
    displayName: "北海道茅部郡鹿部町字本別530-127",
    types: ["lodging"],
    aliases: [
      "リブマックスリゾート函館 鹿部温泉",
      "リブマックス 鹿部温泉",
      "リブマックス鹿部",
      "鹿部ロイヤルホテル",
      "Livemax Resort Hakodate",
      "Livemax Resort Hakodate Shikabe",
    ],
  },
  {
    id: "livemax-resort-hakodate-greenpia-onuma",
    name: "リブマックスリゾート函館 グリーンピア大沼",
    // 免費搜尋時而找到園區、時而找到園內露營場，失敗時還會退回函館市中心；
    // 固定使用 OSM 上的飯店主建築。
    latitude: 42.0009,
    longitude: 140.60208,
    displayName: "北海道茅部郡森町赤井川229（大沼）",
    types: ["lodging"],
    aliases: [
      "リブマックスリゾート函館 グリーンピア大沼",
      "Greenpia Onuma リブマックスリゾート函館 グリーンピア大沼",
      "リブマックス グリーンピア大沼",
      "グリーンピア大沼",
      "Greenpia Onuma",
      "Greenpia大沼",
      "Livemax Resort Hakodate Greenpia Onuma",
    ],
  },
  {
    id: "greenpia-onuma-ski-area",
    name: "グリーンピア大沼スキー場",
    // 與同名飯店相鄰；只有寫明滑雪場的行程會用到這裡（見 findNamedPlaceForText）。
    // 座標取自滑雪場的 Mapcode 490 282 893*64。
    latitude: 42.002323,
    longitude: 140.602963,
    displayName: "北海道茅部郡森町赤井川229（グリーンピア大沼スキー場）",
    types: [],
    aliases: [
      "グリーンピア大沼スキー場",
      "Greenpia Onuma Ski Area",
      "Greenpia Onuma Ski Resort",
    ],
  },
  {
    id: "yunokawa-onsen-emi-hakodateya",
    name: "湯の川温泉 笑 函館屋",
    // OSM 沒有收錄這家旅館，搜尋只會落在「湯の川温泉」整區；座標取自
    // 國土地理院的地址搜尋（函館市湯川町三丁目10番3号）。
    latitude: 41.77599,
    longitude: 140.790527,
    displayName: "北海道函館市湯川町三丁目10番3号",
    types: ["lodging"],
    aliases: [
      "湯の川温泉 笑 函館屋",
      "湯の川温泉笑函館屋",
      "笑 函館屋",
      "Yunokawa Onsen EMI HAKODATEYA",
      "Yunokawa Onsen EMI HAKODATEYA 湯の川温泉 笑 函館屋",
      "EMI HAKODATEYA",
    ],
  },
  {
    id: "horumon-ichiba-ai-hakodate",
    name: "函館炭火焼肉・ホルモン市場 愛",
    // OpenStreetMap 沒有收錄這家店，座標取自國土地理院的地址搜尋。
    latitude: 41.786606,
    longitude: 140.787796,
    displayName: "北海道函館市花園町1-13",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "焼肉 ホルモン yakiniku",
    aliases: [
      "函館炭火焼肉・ホルモン市場 愛",
      "函館焼肉ホルモン市場愛",
      "焼肉ホルモン市場愛",
      "ホルモン市場愛",
      "ホルモン市場 愛 函館",
      "Hakodate Yakiniku Horumon Ichiba Ai",
    ],
  },
  {
    id: "kiraku-onuma",
    name: "喜らく",
    // Mapcode 86 816 518*35；座標取自 Mapion 的店家頁面。
    latitude: 41.982397,
    longitude: 140.673773,
    displayName: "北海道亀田郡七飯町大沼町204-11（大沼公園）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "食堂 じゅんさいそば 定食",
    aliases: [
      "喜らく",
      "喜らく 大沼",
      "喜らく 七飯",
      "喜楽 大沼",
      "喜楽",
      "大沼 喜らく",
      "Kiraku Onuma",
    ],
  },
  {
    id: "yoshida-shoten-hakodate",
    name: "スープカリー喰堂 吉田商店",
    // 地址取自 Mapple 的店家頁面；座標取自國土地理院地址搜尋（新川町24番1号）。
    latitude: 41.776093,
    longitude: 140.738251,
    displayName: "北海道函館市新川町24-1（市電千歳町站旁）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "スープカレー カレー",
    aliases: [
      "スープカリー喰堂 吉田商店",
      "スープカリー喰堂吉田商店",
      "吉田商店",
      "吉田商店 函館",
      "函館 吉田商店",
      "スープカリー 吉田商店",
      "駐車場 スープカリー喰堂 吉田商店",
      "駐車場(スープカリー喰堂 吉田商店)",
      "吉田商店 駐車場",
    ],
  },
  {
    id: "eneos-hakodate-airport-ss",
    name: "ENEOS 函館エアポートSS",
    // 地址取自 ENEOS 加油站搜尋（高松町130-92）；座標取自 OpenStreetMap 上該處的 ENEOS 加油站。
    latitude: 41.778178,
    longitude: 140.807413,
    displayName: "北海道函館市高松町130-92（函館機場附近）",
    types: ["gas_station", "point_of_interest", "establishment"],
    aliases: [
      "ENEOS 函館エアポートSS",
      "函館エアポートSS",
      "ENEOS 函館エアポート",
      "エネオス 函館エアポートSS",
      "函館エアポートSS 北海道エネルギー",
      "Hakodate Airport SS",
      "Hakodate Airport SS Hokkaido Energy (Ltd.) Hakodate Sales Branch ENEOS 函館エアポートSS",
    ],
  },
  {
    id: "worldnet-rentacar-hakodate-airport",
    name: "ワールドネットレンタカー 函館空港営業所",
    // 地址取自 skyticket 的營業所頁面；座標取自 Google Maps 上這家店的圖釘（使用者確認的位置）。
    latitude: 41.772889,
    longitude: 140.79937,
    displayName: "北海道函館市高松町220-1（函館機場有免費接駁車，約10分鐘）",
    types: ["car_rental", "point_of_interest", "establishment"],
    aliases: [
      "ワールドネットレンタカー 函館空港営業所",
      "ワールドネットレンタカー函館空港営業所",
      "ワールドネットレンタカー 函館空港",
      "ワールドネットレンタカー",
      "Worldnet Car Rental",
      "Worldnet Car Rental 函館",
      "Worldnet Car Rental ワールドネットレンタカー 函館空港営業所",
      "Worldnet Car Rental 函館空港営業所",
      "Worldnet 函館空港営業所",
      "Worldnet Rent a Car Hakodate Airport",
    ],
  },
  {
    id: "onuma-park-south-parking",
    name: "大沼公園 南駐車場",
    // Mapcode 86 815 504*56（使用者提供）。
    latitude: 41.981988,
    longitude: 140.669779,
    displayName: "北海道亀田郡七飯町大沼町（大沼公園 南駐車場）",
    types: ["parking", "point_of_interest", "establishment"],
    aliases: [
      "大沼公園 南駐車場",
      "大沼公園南駐車場",
      "大沼 南駐車場",
      "大沼南駐車場",
      "大沼公園 駐車場",
      "大沼公園駐車場",
      "駐車場 大沼公園",
      "Lake Ōnuma South parking lot",
      "Lake Onuma South parking lot",
      "Lake Ōnuma South parking lot 大沼公園 南駐車場",
      "Lake Onuma South parking lot 大沼公園 南駐車場",
      "Lake Ōnuma South parking lot. 大沼公園 南駐車場",
      "Lake Onuma South parking lot. 大沼公園 南駐車場",
      "Onuma Park South Parking",
    ],
  },
  {
    id: "goryokaku-park-hakodate",
    name: "五稜郭公園",
    // 免費地圖搜「五稜郭公園」也會回長野縣佐久市的同名公園；座標取自 OpenStreetMap 的函館五稜郭公園（五稜郭町44）。
    latitude: 41.7969,
    longitude: 140.757156,
    displayName: "北海道函館市五稜郭町44（特別史跡 五稜郭跡）",
    types: ["park", "tourist_attraction", "point_of_interest", "establishment"],
    aliases: [
      "五稜郭公園",
      "五稜郭",
      "五稜郭 函館",
      "函館 五稜郭",
      "函館五稜郭",
      "五稜郭公園 函館",
      "函館 五稜郭公園",
      "函館五稜郭公園",
      "五稜郭跡",
      "特別史跡五稜郭跡",
      "Goryokaku",
      "Goryokaku Park",
      "Fort Goryokaku",
    ],
  },
  {
    id: "hakodate-onuma-prince-hotel",
    name: "函館大沼プリンスホテル",
    // Mapcode 86 842 884*05，取自 japanmapcode.com 的搜尋結果。
    latitude: 41.994023,
    longitude: 140.642065,
    displayName: "北海道亀田郡七飯町西大沼温泉（函館大沼王子大飯店）",
    types: ["lodging", "point_of_interest", "establishment"],
    aliases: [
      "函館大沼プリンスホテル",
      "大沼プリンスホテル",
      "函館大沼王子大飯店",
      "函館大沼王子飯店",
      "大沼王子大飯店",
      "大沼王子飯店",
      "函館大沼王子酒店",
      "大沼王子酒店",
      "Hakodate Onuma Prince Hotel",
      "Onuma Prince Hotel",
    ],
  },
  {
    id: "sakuo-to-mochiko-goryokaku",
    name: "サク男ともち子",
    // 地址取自店家在 X 的開店公告（五稜郭町30-16 2F，ラッキーピエロ隣）；座標取自國土地理院地址搜尋。
    latitude: 41.794109,
    longitude: 140.753098,
    displayName: "北海道函館市五稜郭町30-16 2F（五稜郭塔附近，ラッキーピエロ隔壁）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "クレープ スイーツ",
    aliases: [
      "サク男ともち子",
      "サク男 と もち子",
      "サク男ともち子 函館",
      "サク男ともち子 五稜郭",
      "函館 サク男ともち子",
      "五稜郭 サク男ともち子",
      "サク男ともち子 可麗餅",
    ],
  },
  {
    id: "goryokaku-tourist-parking-hakodate",
    name: "函館市五稜郭観光駐車場",
    // 地址取自 odekake7.net 的停車場介紹（五稜郭町27-7）；座標取自國土地理院地址搜尋。
    latitude: 41.796986,
    longitude: 140.753189,
    displayName: "北海道函館市五稜郭町27-7（五稜郭塔走路約2分鐘）",
    types: ["parking", "point_of_interest", "establishment"],
    aliases: [
      "函館市五稜郭観光駐車場",
      "五稜郭観光駐車場",
      "函館 五稜郭観光駐車場",
      "五稜郭 観光駐車場",
      "五稜郭觀光停車場",
      "五稜郭停車場",
      "五稜郭 駐車場",
      "五稜郭駐車場",
    ],
  },
  {
    id: "hakodate-nanae-snow-park",
    name: "函館七飯スノーパーク",
    // 地址取自 rurubu／Mapple（七飯町東大沼666）；座標是山腳纜車站旁的雪場餐廳大樓
    // （OpenStreetMap node 11804975770），使用者在地圖上指定的位置。
    latitude: 41.987272,
    longitude: 140.747872,
    displayName: "北海道亀田郡七飯町東大沼666（函館七飯滑雪場 山腳大樓）",
    types: ["point_of_interest", "establishment"],
    aliases: [
      "函館七飯スノーパーク",
      "七飯スノーパーク",
      "函館七飯滑雪場",
      "七飯滑雪場",
      "函館七飯雪場",
      "Hakodate Nanae Snow Park",
      "Nanae Snow Park",
    ],
  },
  {
    id: "kobe-sumibi-yakiniku-buzz-hakodate",
    name: "神戸炭火焼肉 BUZZ 函館本店",
    // 地址取自 Tabelog／楽天ぐるなび（湯川町3丁目28-19 1F，湯の川站走路2分鐘）；座標取自國土地理院地址搜尋，與 Mapion 一致。
    latitude: 41.781132,
    longitude: 140.792023,
    displayName: "北海道函館市湯川町3丁目28-19 1F（市電湯の川站附近）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "焼肉 神戸牛",
    aliases: [
      "神戸炭火焼肉 BUZZ 函館本店",
      "神戸炭火焼肉 BUZZ",
      "神戸炭火焼肉BUZZ",
      "BUZZ 函館本店",
      "Kobe Sumibi Yakiniku BUZZ",
      "Kobe Sumibi Yakiniku BUZZ 函館本店",
      "Kobe Sumibi Yakiniku BUZZ Buzz 函館本店",
      "Kobe Sumibi Yakiniku Buzz Hakodate",
    ],
  },
  {
    id: "lucky-pierrot-goryokaku-koenmae",
    name: "ラッキーピエロ 五稜郭公園前店",
    // 地址取自 icotto／LIVE JAPAN（五稜郭町30-14，五稜郭塔斜對面）；座標取自國土地理院地址搜尋。
    latitude: 41.794331,
    longitude: 140.753265,
    displayName: "北海道函館市五稜郭町30-14（五稜郭塔斜對面）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "ハンバーガー",
    aliases: [
      "ラッキーピエロ 五稜郭公園前店",
      "ラッキーピエロ五稜郭公園前店",
      "ラッキーピエロ 五稜郭",
      "幸運小丑 五稜郭",
      "幸運小丑漢堡 五稜郭",
      "Lucky Pierrot Goryokaku",
      "Lucky Pierrot Goryokaku Koen Mae",
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
  // A dash standing alone between words (「Worldnet Car Rental ー 函館空港営業所」)
  // is a separator, not the katakana long vowel.
  [...text.toLocaleLowerCase().replace(/(^|\s)[ー—–―-](?=\s|$)/gu, "$1")]
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

// 行程常寫成「中文名 日文名」，整串查不到時改查名稱的前後段。
const getNameFragments = (query) => {
  const words = query.split(/\s+/).filter(Boolean);
  const fragments = [];
  for (let length = words.length - 1; length >= 1; length -= 1) {
    fragments.push(words.slice(-length).join(" "), words.slice(0, length).join(" "));
  }
  return fragments.filter((fragment) => fragment.length >= 4);
};

// Names copied from Google Maps often run English and Japanese together
// (「FamilyMart; Onuma Park Interchange ファミリーマート 大沼公園インター店」);
// the map knows the place by its Japanese words alone.
const JAPANESE_WORD_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const getJapanesePart = (query) => {
  const words = query.split(/\s+/).filter(Boolean);
  const japaneseWords = words.filter(
    (word) => JAPANESE_WORD_PATTERN.test(word) && !/^[ー—–―]+$/u.test(word),
  );
  if (!japaneseWords.length || japaneseWords.length === words.length) return "";
  return japaneseWords.join(" ").replace(/[|｜;；,，]+$/u, "").trim();
};

const getGeocodeQueries = (text) => {
  const original = getLocationQuery(text).replace(/長谷川商店|长谷川商店/gu, "ハセガワストア");
  const japanesePart = getJapanesePart(original);
  const withoutType = original
    .replace(
      /(?:滑雪度假村|滑雪渡假村|滑雪場|滑雪场|雪場|雪场|飯店|酒店|旅館|民宿)$/u,
      "",
    )
    .trim();
  // Japanese airports are 「…空港」, so 「函館機場」 is searched as 「函館空港」.
  const airport = /(?:國際|国際)?(?:機場|机场)$/u.test(original)
    ? toJapaneseSearchText(original.replace(/(?:國際|国際)?(?:機場|机场)$/u, "空港"))
    : "";
  return [
    ...new Set(
      [
        original,
        japanesePart,
        airport,
        toJapaneseSearchText(original),
        withoutType,
        toJapaneseSearchText(withoutType),
        ...getNameFragments(original),
      ].filter(Boolean),
    ),
  ].slice(0, 8);
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
  return findNamedPlaceForText(text) ?? findTownForText(text);
}

// normalizeText drops words like スキー場, so 「グリーンピア大沼スキー場」 would
// equal the hotel 「グリーンピア大沼」. A stop that names a ski area must never
// take a lodging's fixed pin.
// Stops are often written 「喜らく餐廳」 or 「晚餐 喜らく」; the meal words are
// dropped so the name alone still finds its fixed pin instead of a same-named
// shop elsewhere in Japan.
const MEAL_WORDS_PATTERN =
  /餐廳|餐厅|餐館|餐馆|レストラン|早餐|午餐|晚餐|宵夜|用餐|吃飯|吃饭|ランチ|ディナー|restaurant|breakfast|lunch|dinner|[:：]/giu;

function findNamedPlaceForText(text) {
  const query = getLocationQuery(text);
  const normalized = normalizeText(query);
  if (!normalized) return null;
  const withoutMealWords = normalized.replace(MEAL_WORDS_PATTERN, "");
  const namesSkiArea = SKI_AREA_PATTERN.test(query);
  return (
    namedPlaces.find(
      (place) =>
        !(namesSkiArea && place.types?.includes("lodging")) &&
        place.aliases.some((alias) => {
          const name = normalizeText(alias);
          return normalized === name || withoutMealWords === name;
        }),
    ) ?? null
  );
}

const getLocationQuery = (text) => text.split(/[｜|\n]/)[0].trim();

// A saved location belongs to the text it was found for; once the text
// changes it may point at a different place, so drop it.
const withItemText = (item, text) =>
  item.text === text ? item : { ...item, text, location: undefined };

// Resolve where an itinerary item is, preferring an unsaved draft over the
// saved text so a stale location never outlives an edit.
function resolveItemLocation(item, draftText) {
  const text = draftText ?? item.text;
  const savedLocation = text === item.text ? item.location : null;
  return findNamedPlaceForText(text) ?? savedLocation ?? findKnownLocationForText(text);
}

const getGeocodingErrorMessage = (error) =>
  ({
    "map-service-rate-limited": "地點搜尋太頻繁，請稍等一下再試一次。",
  })[error?.message] ?? "定位服務暫時無法使用，請稍後再試。";

function geocodeJapanesePlace(text) {
  const query = getLocationQuery(text);
  if (!query) return Promise.resolve(null);
  const cacheKey = query.toLocaleLowerCase();
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)) ?? {};
    // 只重用成功的定位；先前暫時失敗留下的 null 必須允許重新查詢。
    if (cache[cacheKey]) return Promise.resolve(cache[cacheKey]);
  } catch {
    // 快取損壞時直接重新查詢。
  }
  if (pendingGeocodes.has(cacheKey)) return pendingGeocodes.get(cacheKey);
  const task = (async () => {
    let location = null;
    const coordinates = findCoordinatesInText(text);
    if (coordinates) {
      const name = getLocationQuery(text).replace(/https?:\/\/\S+|-?\d+\.\d+\s*,\s*-?\d+\.\d+/g, "").trim();
      location = {
        id: `pin-${coordinates.latitude.toFixed(5)},${coordinates.longitude.toFixed(5)}`,
        name: name || "指定地點",
        ...coordinates,
        displayName: `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
        query: name,
        types: [],
        website: "",
      };
    }
    const japanesePart = getJapanesePart(getLocationQuery(text));
    for (const candidate of location ? [] : getGeocodeQueries(text)) {
      // The Japanese part of a mixed name is a complete name on its own, so it
      // is matched as one rather than as a short fragment of the whole.
      const fullName = candidate === japanesePart ? japanesePart : getLocationQuery(text);
      location = await searchJapanPlace(candidate, fullName);
      // The Japanese part is often just a branch (「函館空港営業所」), which other
      // companies share; keep only a place whose whole name the stop spells out.
      if (
        location &&
        candidate === japanesePart &&
        !normalizeText(getLocationQuery(text)).includes(normalizeText(location.name))
      ) {
        location = null;
      }
      if (location) break;
    }
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

const makeVersionId = () =>
  `version-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const syncActiveVersionItems = (day, nextItems) => {
  if (!Array.isArray(day.versions) || !day.activeVersionId) {
    return { ...day, items: nextItems };
  }
  return {
    ...day,
    items: nextItems,
    versions: day.versions.map((version) =>
      version.id === day.activeVersionId
        ? { ...version, items: nextItems }
        : version,
    ),
  };
};

const repairLocatedItemText = (items = []) =>
  items.map((item) =>
    !item.text?.trim() && item.location?.name
      ? { ...item, text: item.location.name }
      : item,
  );

// Versions are labelled A, B, C… by position.
const versionLabel = (index) => String.fromCharCode(65 + index);

const normalizePlannerDay = (day) => ({
  ...day,
  date: day.date ?? "",
  items: repairLocatedItemText(day.items),
  ...(Array.isArray(day.versions)
    ? {
        versions: day.versions.map((version, index) => ({
          ...version,
          label: versionLabel(index),
          items: repairLocatedItemText(version.items),
        })),
      }
    : {}),
});

function PlannerTextInput({ value, onDraftChange }) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  return (
    <textarea
      ref={textareaRef}
      rows="2"
      value={draft}
      placeholder="輸入行程"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        onDraftChange(nextDraft);
      }}
      onBlur={() => {
        focusedRef.current = false;
      }}
    />
  );
}

const hasPlannerContent = (plannerDays) =>
  Array.isArray(plannerDays) && plannerDays.some(
    (day) =>
      Boolean(day.date) ||
      day.items?.some((item) => Boolean(item.text?.trim())),
  );

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

function PlannerDatePicker({ value, onChange }) {
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
        <span>
          {value ? value.replaceAll("-", "/") : "選擇日期"}
          {value && (
            <span className="planner-calendar-weekday">({formatItineraryDate(value, true)})</span>
          )}
        </span>
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
      return saved.map(normalizePlannerDay);
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

// When no timetable connects two stops, give a rough figure instead of only
// pointing at Google Maps: trains and buses average about 50 km/h on the road
// distance, plus some 10 minutes of waiting and walking.
function estimateTransitTime(from, to) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const a =
    Math.sin(toRadians(to.latitude - from.latitude) / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(toRadians(to.longitude - from.longitude) / 2) ** 2;
  const roadDistance = Math.max(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.28, 1);
  const minutes = Math.max(Math.round(((roadDistance / 50) * 60 + 10) / 5) * 5, 10);
  const hours = Math.floor(minutes / 60);
  return hours
    ? `${hours} 小時${minutes % 60 ? ` ${minutes % 60} 分鐘` : ""}`
    : `${minutes} 分鐘`;
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

function estimateFlightTime(from, to) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const hours = Math.max(Math.round((distance / 750 + 0.35) * 2) / 2, 0.5);
  return `約 ${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小時`;
}

const FLIGHT_NOTE_PATTERN = /航班|班機|飛機|航空|搭機|flight|airline/iu;
const DRIVING_NOTE_PATTERN = /開車|自駕|自驾|駕車|驾车|開車前往|租車|租车|還車|还车|還租車|还租车|drive|driving|car\b/iu;
const TRANSIT_NOTE_PATTERN = /搭車|電車|火車|巴士|公車|客運|新幹線|地鐵|捷運|機捷|高鐵|台鐵|臺鐵|輕軌|列車|\b(?:JR|MRT|HSR|train|bus|transit)\b/iu;
const EXPLICIT_TRANSIT_NOTE_PATTERN = /搭車|電車|火車|巴士|公車|客運|新幹線|地鐵|捷運|機捷|高鐵|台鐵|臺鐵|輕軌|列車|\b(?:MRT|HSR|train|bus|transit)\b/iu;
const WALKING_NOTE_PATTERN = /走路|步行|徒步|散步|walk(?:ing)?/iu;

function makeGoogleDirectionsUrl(from, to, travelMode) {
  const parameters = new URLSearchParams({
    api: "1",
    origin: `${from.latitude},${from.longitude}`,
    destination: `${to.latitude},${to.longitude}`,
    travelmode: travelMode,
  });
  return `https://www.google.com/maps/dir/?${parameters}`;
}

function DrivingCarIcon() {
  return (
    <svg className="planner-driving-car-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path className="car-body" d="M4 27h5l7-13h18l9 13h1c2 0 3 2 3 4v7H2v-8c0-2 1-3 2-3z" />
      <path className="car-window" d="M18 17h6v10H12zM27 17h6l7 10H27z" />
      <path className="car-detail" d="M5 32h5M42 32h4M17 31h14" />
      <circle className="car-wheel" cx="13" cy="38" r="5" />
      <circle className="car-hub" cx="13" cy="38" r="2" />
      <circle className="car-wheel" cx="37" cy="38" r="5" />
      <circle className="car-hub" cx="37" cy="38" r="2" />
    </svg>
  );
}

function TransitTrainIcon() {
  return (
    <svg className="planner-transit-train-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path className="train-body" d="M10 6c8-3 20-3 28 0l3 27c0 4-3 7-7 7H14c-4 0-7-3-7-7z" />
      <path className="train-window" d="M13 11h22l2 14H11z" />
      <path className="train-detail" d="M12 30h5m14 0h5M17 40l-6 6m20-6 6 6M16 46h16" />
      <circle className="train-light" cx="15" cy="32" r="2.5" />
      <circle className="train-light" cx="33" cy="32" r="2.5" />
    </svg>
  );
}

function FlightPlaneIcon() {
  return (
    <svg className="planner-flight-plane-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path className="plane-body" d="M9 25 32 13l10 3 3 5-18 15-14 1-6-6z" />
      <path className="plane-body plane-wing" d="m24 25 22 7-2 4-22-4zM18 24 6 14l-4 2 11 14z" />
      <path className="plane-body" d="m37 17 5-12 3 2-2 14z" />
      <path className="plane-window" d="m23 19 7-4 8 3-12 7z" />
      <path className="plane-accent" d="m8 26 5-3 6 3 1 5-4 5-5 1-4-6z" />
      <path className="plane-detail" d="M6 18 4 40M1 16l9 26M28 35l-2 7" />
      <circle className="plane-wheel" cx="25" cy="43" r="4" />
      <circle className="plane-wheel-hub" cx="25" cy="43" r="1.5" />
    </svg>
  );
}

function WalkingIcon() {
  // The picture is stacked once per footprint, each copy clipped to one print,
  // so the prints can appear in walking order and fade out behind.
  return (
    <span className="planner-walking-icon" aria-hidden="true">
      {[1, 2, 3, 4].map((step) => (
        <img key={step} className={`walking-step walking-step-${step}`} src={walkingStepsIcon} alt="" />
      ))}
    </span>
  );
}

// How a stop's note says to reach the next stop: "flight", "walking",
// "transit" or "driving" (the default).
function getTravelMode(note = "") {
  if (FLIGHT_NOTE_PATTERN.test(note)) return "flight";
  if (WALKING_NOTE_PATTERN.test(note)) return "walking";
  // A clear 「搭車」 instruction overrides incidental place-name words such as
  // "Rent-a-Car". Conversely, an explicit 「開車」 remains self-driving even
  // when the hotel name contains "JR".
  if (EXPLICIT_TRANSIT_NOTE_PATTERN.test(note)) return "transit";
  if (DRIVING_NOTE_PATTERN.test(note)) return "driving";
  return TRANSIT_NOTE_PATTERN.test(note) ? "transit" : "driving";
}

// The road or rail shape of a leg for the route map. Without a timetable or
// footpath match the road route stands in; flights and legs with no route at
// all are drawn straight.
function getTravelPath(segment, mode) {
  if (mode === "flight") return null;
  const path = [segment?.[mode]?.path, segment?.driving?.path].find(
    (candidate) => candidate?.length > 1,
  );
  return path ?? null;
}

const makeMenuEntry = (name = "", price = "", original = "") => ({
  id: globalThis.crypto?.randomUUID?.() ?? `menu-${Date.now()}-${Math.random()}`,
  name,
  original,
  price,
});

// The device's own calendar date, 「YYYY-MM-DD」, names each day's backup.
const getLocalDateKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

const downloadBackupFile = (backup) => {
  const { savedAt, ...data } = backup;
  const blob = new Blob(
    [JSON.stringify({ ...data, savedAt: savedAt?.toISOString?.() ?? null }, null, 2)],
    { type: "application/json" },
  );
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `雪旅地圖行程備份-${backup.id}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Prices are shown in whole yen; a price typed to the sen, e.g. ¥619.92,
// is rounded to the nearest yen.
const formatMenuPrice = (price) => {
  const digits = String(price ?? "").replace(/[^\d.]/g, "");
  const value = Math.round(Number(digits));
  return digits && Number.isFinite(value) ? `¥${value.toLocaleString("ja-JP")}` : "";
};

// Menus read from photos of the shop's own menu board, shown for any stop at
// that shop until the traveller saves a menu of their own.
// A plain string in `rows` starts a category; the items after it carry it,
// and the menu shows a heading wherever the category changes.
const makePresetMenu = (prefix, rows) => {
  let category = "";
  const items = [];
  rows.forEach((row) => {
    if (typeof row === "string") {
      category = row;
      return;
    }
    const [rawName, original, price] = row;
    // A leading 👍 marks one of the shop's most popular items; the menu shows
    // a thumbs-up in place of the bowl instead of keeping it in the name.
    const popular = rawName.startsWith("👍");
    items.push({
      id: `${prefix}-${items.length + 1}`,
      name: popular ? rawName.replace(/^👍\s*/u, "") : rawName,
      original,
      price,
      ...(popular && { popular: true }),
      ...(category && { category }),
    });
  });
  return items;
};

const PRESET_MENUS = [
  {
    pattern: /サク男ともち子|saku\s*o\s*to\s*mochiko/iu,
    menu: makePresetMenu("sakuo-mochiko", [
      ["👍 逞強焦糖可麗餅（人氣 No.1）", "強がり焦がし", "980"],
      ["👍 腮紅草莓可麗餅（人氣 No.2）", "頬紅いちご", "1080"],
      ["👍 午後生起司可麗餅（人氣 No.3）", "午後のレアチーズ", "980"],
      ["初戀香蕉可麗餅（人氣 No.4）", "初恋バナナ", "880"],
    ]),
  },
  {
    // Tax-included prices from the store's menu dated 2025-04-21, rounded to the yen.
    pattern: /ハセガワストア|hasegawa\s*store|長谷川商店|长谷川商店/iu,
    menu: makePresetMenu("hasegawa-store", [
      ["👍 烤雞肉串便當（小）", "やきとり弁当（小）", "620"],
      ["烤雞肉串便當（中）", "やきとり弁当（中）", "741"],
      ["烤雞肉串便當（大）", "やきとり弁当（大）", "851"],
      ["烤雞肉串便當（迷你）", "やきとり弁当ミニ", "500"],
      ["烤雞肉串便當・蔬菜綜合", "やきとり弁当 野菜ミックス", "610"],
      ["烤雞肉串便當・綜合口味", "やきとり弁当 バラエティ", "741"],
      ["烤雞肉串便當 W（醬汁豬肉＋鹽味豬五花）", "やきとり弁当W", "730"],
      ["👍 雞肉丸便當", "つくね弁当", "610"],
      ["👍 烤便當棒（1 支）", "やき弁棒", "180"],
      ["加點：起司醬", "チーズソース", "60"],
      ["加點：溫泉蛋", "温泉玉子", "52"],
      ["豬舌串", "豚タン", "140"],
      ["豬心串", "豚ハツ", "140"],
      ["豬肝串", "豚レバー", "140"],
      ["豬肉串", "豚精肉", "140"],
      ["豬五花串", "豚カルビ", "140"],
      ["起司豬肉串", "豚チーズ", "180"],
      ["雞肉串", "とり肉", "140"],
      ["雞皮串", "とり皮", "140"],
      ["合鴨肉丸串", "合鴨つくね", "140"],
      ["雞軟骨串", "とり軟骨", "150"],
      ["雞胗串", "とり砂肝", "150"],
      ["雞屁股串", "ぽんぽち", "140"],
      ["蒜味雞腿肉串", "ニンニクとりもも串", "140"],
      ["雞脖子肉串", "せせり串", "140"],
      ["蔬菜串", "野菜串", "180"],
    ]),
  },
  {
    // Dine-in board and takeaway bento list from photos of the shop's menus;
    // prices include tax. Prices cut off in the photo are left blank.
    pattern: /(?:神戸|神戶|kobe|炭火|sumibi|焼肉|燒肉|yakiniku)[^｜|]*buzz|buzz[^｜|]*(?:焼肉|燒肉|yakiniku)/iu,
    menu: makePresetMenu("kobe-buzz", [
      ["心臟生魚片（牛心刺身）", "ハート刺し", "1010"],
      ["千層肚生魚片（センマイ刺身）", "センマイ刺し", "1010"],
      ["半熟牛排韓式生拌牛肉", "レアステーキユッケ", "1140"],
      ["炙燒和牛腹肉刺身", "炙り和牛トロ刺し", "1440"],
      ["👍 鹽味牛舌（人氣）", "塩タン", "1320"],
      ["👍 神戶牛五花（人氣）", "神戸牛カルビ", "1680"],
      ["👍 和牛橫膈膜（人氣）", "和牛ハラミサガリ", "1790"],
      ["特選三種拼盤（菲力・三角肩・臀肉或腹脇肉）", "特選三種盛", "3780"],
      ["神戶牛三種拼盤", "神戸牛三種盛", "4290"],
      ["紅肉三種拼盤", "赤身三種盛", "2890"],
      ["外帶・橫膈膜牛排便當 120g", "ハラミステーキ弁当 120g", "1544"],
      ["外帶・橫膈膜牛排便當 150g", "ハラミステーキ弁当 150g", "1836"],
      ["外帶・橫膈膜（サガリ）牛排便當 120g", "サガリステーキ弁当 120g", "1728"],
      ["外帶・橫膈膜（サガリ）牛排便當 150g", "サガリステーキ弁当 150g", "1998"],
      ["外帶・和牛紅肉牛排便當 120g", "和牛赤身肉ステーキ弁当 120g", "2246"],
      ["外帶・和牛里肌牛排便當 120g", "和牛ロースステーキ弁当 120g", "2376"],
      ["外帶・特選菲力牛排便當 120g", "特選フィレステーキ弁当 120g", "4136"],
      ["外帶・神戶牛牛排便當 120g", "神戸牛ステーキ弁当 120g", "3132"],
      ["外帶・和牛五花＋鹽味牛舌便當（普通，鹽或醬）", "和牛カルビと塩タン弁当・並", "1587"],
      ["外帶・和牛五花＋鹽味牛舌便當（大，鹽或醬）", "和牛カルビと塩タン弁当・大", "1922"],
      ["外帶・橫膈膜＋鹽味牛舌便當（普通，鹽或醬）", "サガリと塩タン弁当・並", "1706"],
      ["外帶・橫膈膜＋鹽味牛舌便當（大，鹽或醬）", "サガリと塩タン弁当・大", "2008"],
      ["外帶・和牛五花＋橫膈膜燒肉便當（鹽或醬）", "和牛カルビとサガリの焼肉弁当", "1609"],
      ["外帶・神戶牛五花＋鹽味牛舌便當（普通，鹽或醬）", "神戸牛カルビと塩タン弁当・並", "1922"],
      ["外帶・神戶牛五花＋鹽味牛舌便當（大，鹽或醬）", "神戸牛カルビと塩タン弁当・大", "2311"],
      ["外帶・和牛五花便當 120g（照片看不到價格）", "和牛カルビ弁当 120g", ""],
      ["外帶・和牛五花便當 150g（照片看不到價格）", "和牛カルビ弁当 150g", ""],
      ["外帶・神戶牛五花便當 120g（照片看不到價格）", "神戸牛カルビ弁当 120g", ""],
      ["外帶・神戶牛五花便當 150g（照片看不到價格）", "神戸牛カルビ弁当 150g", ""],
      ["外帶・橫膈膜燒肉便當 120g（照片看不到價格）", "サガリ焼肉弁当 120g", ""],
      ["外帶・橫膈膜燒肉便當 150g（照片看不到價格）", "サガリ焼肉弁当 150g", ""],
      ["外帶・和牛特選豪華便當（每日三種，150g，照片看不到價格）", "和牛特選デラックス弁当", ""],
      ["外帶・鹽味牛舌便當 120g", "塩タン弁当 120g", "1674"],
      ["外帶・鹽味牛舌便當 150g", "塩タン弁当 150g", "2008"],
      ["外帶・上等鹽味牛舌便當 100g", "上塩タン弁当 100g", "2268"],
      ["外帶・石鍋拌飯", "ビビンバ", "810"],
      ["外帶・內臟丼", "ホルモン丼", "1188"],
      ["外帶・綜合便當", "ミックス弁当", "1144"],
      ["外帶・白菜泡菜", "白菜キムチ", "453"],
      ["外帶・蘿蔔泡菜", "カクテキ", "453"],
      ["外帶・泡菜拼盤", "キムチ盛り合わせ", "637"],
      ["外帶・沙拉碗", "サラダボウル", "626"],
    ]),
  },
  {
    // From screenshots of the shop's menu list; repeated items across its
    // tabs are listed once, and items the list shows without a price keep
    // the price blank.
    pattern: /喜らく|喜楽|kiraku/iu,
    menu: makePresetMenu("kiraku", [
      "定食",
      ["親子丼（雞肉滑蛋蓋飯）", "親子丼", "700"],
      ["牛丼", "牛丼", "700"],
      ["豬排丼", "カツ丼", "800"],
      ["天婦羅丼", "天丼", "800"],
      ["飯糰", "おにぎり", "350"],
      ["茶泡飯", "お茶漬", "400"],
      "大沼名物",
      ["西太公魚", "ワカサギ", "500"],
      ["沼蝦", "混エビ", "500"],
      ["醋拌蓴菜", "じゅんさい酢の物", "500"],
      "新菜單",
      ["雞肉山菜蕎麥麵", "肉山菜そば（チキン）", "800"],
      ["竹篩冷拉麵", "ザルラーメン", "600"],
      "拉麵・蕎麥麵・烏龍麵",
      ["拉麵", "ラーメン", ""],
      ["👍 山菜拉麵", "山菜ラーメン", ""],
      ["叉燒拉麵", "チャーシューメン", ""],
      ["竹篩冷蕎麥麵", "ざるそば", ""],
      ["山菜蕎麥麵／烏龍麵", "山菜そばうどん", ""],
      ["月見（生蛋）蕎麥麵／烏龍麵", "月見そばうどん", ""],
      ["雞肉蕎麥麵／烏龍麵", "かしわそばうどん", ""],
      ["天婦羅蕎麥麵／烏龍麵", "天ぷらそばうどん", ""],
      ["👍 本店招牌鍋燒烏龍麵", "当店自慢鍋うどん", ""],
      ["👍 蓴菜蕎麥麵（大沼名物）", "大沼名物 じゅんさいそば", ""],
      "其他",
      ["烏賊飯定食", "いかめし定食", "1000"],
      ["扇貝", "ほたて", "1000"],
      ["燒肉", "焼肉", "1000"],
      ["炸串", "串かつ", "1000"],
      ["炸蝦", "エビフライ", "1200"],
      ["天婦羅", "天ぷら", "1200"],
      ["雞肉關東煮", "鶏でん", "900"],
      ["烏賊飯", "いかめし", ""],
      ["蓴菜", "じゅんさい", "500"],
      ["活蝦", "活エビ", "500"],
      ["烤烏賊", "心かぼんぼん焼", "500"],
      ["烏賊納豆", "いか納豆", "500"],
      ["烏賊生魚片", "いかさし", "500"],
      ["奶油煎烤", "バター焼", "500"],
      ["炸蝦天婦羅", "エビ天ぷら", "500"],
      ["天婦羅拼盤", "天ぷら盛り合せ", "1000"],
      ["烏賊天婦羅", "いか天ぷら", "300"],
      ["起司烤竹輪", "ちくわチーズ焼", "350"],
      ["烤海螺", "うぶ焼", "600"],
      ["薯條", "フライドポテト", "400"],
      ["烤雞肉串", "やきとり", "400"],
      ["關東煮", "おでん", "400"],
      ["どんど燒（筷捲大阪燒）", "どんど", "500"],
      ["味噌拌小黃瓜", "もろきゅう", "250"],
      ["主廚隨意沙拉", "きまぐれサラダ", "500"],
      ["烤大蝦串", "ジャンガエビ串焼", "500"],
      ["烤花魚", "ホッケ", "700"],
      ["味噌內臟", "ホルモンみそ", "700"],
      ["醃漬小菜", "お漬", "350"],
      ["烤帶卵柳葉魚", "子持ちししゃも", "300"],
      ["豆類小菜", "豆", "300"],
      ["熱騰騰小菜", "アツアツ", "350"],
      ["醋拌海蘊", "もずく酢の物", "350"],
      ["冷豆腐", "冷奴", "350"],
      ["松前漬（魷魚昆布醃漬）", "松前漬", "350"],
      ["韭菜炒豬肝", "レバニラいため", "700"],
      ["湯豆腐", "湯どうふ", "500"],
      ["納豆歐姆蛋", "納豆オムレツ", "600"],
      ["蕎麥麵", "そば", "700"],
      ["烏龍麵", "うどん", "700"],
      ["烤魚定食", "焼魚定食", ""],
      ["烤活蝦", "活エビ焼", "500"],
      ["烤西太公魚", "ウワカサ焼", "500"],
      ["烤溫豆腐", "温どうふ焼", "300"],
      ["烤鰤魚", "ふり焼", "300"],
      ["店家烤物", "新焼", "500"],
      ["烤糯米椒", "しし唐", "300"],
      ["烤鯡魚", "ニシン", "500"],
      ["烤鮭魚", "シャケ", "500"],
      ["烤大文蛤", "大あさり焼", "1000"],
      ["奶油烤烏賊", "いかバター焼", "700"],
      ["烏賊豆子小菜", "いか豆", "600"],
      ["鹽辛烏賊", "いか塩辛", "300"],
      ["醬油醃烏賊（沖漬）", "いか沖漬", "350"],
      ["炸烏賊腳", "いかげそ唐揚", "600"],
      ["烏賊細麵（生烏賊絲）", "いかそうめん", "800"],
      ["豆子歐姆蛋", "カザ豆オムレツ", "500"],
      ["烤香菇", "しいたけ焼", "450"],
      ["醋拌松藻海蘊", "松もずく酢の物", "350"],
      ["醋海蘊", "もずく酢", "350"],
      ["毛豆", "枝豆", "300"],
      ["馬鈴薯燉肉", "肉じゃが", "350"],
      ["醃漬物拼盤", "お漬物", "500"],
      ["烤內臟", "ホルモン焼", "700"],
      ["炒內臟", "ホルモンいため", "700"],
      ["どんど燒", "どんど焼", "600"],
      ["烤鵪鶉蛋", "うづら焼", "400"],
      ["山菜蕎麥麵", "山菜そば", "700"],
      ["山菜烏龍麵", "山菜うどん", "700"],
      ["鰻魚重定食", "うな重定食", ""],
      ["蝦", "エビ", "1300"],
      ["雞肉豆腐", "鶏どうふ", ""],
      ["味噌薄煎餅（ふなやき）", "ふなやき", ""],
      ["當季豆腐", "新物どうふ", ""],
      ["奶油烤香菇", "しいたけバター焼", ""],
      ["玉子豆", "玉子豆", ""],
      ["味噌烤內臟", "ホルモンみそ焼", ""],
      ["烤大蝦", "ジャンボエビ焼", ""],
      ["奶油烤扇貝", "ほたてバター焼", ""],
      ["どんどん燒", "どんどん焼", ""],
      ["烤海螺（つぶ貝）", "つぶ焼", ""],
      ["炸起司竹輪", "ちくわチーズ揚", ""],
    ]),
  },
  {
    // From screenshots of the shop's menu tabs, grouped by its own
    // categories. Items repeated across tabs (e.g. the Crème Brûlée and
    // mille-feuille lines) are listed once, under the first tab that shows them.
    pattern: /angelique|アンジェリーク|アンジェリック/iu,
    menu: makePresetMenu("angelique-voyage", [
      "季節限定",
      ["烤棉花糖可麗餅", "焼きマシュマロ（Roasted marshmallows）", "1100"],
      ["紅茶柳橙可麗餅", "オレンジ（Tea & orange）", "900"],
      ["焦糖香蕉千層可麗餅", "キャラメルバナナのミルフィーユ", "950"],
      ["洋梨千層可麗餅", "洋梨のミルフィーユ", "950"],
      ["蒙布朗可麗餅", "モンブラン", "1050"],
      ["蜂蜜優格鳳梨可麗餅", "はちみつヨーグルトとパイン", "950"],
      ["👍 草莓鮮奶油蛋糕可麗餅", "苺のショートケーキのクレープ", "950"],
      "定番",
      ["👍 草莓千層可麗餅", "苺のミルフィーユ", "950"],
      ["濃厚卡士達千層可麗餅", "濃厚カスタードのミルフィーユ", "800"],
      ["巧克力千層可麗餅", "ミルフィーユショコラ", "800"],
      ["草莓烤布蕾可麗餅", "苺のクレームブリュレ", "1050"],
      ["香蕉烤布蕾可麗餅", "バナナのクレームブリュレ", "950"],
      ["草莓牛奶可麗餅", "いちごみるく", "900"],
      ["巧克力草莓可麗餅", "チョコいちご", "900"],
      ["👍 巧克力香蕉可麗餅", "チョコバナナ", "800"],
      ["狹山抹茶可麗餅（埼玉狹山茶）", "狭山の抹茶", "900"],
      "其他",
      ["Q 彈可麗餅（現烤餅皮＋鮮奶油＋水果）", "もちもちクレープ", "800"],
      ["巧克力千層薄餅", "ミルクレープ ショコラ", "800"],
      ["巧克力草莓", "チョコレート 苺", "850"],
    ]),
  },
];

const findPresetMenu = (text = "") => {
  const headline = String(text).split(/\r?\n/)[0];
  return PRESET_MENUS.find(({ pattern }) => pattern.test(headline))?.menu;
};

// Google Maps opens a place on its 菜單 tab only when the URL carries the
// place's feature id (「0x…:0x…」), which free services do not provide; it
// is read from a full Google Maps link the traveller pastes instead.
const GOOGLE_PLACE_ID_PATTERN = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)|ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i;
const findGooglePlaceId = (text = "") => {
  const match = String(text).match(GOOGLE_PLACE_ID_PATTERN);
  return match ? (match[1] ?? match[2]).toLowerCase() : null;
};
const makeGoogleMenuUrl = (placeId) =>
  `https://www.google.com/maps/place/data=!4m3!3m2!1s${placeId}!10e9`;

function MenuDishRow({ entry }) {
  // Menus saved before the thumbs-up icon kept 👍 in the dish name.
  const marked = /^👍/u.test(entry.name ?? "");
  const popular = entry.popular || marked;
  const name = marked ? entry.name.replace(/^👍\s*/u, "") : entry.name;
  return (
    <>
      <span
        className={`planner-menu-dish-icon ${popular ? "is-popular" : ""}`}
        aria-hidden={!popular}
        title={popular ? "人氣推薦" : undefined}
      >
        {popular ? <ThumbsUpIcon /> : <DishIcon />}
      </span>
      <div>
        <strong>{name || entry.original}</strong>
        {name && entry.original && <small lang="ja">{entry.original}</small>}
      </div>
      <b>{formatMenuPrice(entry.price) || "—"}</b>
    </>
  );
}

const hasMenuText = (entry) =>
  Boolean(entry.name.trim() || String(entry.original ?? "").trim());

// A store's menu, typed in by hand from its Google Maps menu photos and
// saved with the itinerary stop so it syncs across devices.
function PlannerMenuDialog({
  title,
  motif,
  mapsQuery,
  initialMenu,
  presetMenu,
  placeId,
  onSave,
  onClose,
}) {
  const [entries, setEntries] = useState(() => {
    if (initialMenu?.length) return initialMenu;
    return [makeMenuEntry()];
  });
  const [isEditing, setIsEditing] = useState(!initialMenu?.length);
  // 正在輸入的那一列；其他已新增的品項顯示成跟菜單一樣的條列。
  const [editingId, setEditingId] = useState(() =>
    initialMenu?.length ? null : entries[0].id,
  );
  const listRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const focusEditingRow = () =>
    requestAnimationFrame(() =>
      listRef.current?.querySelector("input[data-menu-name]")?.focus(),
    );
  // 收起正在輸入的那一列：空白的直接移除。
  const withoutEmptyEditingRow = (current) =>
    current.filter((entry) => entry.id !== editingId || hasMenuText(entry));
  const updateEntry = (id, patch) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  const addEntry = () => {
    const nextEntry = makeMenuEntry();
    setEntries((current) => [...withoutEmptyEditingRow(current), nextEntry]);
    setEditingId(nextEntry.id);
    focusEditingRow();
  };
  const editEntry = (id) => {
    setEntries((current) => withoutEmptyEditingRow(current));
    setEditingId(id);
    focusEditingRow();
  };
  const removeEntry = (id) =>
    setEntries((current) => current.filter((entry) => entry.id !== id));
  const save = () => {
    const cleaned = entries
      .map((entry) => ({
        ...entry,
        name: entry.name.trim(),
        original: String(entry.original ?? "").trim(),
        price: String(entry.price ?? "").trim(),
      }))
      .filter((entry) => entry.name || entry.original);
    onSave(cleaned);
    if (cleaned.length) {
      setEntries(cleaned);
      setEditingId(null);
      setIsEditing(false);
    } else {
      const blank = makeMenuEntry();
      setEntries([blank]);
      setEditingId(blank.id);
    }
  };
  const savedEntries = entries.filter(hasMenuText);
  const mapsUrl = placeId
    ? makeGoogleMenuUrl(placeId)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;
  const submitOnEnter = (event) => {
    if (event.key === "Enter") addEntry();
  };

  return (
    <div className="planner-confirm-backdrop" onClick={onClose}>
      <section
        className="planner-confirm planner-menu-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-menu-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="planner-menu-head">
          <div className="planner-menu-heading">
            {motif && (
              <span className="planner-menu-store-icon" aria-hidden="true">
                <HandDrawnMotif type={motif} />
              </span>
            )}
            <h2 id="planner-menu-title">{title}</h2>
          </div>
          <button type="button" className="planner-menu-close" aria-label="關閉菜單" onClick={onClose}>
            ×
          </button>
        </div>
        {isEditing ? (
          <ul className="planner-menu-list is-editing" ref={listRef}>
            {entries.map((entry) =>
              entry.id === editingId ? (
                <li key={entry.id} className="planner-menu-edit-row">
                  <div className="planner-menu-names">
                    <input
                      data-menu-name
                      value={entry.name}
                      placeholder="中文品名"
                      aria-label="中文品名"
                      onChange={(event) => updateEntry(entry.id, { name: event.target.value })}
                      onKeyDown={submitOnEnter}
                    />
                    <input
                      value={entry.original ?? ""}
                      placeholder="日文原名"
                      aria-label="日文原名"
                      lang="ja"
                      onChange={(event) => updateEntry(entry.id, { original: event.target.value })}
                      onKeyDown={submitOnEnter}
                    />
                  </div>
                  <label className="planner-menu-price-input">
                    <span aria-hidden="true">¥</span>
                    <input
                      value={entry.price}
                      inputMode="numeric"
                      placeholder="價格"
                      aria-label="價格（日圓）"
                      onChange={(event) =>
                        updateEntry(entry.id, { price: event.target.value.replace(/[^\d]/g, "") })
                      }
                      onKeyDown={submitOnEnter}
                    />
                  </label>
                  <button
                    type="button"
                    className="planner-menu-remove"
                    aria-label="刪除這個品項"
                    onClick={() => {
                      removeEntry(entry.id);
                      setEditingId(null);
                    }}
                  >
                    ×
                  </button>
                </li>
              ) : (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="planner-menu-row-button"
                    aria-label={`修改 ${entry.name || entry.original}`}
                    onClick={() => editEntry(entry.id)}
                  >
                    <MenuDishRow entry={entry} />
                  </button>
                  <button
                    type="button"
                    className="planner-menu-remove"
                    aria-label={`刪除品項 ${entry.name || entry.original}`}
                    onClick={() => removeEntry(entry.id)}
                  >
                    ×
                  </button>
                </li>
              ),
            )}
          </ul>
        ) : (
          <ul className="planner-menu-list">
            {savedEntries.map((entry, index) => (
              <Fragment key={entry.id}>
                {entry.category && entry.category !== savedEntries[index - 1]?.category && (
                  <li className="planner-menu-category">{entry.category}</li>
                )}
                <li>
                  <MenuDishRow entry={entry} />
                </li>
              </Fragment>
            ))}
          </ul>
        )}
        {isEditing && (
          <button type="button" className="planner-menu-add" onClick={addEntry}>
            ＋ 新增品項
          </button>
        )}
        <div className="planner-menu-link">
          <a className="planner-menu-photos" href={mapsUrl} target="_blank" rel="noreferrer">
            {placeId ? "在 Google Maps 看菜單 ↗" : "在 Google Maps 找這家店 ↗"}
          </a>
        </div>
        <div className="planner-confirm-actions">
          {isEditing ? (
            <>
              <button type="button" onClick={onClose}>
                取消
              </button>
              <button type="button" className="is-primary" onClick={save}>
                儲存
              </button>
            </>
          ) : (
            <>
              {/* A menu saved on the stop hides the shop's built-in one;
                  clearing it brings the built-in menu back. */}
              {presetMenu?.length > 0 && entries !== presetMenu && (
                <button
                  type="button"
                  onClick={() => {
                    onSave([]);
                    setEntries(presetMenu);
                  }}
                >
                  改用內建菜單（{presetMenu.length} 項）
                </button>
              )}
              <button type="button" className="is-primary" onClick={() => setIsEditing(true)}>
                編輯菜單
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// Drawn with the same outline stroke as DishIcon.
function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7.5 10.5v9.5" />
      <path d="M7.5 10.5 11 4c1.7 0 2.7 1.4 2.3 3l-.8 3.5h5.6a2 2 0 0 1 1.9 2.6l-1.9 6.3A2 2 0 0 1 16.2 21H4.5a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function DishIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z" />
      <path d="M8 20h8" />
      <path d="M9 8.5c0-1.5 1.5-1.5 1.5-3M13.5 8.5c0-1.5 1.5-1.5 1.5-3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* 餐具：白色的叉子與餐刀，握柄是黃色。 */}
      <path
        className="menu-icon-metal"
        d="M4 2.6a.8.8 0 0 1 1.6 0V7h1V2.6a.8.8 0 0 1 1.6 0V7h1V2.6a.8.8 0 0 1 1.6 0V9a3.4 3.4 0 0 1-2.4 3.25V13H6.4v-.75A3.4 3.4 0 0 1 4 9z"
      />
      <rect className="menu-icon-handle" x="5.6" y="12.4" width="3.6" height="9.4" rx="1.8" />
      <path
        className="menu-icon-metal"
        d="M16.6 2.2c2.6 1.2 3.8 4.6 3.8 8.6V13h-4.6V2.8a.6.6 0 0 1 .8-.6z"
      />
      <rect className="menu-icon-handle" x="15.8" y="12.4" width="3.6" height="9.4" rx="1.8" />
    </svg>
  );
}

function TravelSegment({ segment, from, to, note = "" }) {
  const fromName = from.name;
  const toName = to.name;
  const estimate = estimateRoadTrip(from, to);
  const travelMode = getTravelMode(note);
  const prefersFlight = travelMode === "flight";
  const prefersWalking = travelMode === "walking";
  const prefersTransit = travelMode === "transit";
  const transitLabel = segment?.transit
    ? `搭車約 ${segment.transit.duration}`
    : `搭車約 ${estimateTransitTime(from, to)}`;
  const walkingLabel = segment?.walking?.duration
    ? `走路約 ${segment.walking.duration}`
    : "走路時間請至 Google Maps 查看";
  const summaryLabel = prefersFlight
    ? `飛行時間 ${estimateFlightTime(from, to)}`
    : prefersWalking
      ? walkingLabel
    : prefersTransit
      ? transitLabel
      : `開車約 ${segment?.driving?.duration ?? estimate.duration}`;
  const drivingUrl = makeGoogleDirectionsUrl(from, to, "driving");
  const transitUrl = makeGoogleDirectionsUrl(from, to, "transit");
  const walkingUrl = makeGoogleDirectionsUrl(from, to, "walking");
  return (
    <li className="planner-travel-segment" aria-label={`${fromName}到${toName}的交通資訊`}>
      <div className="planner-travel-content">
        <p>
          <span>前往</span>
          <b>{toName}</b>
        </p>
        {!segment && (
          <small className="planner-travel-message">儲存後更新交通時間</small>
        )}
        {segment?.status === "loading" && (
          <small className="planner-travel-message">正在查詢交通時間…</small>
        )}
        {segment?.status === "error" && (
          <div className="planner-travel-fallback">
            <section className="planner-driving-option">
              <span aria-hidden="true">{prefersFlight ? <FlightPlaneIcon /> : prefersWalking ? <WalkingIcon /> : prefersTransit ? <TransitTrainIcon /> : <DrivingCarIcon />}</span>
              <div>
                <strong>{prefersFlight ? `飛行時間 ${estimateFlightTime(from, to)}` : prefersWalking ? walkingLabel : prefersTransit ? transitLabel : `開車 ${estimate.duration}`}</strong>
                {prefersWalking && segment?.walking?.distance && <small>{segment.walking.distance}</small>}
                {!prefersFlight && !prefersWalking && !prefersTransit && <small>{estimate.distance}</small>}
              </div>
            </section>
            {/* A flight only needs its flying time; road links don't apply. */}
            {!prefersFlight && (
            <div className="planner-route-links">
              {!prefersTransit && (
                <a href={drivingUrl} target="_blank" rel="noreferrer">開車路線 ↗</a>
              )}
              {prefersWalking && <a href={walkingUrl} target="_blank" rel="noreferrer">步行路線 ↗</a>}
              <a href={transitUrl} target="_blank" rel="noreferrer">大眾運輸 ↗</a>
              <a
                className="is-jartic"
                href={JARTIC_URL}
                target="_blank"
                rel="noreferrer"
                title="手機會由 JARTIC 自動顯示行動版"
              >
                即時路況 ↗
              </a>
            </div>
            )}
          </div>
        )}
        {segment?.status === "ready" && (
          <div className="planner-travel-options">
            <section className="planner-driving-option">
              <span aria-hidden="true">{prefersFlight ? <FlightPlaneIcon /> : prefersWalking ? <WalkingIcon /> : prefersTransit ? <TransitTrainIcon /> : <DrivingCarIcon />}</span>
              <div>
                <strong>{summaryLabel}</strong>
                {prefersWalking && segment.walking?.distance && <small>{segment.walking.distance}</small>}
                {!prefersFlight && !prefersWalking && !prefersTransit && (
                  <small>{segment.driving?.distance ?? estimate.distance}</small>
                )}
              </div>
            </section>
          </div>
        )}
        {segment?.status !== "error" && !prefersTransit && !prefersFlight && !prefersWalking && (
          <div className="planner-road-links">
            <a
              className="is-google"
              href={drivingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps ↗
            </a>
            <a
              className="is-jartic"
              href={JARTIC_URL}
              target="_blank"
              rel="noreferrer"
              title="手機會由 JARTIC 自動顯示行動版"
            >
              即時路況 ↗
            </a>
          </div>
        )}
        {segment?.status !== "error" && prefersTransit && (
          <div className="planner-route-links">
            <a href={transitUrl} target="_blank" rel="noreferrer">
              Google Maps ↗
            </a>
            <a
              className="is-jartic"
              href={JARTIC_URL}
              target="_blank"
              rel="noreferrer"
              title="手機會由 JARTIC 自動顯示行動版"
            >
              即時路況 ↗
            </a>
          </div>
        )}
        {segment?.status !== "error" && prefersWalking && (
          <div className="planner-route-links">
            <a href={walkingUrl} target="_blank" rel="noreferrer">Google Maps 步行路線 ↗</a>
          </div>
        )}
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
          即時路況
          <i>↗</i>
        </a>
      </div>
    </section>
  );
}

function Planner() {
  const { user, syncSpaceId, syncVersion, tripName } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [searchParams] = useSearchParams();
  const linkedVersionAppliedRef = useRef("");
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
  const dayPickerRef = useRef(null);
  const [draggedDayId, setDraggedDayId] = useState(null);
  const [dragOverDayId, setDragOverDayId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [locating, setLocating] = useState({});
  // A located stop briefly shows 「✓ 已定位」, since a built-in place resolves
  // instantly and the map may not visibly change.
  const [justLocated, setJustLocated] = useState({});
  // Stops the free maps couldn't find wait here, keyed by item id, while their
  // coordinates are looked up; the locate button shows 「定位中…」 meanwhile.
  const [pendingLookups, setPendingLookups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_LOOKUPS_KEY)) ?? {};
    } catch {
      return {};
    }
  });
  const [locationErrors, setLocationErrors] = useState({});
  const [travelSegments, setTravelSegments] = useState({});
  const [cloudLoadedFor, setCloudLoadedFor] = useState(null);
  const [saveRequest, setSaveRequest] = useState(0);
  const [plannerSaveStatus, setPlannerSaveStatus] = useState("");
  const [dayPendingDelete, setDayPendingDelete] = useState(null);
  const [menuItemId, setMenuItemId] = useState(null);
  const [cloudMenus, setCloudMenus] = useState({});
  const getItemMenu = (item) => {
    const saved = cloudMenus[item.id] ?? item.menu;
    return saved?.length ? saved : findPresetMenu(item.text) ?? saved;
  };
  const initialCloudDataRef = useRef({ days, activeDayId });
  const lastCloudKeyRef = useRef(null);
  const localEditPendingRef = useRef(false);
  // Set by the 儲存 button so the next successful cloud save also keeps a
  // copy of the trip as today's backup.
  const backupRequestedRef = useRef(false);
  const [backupList, setBackupList] = useState(null);
  const itemDraftsRef = useRef(loadItemDrafts());
  const [, setDraftRevision] = useState(0);

  useEffect(() => {
    const dayId = searchParams.get("day");
    const versionId = searchParams.get("version");
    const linkKey = `${dayId ?? ""}:${versionId ?? ""}`;
    if (!dayId || linkedVersionAppliedRef.current === linkKey) return;
    const linkedDay = days.find((day) => day.id === dayId);
    if (!linkedDay) return;
    linkedVersionAppliedRef.current = linkKey;
    setActiveDayId(dayId);
    if (!versionId) return;
    setDays((currentDays) =>
      currentDays.map((day) => {
        if (day.id !== dayId) return day;
        const version = day.versions?.find((entry) => entry.id === versionId);
        return version
          ? { ...day, activeVersionId: versionId, items: version.items }
          : day;
      }),
    );
  }, [days, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setCloudLoadedFor(null);
    if (!cloudKey) return () => {
      cancelled = true;
    };
    // Switching to another sync code must show that code's data, never carry
    // the current one over, even when the switch happened on another page.
    const previousSpace =
      lastCloudKeyRef.current ?? localStorage.getItem(PLANNER_SPACE_STORAGE_KEY);
    const isSwitchingSpace = previousSpace !== null && previousSpace !== cloudKey;
    if (isSwitchingSpace) localEditPendingRef.current = false;

    const loadCloudData = async () => {
      window.dispatchEvent(
        new CustomEvent("cloud-sync-status", { detail: "loading" }),
      );
      try {
        const cloud = await loadPlannerCloud(cloudKey);
        if (cancelled) return;
        lastCloudKeyRef.current = cloudKey;
        localStorage.setItem(PLANNER_SPACE_STORAGE_KEY, cloudKey);
        const localData = initialCloudDataRef.current;
        const cloudHasContent =
          Array.isArray(cloud?.days) &&
          cloud.days.length > 0 &&
          hasPlannerContent(cloud.days);
        const localHasContent = hasPlannerContent(localData.days);

        if (cloudHasContent) {
          const cloudDays = cloud.days.map(normalizePlannerDay);
          setDays(cloudDays);
          setActiveDayId((currentId) =>
            cloudDays.some((day) => day.id === currentId)
              ? currentId
              : cloudDays[0].id,
          );
        } else if (isSwitchingSpace) {
          const emptyDays = [makeDay(1), makeDay(2), makeDay(3)];
          setDays(emptyDays);
          setActiveDayId(emptyDays[0].id);
        } else if (localHasContent || !cloud) {
          await savePlannerCloud(cloudKey, { days: localData.days });
        }
        if (!cancelled) {
          setCloudLoadedFor(cloudKey);
          window.dispatchEvent(
            new CustomEvent("cloud-sync-status", { detail: "success" }),
          );
        }
      } catch (error) {
        console.error("無法載入雲端行程", error);
        if (!cancelled) {
          window.dispatchEvent(
            new CustomEvent("cloud-sync-status", { detail: "error" }),
          );
        }
      }
    };

    loadCloudData();
    return () => {
      cancelled = true;
    };
  }, [cloudKey, syncVersion]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_DAY_STORAGE_KEY, activeDayId);
  }, [activeDayId]);

  useEffect(() => {
    if (!cloudKey || cloudLoadedFor !== cloudKey || saveRequest === 0) return;
    const backupRequested = backupRequestedRef.current;
    backupRequestedRef.current = false;
    savePlannerCloud(cloudKey, { days })
      .then(async () => {
        localEditPendingRef.current = false;
        setPlannerSaveStatus("已儲存");
        if (backupRequested) {
          try {
            await saveDailyBackupCloud(cloudKey, getLocalDateKey(), { days, menus: cloudMenus });
            setPlannerSaveStatus("已儲存，今天的備份已更新");
          } catch (error) {
            console.error("無法建立備份", error);
            setPlannerSaveStatus("已儲存，但備份失敗");
          }
        }
        window.dispatchEvent(
          new CustomEvent("cloud-sync-status", { detail: "success" }),
        );
      })
      .catch((error) => {
        console.error("無法儲存雲端行程", error);
        setPlannerSaveStatus("已儲存在此裝置，雲端同步失敗");
        window.dispatchEvent(
          new CustomEvent("cloud-sync-status", { detail: "error" }),
        );
      });
  }, [saveRequest, cloudKey, cloudLoadedFor]);

  useEffect(() => {
    if (!cloudKey) return undefined;
    return subscribePlannerCloud(
      cloudKey,
      (cloud) => {
        if (localEditPendingRef.current) return;
        if (!Array.isArray(cloud?.days) || !cloud.days.length) return;
        lastCloudKeyRef.current = cloudKey;
        localStorage.setItem(PLANNER_SPACE_STORAGE_KEY, cloudKey);
        setCloudLoadedFor(cloudKey);
        setDays((currentDays) => {
          const nextDays = cloud.days.map(normalizePlannerDay);
          return JSON.stringify(currentDays) === JSON.stringify(nextDays)
            ? currentDays
            : nextDays;
        });
        setActiveDayId((currentId) =>
          cloud.days.some((day) => day.id === currentId)
            ? currentId
            : cloud.days[0].id,
        );
        window.dispatchEvent(
          new CustomEvent("cloud-sync-status", { detail: "success" }),
        );
      },
      (error) => {
        console.error("無法即時接收雲端行程", error);
        window.dispatchEvent(
          new CustomEvent("cloud-sync-status", { detail: "error" }),
        );
      },
    );
  }, [cloudKey]);

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

  // Keep the chosen DAY tab in the middle of the strip.
  useEffect(() => {
    const picker = dayPickerRef.current;
    const tab = picker?.querySelector(".planner-day-tab.is-active");
    if (!picker || !tab) return;
    // Jump rather than glide: the day board below scrolls smoothly at the
    // same moment, and Chrome cancels one smooth scroll when another starts.
    picker.scrollTo({
      left: tab.offsetLeft - (picker.clientWidth - tab.offsetWidth) / 2,
      behavior: "instant",
    });
  }, [activeDayId, days.length]);

  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const items = activeDay.items;
  const routeMapTitle = `DAY ${Math.max(days.indexOf(activeDay), 0) + 1} 路線地圖`;
  const setItems = (updater) =>
    (localEditPendingRef.current = true,
    setDays((current) =>
      current.map((day) => {
        if (day.id !== activeDayId) return day;
        const nextItems =
          typeof updater === "function" ? updater(day.items) : updater;
        return syncActiveVersionItems(day, nextItems);
      }),
    ));
  const updateDay = (dayId, patch) => {
    localEditPendingRef.current = true;
    if (Object.hasOwn(patch, "date")) updateLodgingStayDate(dayId, patch.date);
    setDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    );
  };

  const getDayVersions = (day) =>
    Array.isArray(day.versions) && day.versions.length
      ? day.versions.map((version, index) => ({
          ...version,
          label: versionLabel(index),
        }))
      : [{ id: "version-1", label: versionLabel(0), items: day.items }];

  const switchDayVersion = (versionId) => {
    localEditPendingRef.current = true;
    const drafts = new Map(itemDraftsRef.current);
    const currentItems = items.map((item) =>
      drafts.has(item.id) ? withItemText(item, drafts.get(item.id)) : item,
    );
    items.forEach((item) => itemDraftsRef.current.delete(item.id));
    persistItemDrafts(itemDraftsRef.current);
    setDays((currentDays) =>
      currentDays.map((day) => {
        if (day.id !== activeDayId) return day;
        const versions = getDayVersions(day).map((version) =>
          version.id === (day.activeVersionId ?? "version-1")
            ? { ...version, items: currentItems }
            : version,
        );
        const selected = versions.find((version) => version.id === versionId);
        return selected
          ? { ...day, versions, activeVersionId: versionId, items: selected.items }
          : day;
      }),
    );
  };

  const addDayVersion = () => {
    localEditPendingRef.current = true;
    const drafts = new Map(itemDraftsRef.current);
    const currentItems = items.map((item) =>
      drafts.has(item.id) ? withItemText(item, drafts.get(item.id)) : item,
    );
    items.forEach((item) => itemDraftsRef.current.delete(item.id));
    persistItemDrafts(itemDraftsRef.current);
    setDays((currentDays) =>
      currentDays.map((day) => {
        if (day.id !== activeDayId) return day;
        const versions = getDayVersions(day).map((version) =>
          version.id === (day.activeVersionId ?? "version-1")
            ? { ...version, items: currentItems }
            : version,
        );
        const nextItems = currentItems.map((item) => ({
          ...item,
          id: globalThis.crypto?.randomUUID?.() ?? makeVersionId(),
        }));
        const nextVersion = {
          id: makeVersionId(),
          label: versionLabel(versions.length),
          items: nextItems.length ? nextItems : [makeItem()],
        };
        return {
          ...day,
          versions: [...versions, nextVersion],
          activeVersionId: nextVersion.id,
          items: nextVersion.items,
        };
      }),
    );
  };

  const removeDayVersion = () => {
    const versions = getDayVersions(activeDay);
    if (versions.length <= 1) return;
    localEditPendingRef.current = true;
    setDays((currentDays) =>
      currentDays.map((day) => {
        if (day.id !== activeDayId) return day;
        const activeVersionId = day.activeVersionId ?? "version-1";
        const nextVersions = getDayVersions(day).filter(
          (version) => version.id !== activeVersionId,
        );
        const nextVersion = nextVersions[0];
        return {
          ...day,
          versions: nextVersions,
          activeVersionId: nextVersion.id,
          items: nextVersion.items,
        };
      }),
    );
  };

  const addDay = () => {
    localEditPendingRef.current = true;
    const previousDate = days.at(-1)?.date;
    const date = previousDate ? new Date(`${previousDate}T00:00:00`) : null;
    if (date && !Number.isNaN(date.getTime())) date.setDate(date.getDate() + 1);
    const nextDay = {
      ...makeDay(days.length + 1),
      id: `day-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: date ? toDateInputValue(date) : "",
    };
    setDays((current) => [...current, nextDay]);
    setPlannerSaveStatus(cloudKey ? "正在同步新增的 DAY…" : "已儲存在此裝置");
    setSaveRequest((request) => request + 1);
    setActiveDayId(nextDay.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const removeDay = (dayId) => {
    if (days.length <= 1) return;
    localEditPendingRef.current = true;
    const removedIndex = days.findIndex((day) => day.id === dayId);
    const nextDays = days.filter((day) => day.id !== dayId);
    const nextActive = activeDayId === dayId
      ? nextDays[Math.min(Math.max(removedIndex - 1, 0), nextDays.length - 1)]
      : days.find((day) => day.id === activeDayId);
    removeLodgingsForDay(dayId);
    setDays(nextDays);
    setPlannerSaveStatus(cloudKey ? "正在同步 DAY 變更…" : "已儲存在此裝置");
    setSaveRequest((request) => request + 1);
    if (nextActive) setActiveDayId(nextActive.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  // 刪除整天前先確認，避免誤按日期選擇器或 × 就把一整天的行程刪掉。
  const requestRemoveDay = (dayId) => {
    if (days.length <= 1) return;
    setDayPendingDelete(dayId);
  };

  const confirmRemoveDay = () => {
    if (dayPendingDelete) removeDay(dayPendingDelete);
    setDayPendingDelete(null);
  };


  useEffect(() => {
    if (!dayPendingDelete) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDayPendingDelete(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dayPendingDelete]);

  const dropDay = (targetDayId) => {
    if (!draggedDayId || draggedDayId === targetDayId) {
      setDraggedDayId(null);
      setDragOverDayId(null);
      return;
    }

    localEditPendingRef.current = true;
    setDays((currentDays) => {
      const from = currentDays.findIndex((day) => day.id === draggedDayId);
      const to = currentDays.findIndex((day) => day.id === targetDayId);
      if (from < 0 || to < 0) return currentDays;
      const nextDays = [...currentDays];
      const [movedDay] = nextDays.splice(from, 1);
      nextDays.splice(to, 0, movedDay);
      return nextDays;
    });
    setPlannerSaveStatus(cloudKey ? "正在同步 DAY 順序…" : "已儲存在此裝置");
    setSaveRequest((request) => request + 1);
    setDraggedDayId(null);
    setDragOverDayId(null);
  };

  const [mapFocus, setMapFocus] = useState(null);
  const plannedStops = useMemo(
    () =>
      items
        .map((item, index) => {
          const town = resolveItemLocation(item);
          return town ? { item, town, order: index + 1 } : null;
        })
        .filter(Boolean),
    [items],
  );

  // The shape of each leg between consecutive pins; null draws it straight.
  const routePaths = useMemo(
    () =>
      plannedStops.slice(0, -1).map((stop, index) => {
        const next = plannedStops[index + 1];
        if (next.order !== stop.order + 1) return null;
        return getTravelPath(travelSegments[stop.item.id], getTravelMode(stop.item.text));
      }),
    [plannedStops, travelSegments],
  );

  const travelPairs = useMemo(
    () =>
      items.slice(0, -1).flatMap((item, index) => {
        const nextItem = items[index + 1];
        const from = resolveItemLocation(item);
        const to = resolveItemLocation(nextItem);
        if (!from || !to) return [];
        return [{
          id: `${item.id}--${nextItem.id}`,
          fromItemId: item.id,
          from,
          to,
          needsWalking: WALKING_NOTE_PATTERN.test(item.text),
          needsTransit: TRANSIT_NOTE_PATTERN.test(item.text),
        }];
      }),
    [items],
  );
  const travelPairsRef = useRef(travelPairs);
  const travelPairsKey = travelPairs
    .map((pair) =>
      [
        pair.needsWalking,
        pair.needsTransit,
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

    const loadSegments = async () => {
      for (const pair of currentTravelPairs) {
        const driving = await requestRoute(pair.from, pair.to, "driving").catch(() => null);
        const walking = pair.needsWalking
          ? await requestRoute(pair.from, pair.to, "walking").catch(() => null)
          : null;
        const transit = pair.needsTransit
          ? await requestTransitTime(pair.from, pair.to).catch(() => null)
          : null;
        if (cancelled) return;
        setTravelSegments((current) => ({
          ...current,
          [pair.fromItemId]: {
            status: driving || walking || transit ? "ready" : "error",
            driving,
            walking,
            transit,
          },
        }));
      }
    };
    loadSegments();

    return () => {
      cancelled = true;
    };
  }, [travelPairsKey]);

  const saveAllItemDrafts = () => {
    backupRequestedRef.current = true;
    const drafts = new Map(itemDraftsRef.current);
    const itemsToLocate = items
      .filter((item) => drafts.has(item.id))
      .map((item) => ({
        ...item,
        text: drafts.get(item.id),
        // The old pin belongs to the old text.
        location: drafts.get(item.id) === item.text ? item.location : undefined,
      }))
      .filter((item) => item.text.trim());
    localEditPendingRef.current = true;
    if (drafts.size) {
      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === activeDayId
            ? syncActiveVersionItems(
                day,
                day.items.map((item) =>
                  drafts.has(item.id)
                    ? withItemText(item, drafts.get(item.id))
                    : item,
                ),
              )
            : day,
        ),
      );
      items.forEach((item) => itemDraftsRef.current.delete(item.id));
      persistItemDrafts(itemDraftsRef.current);
      itemsToLocate.forEach((item) => locateItem(item));
    }
    setPlannerSaveStatus(cloudKey ? "已儲存，正在同步…" : "已儲存在此裝置");
    setSaveRequest((request) => request + 1);
  };
  const applyLocatedItem = (itemId, location, locatedText = "", dayId = activeDayId) => {
    localEditPendingRef.current = true;
    setDays((current) =>
      current.map((day) => {
        if (day.id !== dayId) return day;
        return syncActiveVersionItems(
          day,
          day.items.map((candidate) =>
            candidate.id === itemId
              ? {
                  ...candidate,
                  ...(locatedText ? { text: locatedText } : {}),
                  location,
                }
              : candidate,
          ),
        );
      }),
    );
    itemDraftsRef.current.delete(itemId);
    persistItemDrafts(itemDraftsRef.current);
    setJustLocated((current) => ({ ...current, [itemId]: true }));
    window.setTimeout(() => setJustLocated((current) => ({ ...current, [itemId]: false })), 1600);
    setPendingLookups((current) => withoutKey(current, itemId));
    setPlannerSaveStatus(cloudKey ? "定位完成，正在同步…" : "定位完成");
    setSaveRequest((request) => request + 1);
  };
  // Keep waiting lookups across reloads, and apply each one as soon as its
  // place is known: written back to the queue by the lookup job (live, no
  // reload needed) or already among the built-in places after an update.
  useEffect(() => {
    try {
      localStorage.setItem(PENDING_LOOKUPS_KEY, JSON.stringify(pendingLookups));
    } catch {
      // 無法儲存時只影響重新整理後的「定位中…」顯示。
    }
  }, [pendingLookups]);
  const [lookedUpPlaces, setLookedUpPlaces] = useState({});
  const hasPendingLookups = Object.keys(pendingLookups).length > 0;
  useEffect(() => {
    if (!user || !hasPendingLookups) return undefined;
    return subscribeUnlocatedPlaces(setLookedUpPlaces, (error) =>
      console.error("無法讀取待補地點", error),
    );
  }, [user, hasPendingLookups]);
  useEffect(() => {
    Object.entries(pendingLookups).forEach(([itemId, { query, dayId }]) => {
      const day = days.find((candidate) => candidate.id === dayId);
      const item = day?.items.find((candidate) => candidate.id === itemId);
      // The stop was removed or renamed: stop waiting for it.
      if (!item || getLocationQuery(item.text) !== query) {
        setPendingLookups((current) => withoutKey(current, itemId));
        return;
      }
      const found =
        findNamedPlaceForText(item.text) ??
        Object.values(lookedUpPlaces).find(
          (place) => place.query === query && Number.isFinite(place.latitude),
        );
      if (!found) return;
      const location = found.id
        ? found
        : {
            id: `lookup-${found.latitude.toFixed(5)},${found.longitude.toFixed(5)}`,
            name: found.name || query,
            latitude: found.latitude,
            longitude: found.longitude,
            displayName: found.displayName || "",
            query,
            types: found.types ?? [],
            website: "",
          };
      applyLocatedItem(itemId, location, "", dayId);
    });
    // applyLocatedItem changes on every render; the inputs above decide when to run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLookups, lookedUpPlaces, days]);
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
      applyLocatedItem(item.id, namedPlace, item.text);
      return;
    }
    setLocating((current) => ({ ...current, [item.id]: true }));
    setLocationErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const location = await geocodeJapanesePlace(item.text);
      if (!location) {
        // The search can miss a place it found before (the free maps change and
        // rate-limit); a stop that already has its pin keeps it.
        if (item.location) {
          setJustLocated((current) => ({ ...current, [item.id]: true }));
          window.setTimeout(() => setJustLocated((current) => ({ ...current, [item.id]: false })), 1600);
          return;
        }
        const fallbackTown = findTownForText(item.text);
        if (fallbackTown) {
          applyLocatedItem(item.id, fallbackTown, item.text);
          return;
        }
        setPendingLookups((current) => ({
          ...current,
          [item.id]: { query: getLocationQuery(item.text), dayId: activeDayId },
        }));
        reportUnlocatedPlace(getLocationQuery(item.text), item.text).catch((error) =>
          console.error("無法送出待補地點", error),
        );
        return;
      }
      if (isLodgingStay(location, item.text)) {
        saveLodging(location, activeDay, item.id);
      } else if (CHECKOUT_PATTERN.test(item.text)) {
        removeLodging(location.id, activeDayId, item.id);
      }
      applyLocatedItem(item.id, location, item.text);
    } catch (error) {
      setLocationErrors((current) => ({
        ...current,
        [item.id]: getGeocodingErrorMessage(error),
      }));
    } finally {
      setLocating((current) => ({ ...current, [item.id]: false }));
    }
  };
  const locateCurrentItem = (item) => {
    const draftText = itemDraftsRef.current.get(item.id) ?? item.text;
    if (!draftText.trim()) return;
    if (draftText !== item.text) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? withItemText(candidate, draftText)
            : candidate,
        ),
      );
      itemDraftsRef.current.delete(item.id);
      persistItemDrafts(itemDraftsRef.current);
    }
    // An edited stop may now be a different place, so its old pin doesn't count.
    locateItem({
      ...item,
      text: draftText,
      location: draftText === item.text ? item.location : undefined,
    });
  };
  const removeItem = (id) => {
    const item = items.find((candidate) => candidate.id === id);
    const lodgingLocation = item?.location ?? findNamedPlaceForText(item?.text ?? "");
    // 即使地點後來被重新判定為非住宿，也要清除先前已收錄的住宿資料。
    removeLodging(lodgingLocation?.id, activeDayId, item.id);
    itemDraftsRef.current.delete(id);
    persistItemDrafts(itemDraftsRef.current);
    setItems((current) => current.filter((item) => item.id !== id));
  };
  const addItem = (text = "") =>
    setItems((current) => [...current, makeItem(text)]);

  const openBackupList = () => {
    if (!cloudKey) return;
    setBackupList({ status: "loading", backups: [], restoreId: null });
    listBackupsCloud(cloudKey)
      .then((backups) => setBackupList({ status: "ready", backups, restoreId: null }))
      .catch((error) => {
        console.error("無法讀取備份", error);
        setBackupList({ status: "error", backups: [], restoreId: null });
      });
  };
  const restoreBackup = async (backup) => {
    if (!cloudKey || !Array.isArray(backup?.days) || !backup.days.length) return;
    const restoredDays = backup.days.map(normalizePlannerDay);
    localEditPendingRef.current = true;
    setDays(restoredDays);
    setActiveDayId(restoredDays[0].id);
    setCloudMenus(backup.menus ?? {});
    setBackupList(null);
    setPlannerSaveStatus(`已還原 ${backup.id} 的備份，正在同步…`);
    setSaveRequest((request) => request + 1);
    try {
      await replaceMenusCloud(cloudKey, backup.menus ?? {});
    } catch (error) {
      console.error("無法還原菜單", error);
      setPlannerSaveStatus("行程已還原，但菜單同步失敗");
    }
  };

  const saveItemMenu = (itemId, menu) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, menu } : item)),
    );
    setCloudMenus((current) => ({ ...current, [itemId]: menu }));
    setPlannerSaveStatus(cloudKey ? "菜單已儲存，正在同步…" : "菜單已儲存在此裝置");
    setSaveRequest((request) => request + 1);
    if (cloudKey) {
      saveMenuCloud(cloudKey, itemId, menu).catch((error) => {
        console.error("無法同步菜單", error);
        setPlannerSaveStatus("菜單已儲存在此裝置，雲端同步失敗");
      });
    }
  };

  useEffect(() => {
    setCloudMenus({});
    if (!cloudKey) return undefined;
    return subscribeMenusCloud(
      cloudKey,
      (menus) => setCloudMenus(menus),
      (error) => console.error("無法即時接收菜單", error),
    );
  }, [cloudKey]);

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
      <section className="planner-workspace">
        <div className="planner-map-card">
          <div className="planner-card-title">
            <div>
              <h2>
                <em className="planner-title-day">
                  DAY {Math.max(days.indexOf(activeDay), 0) + 1}
                </em>{" "}
                路線地圖
              </h2>
            </div>
          </div>
          <div className="planner-map-stage has-route-map">
            <RouteMap stops={plannedStops} paths={routePaths} label={routeMapTitle} focus={mapFocus} />
          </div>
          <p className="planner-map-hint">
          </p>
        </div>

        <aside className="planner-list-card">
          <div className="planner-card-title">
            <div>
              <h2>
                {/* A named trip shows its name in place of the day count. */}
                <em className="planner-title-day">{tripName || `${days.length} 天行程表`}</em>
              </h2>
            </div>
          </div>
          <nav className="planner-day-picker" aria-label="選擇行程天數" ref={dayPickerRef}>
            {days.map((day, dayIndex) => {
              const active = day.id === activeDayId;
              return (
                <div
                  className={`planner-day-tab ${active ? "is-active" : ""} ${draggedDayId === day.id ? "is-dragging" : ""} ${dragOverDayId === day.id && draggedDayId !== day.id ? "is-drag-over" : ""}`}
                  key={day.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverDayId(day.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dropDay(day.id);
                  }}
                >
                  <button
                    type="button"
                    className="planner-day-tab-select"
                    draggable
                    aria-pressed={active}
                    aria-label={`DAY ${dayIndex + 1}，按住拖曳可調整順序`}
                    title="按住拖曳可調整 DAY 順序"
                    onClick={() => setActiveDayId(day.id)}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", day.id);
                      setDraggedDayId(day.id);
                    }}
                    onDragEnd={() => {
                      setDraggedDayId(null);
                      setDragOverDayId(null);
                    }}
                  >
                    DAY {dayIndex + 1}
                  </button>
                </div>
              );
            })}
            <div
              className="planner-day-inline-actions"
              role="group"
              aria-label="調整行程天數"
            >
              <button
                type="button"
                className="planner-add-day-button"
                onClick={addDay}
                aria-label="增加一天"
              />
            </div>
          </nav>
          <div
            ref={dayBoardRef}
            className="planner-day-board"
            role="tablist"
            aria-label="三天行程表"
          >
            {days
              .filter((day) => day.id === activeDayId)
              .map((day) => {
              const dayIndex = days.findIndex((entry) => entry.id === day.id);
              const active = true;
              const dayVersions = getDayVersions(day);
              const activeVersionId = day.activeVersionId ?? dayVersions[0].id;
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
                    className="planner-day-delete"
                    type="button"
                    aria-label={`刪除 DAY ${dayIndex + 1}`}
                    title={`刪除 DAY ${dayIndex + 1}`}
                    disabled={days.length <= 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      requestRemoveDay(day.id);
                    }}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
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
                        />
                      </div>
                    ) : (
                      <b>{formatItineraryDate(day.date)}</b>
                    )}
                  </div>
                  <div className="planner-version-picker" aria-label="行程版本">
                    <span>行程版本</span>
                    <div>
                      {dayVersions.map((version) => (
                        <button
                          type="button"
                          className={
                            version.id === activeVersionId ? "is-active" : ""
                          }
                          key={version.id}
                          onClick={() => switchDayVersion(version.id)}
                        >
                          {version.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="is-version-action"
                        onClick={addDayVersion}
                        aria-label="新增行程版本"
                      >
                        ＋
                      </button>
                      <button
                        type="button"
                        className="is-version-action"
                        onClick={removeDayVersion}
                        disabled={dayVersions.length <= 1}
                        aria-label="刪除目前行程版本"
                      >
                        −
                      </button>
                    </div>
                  </div>
                  {active ? (
                    <>
                      <ol className="planner-list">
                        {items.map((item, index) => {
                          const itemDraft = itemDraftsRef.current.get(item.id);
                          const resolvedLocation = resolveItemLocation(item, itemDraft);
                          const nextItem = items[index + 1];
                          const nextDraft = nextItem && itemDraftsRef.current.get(nextItem.id);
                          const nextLocation = nextItem
                            ? resolveItemLocation(nextItem, nextDraft)
                            : null;
                          // Fetched routes follow the saved text; while either end
                          // has unsaved edits, fall back to the rough estimate.
                          const hasUnsavedEnds =
                            (itemDraft !== undefined && itemDraft !== item.text) ||
                            (nextDraft !== undefined && nextDraft !== nextItem.text);
                          const itemMotif = getItineraryMotif(resolvedLocation, item.text);
                          return (
                            <Fragment key={item.id}>
                            <li
                              className={dragOverId === item.id ? "is-drag-over" : ""}
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
                                className="planner-drag-handle planner-stop-tag"
                                type="button"
                                draggable
                                onDragStart={() => setDraggedId(item.id)}
                                onClick={() => {
                                  // A stop with no pin yet gets located first.
                                  if (!plannedStops.some((stop) => stop.item.id === item.id)) {
                                    locateCurrentItem(item);
                                    return;
                                  }
                                  setMapFocus({ itemId: item.id });
                                }}
                                aria-label={`第 ${index + 1} 站，點擊在地圖上顯示，拖曳調整順序`}
                                title="點擊在地圖上顯示・拖曳調整順序"
                              >
                                <span>{String(index + 1).padStart(2, "0")}</span>
                              </button>
                              <div className="planner-item-copy">
                                <div className="planner-item-meta">
                                  <b>
                                    {itemMotif && (
                                      <span
                                        className={`planner-item-category-icon ${itemMotif === "chairlift" ? "is-wide" : ""} ${["skiTow", "rental", "park"].includes(itemMotif) ? "is-small" : ""} ${["parking", "tempura", "michiNoEki"].includes(itemMotif) ? "is-compact" : ""}`}
                                        title={getItineraryMotifLabel(itemMotif)}
                                      >
                                        <HandDrawnMotif type={itemMotif} />
                                      </span>
                                    )}
                                  </b>
                                  {resolvedLocation ? (
                                    <>
                                      <div className="planner-meta-actions-group">
                                        <button
                                          className={`planner-locate planner-icon-locate ${locating[item.id] || pendingLookups[item.id] || justLocated[item.id] ? "is-locating" : ""} ${justLocated[item.id] ? "is-located" : ""}`}
                                          type="button"
                                          aria-label="重新定位"
                                          data-tooltip={locating[item.id] || pendingLookups[item.id] ? undefined : "重新定位"}
                                          disabled={locating[item.id]}
                                          onClick={() => locateCurrentItem(item)}
                                        >
                                          {locating[item.id] || pendingLookups[item.id] ? (
                                            "定位中…"
                                          ) : justLocated[item.id] ? (
                                            "✓ 已定位"
                                          ) : (
                                            <span className="planner-locate-icon" aria-hidden="true">⌖</span>
                                          )}
                                        </button>
                                        {((isFoodLocation(resolvedLocation) && itemMotif !== "chairlift" && itemMotif !== "skiTow") ||
                                          // A shop like ハセガワストア is not tagged as a restaurant
                                          // on the map, but its food icon shows it sells meals.
                                          FOOD_MOTIFS.has(itemMotif) ||
                                          getItemMenu(item)?.length > 0) && (
                                          <button
                                            className={`planner-locate planner-menu-btn ${getItemMenu(item)?.length ? "has-menu" : ""}`}
                                            type="button"
                                            aria-label="菜單"
                                            data-tooltip="菜單"
                                            onClick={() => setMenuItemId(item.id)}
                                          >
                                            <MenuIcon />
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <button
                                      className={`planner-locate planner-icon-locate ${locating[item.id] || pendingLookups[item.id] || justLocated[item.id] ? "is-locating" : ""} ${justLocated[item.id] ? "is-located" : ""}`}
                                      type="button"
                                      aria-label="定位"
                                      data-tooltip={locating[item.id] || pendingLookups[item.id] ? undefined : "定位"}
                                      disabled={locating[item.id]}
                                      onClick={() => locateCurrentItem(item)}
                                    >
                                      {locating[item.id] || pendingLookups[item.id] ? (
                                        "定位中…"
                                      ) : justLocated[item.id] ? (
                                        "✓ 已定位"
                                      ) : (
                                        <span className="planner-locate-icon" aria-hidden="true">⌖</span>
                                      )}
                                    </button>
                                  )}
                                </div>
                                <PlannerTextInput
                                  value={
                                    itemDraftsRef.current.get(item.id) ?? item.text
                                  }
                                  onDraftChange={(nextText) => {
                                    localEditPendingRef.current = true;
                                    itemDraftsRef.current.set(item.id, nextText);
                                    persistItemDrafts(itemDraftsRef.current);
                                    setDraftRevision((revision) => revision + 1);
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
                                  <span aria-hidden="true">×</span>
                                </button>
                              </div>
                            </li>
                            {resolvedLocation && nextLocation && (
                              <TravelSegment
                                key={`travel-${item.id}-${nextItem.id}`}
                                segment={hasUnsavedEnds ? undefined : travelSegments[item.id]}
                                from={resolvedLocation}
                                to={nextLocation}
                                note={itemDraftsRef.current.get(item.id) ?? item.text}
                              />
                            )}
                            </Fragment>
                          );
                        })}
                      </ol>
                      <div className="planner-bottom-actions">
                        <button
                          className="planner-add"
                          type="button"
                          onClick={() => addItem()}
                        >
                          <span>＋</span> 增加行程
                        </button>
                        <button
                          className="planner-save-all"
                          type="button"
                          onClick={saveAllItemDrafts}
                        >
                          儲存
                        </button>
                      </div>
                      <span className="planner-save-status" role="status">
                        {plannerSaveStatus}
                      </span>
                      {cloudKey && (
                        <button
                          className="planner-backup-open"
                          type="button"
                          onClick={openBackupList}
                        >
                          備份紀錄（保留最近 3 天）
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="planner-day-preview">
                      {day.items.slice(0, 1).map((item) => (
                        <div key={item.id}>
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
      {menuItemId && (() => {
        const menuItem = items.find((item) => item.id === menuItemId);
        if (!menuItem) return null;
        const menuText = itemDraftsRef.current.get(menuItem.id) ?? menuItem.text;
        const menuLocation = resolveItemLocation(menuItem, itemDraftsRef.current.get(menuItem.id));
        const title =
          menuText.split(/\r?\n/)[0].trim() || menuLocation?.name || "菜單";
        return (
          <PlannerMenuDialog
            key={menuItem.id}
            title={title}
            motif={getItineraryMotif(menuLocation, menuText)}
            mapsQuery={[menuLocation?.name ?? title, menuLocation?.displayName].filter(Boolean).join(" ")}
            initialMenu={getItemMenu(menuItem)}
            presetMenu={findPresetMenu(menuText)}
            placeId={menuItem.googlePlaceId ?? findGooglePlaceId(menuText)}
            onSave={(menu) => saveItemMenu(menuItem.id, menu)}
            onClose={() => setMenuItemId(null)}
          />
        );
      })()}
      {backupList && (
        <div className="planner-confirm-backdrop" onClick={() => setBackupList(null)}>
          <section
            className="planner-confirm planner-backup-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="planner-backup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="planner-backup-title">
              備份紀錄
              <small>按「儲存」時自動備份當天的行程，只保留最近 3 天</small>
            </h2>
            {backupList.status === "loading" && <p>正在讀取備份…</p>}
            {backupList.status === "error" && <p>讀取備份失敗，請稍後再試。</p>}
            {backupList.status === "ready" && !backupList.backups.length && (
              <p>還沒有備份。按下「儲存」後就會備份今天的行程。</p>
            )}
            {backupList.backups.length > 0 && (
              <ul className="planner-backup-list">
                {backupList.backups.map((backup) => (
                  <li key={backup.id}>
                    <div>
                      <strong>{backup.id}</strong>
                      <small>
                        {backup.savedAt
                          ? `${backup.savedAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 儲存・`
                          : ""}
                        行程共 {backup.days?.length ?? 0} 天
                      </small>
                    </div>
                    {backupList.restoreId === backup.id ? (
                      <div className="planner-backup-actions">
                        <span>目前的行程會被取代</span>
                        <button
                          type="button"
                          onClick={() => setBackupList((current) => ({ ...current, restoreId: null }))}
                        >
                          取消
                        </button>
                        <button className="is-danger" type="button" onClick={() => restoreBackup(backup)}>
                          確定還原
                        </button>
                      </div>
                    ) : (
                      <div className="planner-backup-actions">
                        <button type="button" onClick={() => downloadBackupFile(backup)}>
                          下載
                        </button>
                        <button
                          type="button"
                          onClick={() => setBackupList((current) => ({ ...current, restoreId: backup.id }))}
                        >
                          還原
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="planner-confirm-actions">
              <button type="button" autoFocus onClick={() => setBackupList(null)}>
                關閉
              </button>
            </div>
          </section>
        </div>
      )}
      {dayPendingDelete && (() => {
        const dayIndex = days.findIndex((day) => day.id === dayPendingDelete);
        const day = days[dayIndex];
        if (!day) return null;
        const itemCount = day.items.filter((item) => item.text.trim()).length;
        return (
          <div
            className="planner-confirm-backdrop"
            onClick={() => setDayPendingDelete(null)}
          >
            <section
              className="planner-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="planner-confirm-title"
              aria-describedby="planner-confirm-message"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="planner-confirm-title">
                刪除 DAY {dayIndex + 1}
                {day.date && <small>{formatItineraryDate(day.date)}</small>}
              </h2>
              <p id="planner-confirm-message">
                {itemCount
                  ? `這一天的 ${itemCount} 個行程和住宿紀錄會一起刪除，刪除後無法復原。`
                  : "這一天會被刪除，刪除後無法復原。"}
              </p>
              <div className="planner-confirm-actions">
                <button type="button" autoFocus onClick={() => setDayPendingDelete(null)}>
                  取消
                </button>
                <button className="is-danger" type="button" onClick={confirmRemoveDay}>
                  刪除
                </button>
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
}

export default Planner;
