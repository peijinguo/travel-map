import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { snowTowns } from "./Home";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import RouteMap from "../../component/RouteMap";
import { useAuth } from "../../context/AuthContext";
import {
  loadPlannerCloud,
  savePlannerCloud,
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

const getItineraryMotif = (location, itineraryText = "") => {
  const noteText = String(itineraryText);
  const placeName = String(location?.name ?? "");
  // A ski area run by a resort hotel (e.g. グリーンピア大沼) is tagged as
  // lodging by Google, so check the stop's own name before the lodging test.
  if (SKI_AREA_PATTERN.test(`${noteText.split(/\r?\n/)[0]} ${placeName}`)) return "chairlift";
  if (isLodgingLocation(location)) return "onsen";
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

const getItineraryMotifLabel = (motif) =>
  ({
    onsen: "住宿／泡湯",
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

// 行程常寫成「中文名 日文名」，整串查不到時改查名稱的前後段。
const getNameFragments = (query) => {
  const words = query.split(/\s+/).filter(Boolean);
  const fragments = [];
  for (let length = words.length - 1; length >= 1; length -= 1) {
    fragments.push(words.slice(-length).join(" "), words.slice(0, length).join(" "));
  }
  return fragments.filter((fragment) => fragment.length >= 4);
};

const getGeocodeQueries = (text) => {
  const original = getLocationQuery(text).replace(/長谷川商店|长谷川商店/gu, "ハセガワストア");
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
function findNamedPlaceForText(text) {
  const query = getLocationQuery(text);
  const normalized = normalizeText(query);
  if (!normalized) return null;
  const namesSkiArea = SKI_AREA_PATTERN.test(query);
  return (
    namedPlaces.find(
      (place) =>
        !(namesSkiArea && place.types?.includes("lodging")) &&
        place.aliases.some((alias) => normalized === normalizeText(alias)),
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
    for (const candidate of location ? [] : getGeocodeQueries(text)) {
      location = await searchJapanPlace(candidate, getLocationQuery(text));
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
  return (
    <svg className="planner-walking-icon" viewBox="0 0 48 48" aria-hidden="true">
      <g className="walking-footprint" transform="rotate(-18 16 16)">
        <ellipse cx="16" cy="22" rx="5.5" ry="9" />
        <circle cx="9.3" cy="12" r="2.5" /><circle cx="13.5" cy="9" r="2.2" /><circle cx="17.7" cy="8.2" r="2" /><circle cx="21.3" cy="9.7" r="1.7" /><circle cx="24" cy="12.3" r="1.45" />
      </g>
      <g className="walking-footprint" transform="rotate(18 31 31)">
        <ellipse cx="31" cy="37" rx="5.5" ry="9" />
        <circle cx="24.3" cy="27" r="2.5" /><circle cx="28.5" cy="24" r="2.2" /><circle cx="32.7" cy="23.2" r="2" /><circle cx="36.3" cy="24.7" r="1.7" /><circle cx="39" cy="27.3" r="1.45" />
      </g>
    </svg>
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

const makeMenuEntry = (name = "", price = "") => ({
  id: globalThis.crypto?.randomUUID?.() ?? `menu-${Date.now()}-${Math.random()}`,
  name,
  price,
});

const formatMenuPrice = (price) => {
  const digits = String(price ?? "").replace(/[^\d]/g, "");
  return digits ? `¥${Number(digits).toLocaleString("ja-JP")}` : "";
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

// A store's menu, typed in by hand from its Google Maps menu photos and
// saved with the itinerary stop so it syncs across devices.
function PlannerMenuDialog({
  title,
  mapsQuery,
  initialMenu,
  placeId,
  onSave,
  onSavePlaceId,
  onClose,
}) {
  const [entries, setEntries] = useState(() =>
    initialMenu?.length ? initialMenu : [makeMenuEntry()],
  );
  const [isEditing, setIsEditing] = useState(!initialMenu?.length);
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(!placeId);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState("");
  const listRef = useRef(null);

  const applyLink = () => {
    const nextPlaceId = findGooglePlaceId(linkDraft);
    if (!nextPlaceId) {
      setLinkError(
        /goo\.gl|app\.goo/i.test(linkDraft)
          ? "短網址讀不到店家資料，請在電腦瀏覽器打開這家店，複製網址列的完整網址。"
          : "找不到店家資料，請貼上 Google Maps 這家店頁面的完整網址。",
      );
      return;
    }
    onSavePlaceId(nextPlaceId);
    setLinkDraft("");
    setLinkError("");
    setIsLinkFormOpen(false);
  };

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const updateEntry = (id, patch) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  const addEntry = () => {
    setEntries((current) => [...current, makeMenuEntry()]);
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll("input[data-menu-name]");
      inputs?.[inputs.length - 1]?.focus();
    });
  };
  const save = () => {
    const cleaned = entries
      .map((entry) => ({ ...entry, name: entry.name.trim(), price: String(entry.price ?? "").trim() }))
      .filter((entry) => entry.name);
    onSave(cleaned);
    setEntries(cleaned.length ? cleaned : [makeMenuEntry()]);
    setIsEditing(!cleaned.length);
  };
  const savedEntries = entries.filter((entry) => entry.name.trim());
  const mapsUrl = placeId
    ? makeGoogleMenuUrl(placeId)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

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
          <h2 id="planner-menu-title">{title}</h2>
          <button type="button" className="planner-menu-close" aria-label="關閉菜單" onClick={onClose}>
            ×
          </button>
        </div>
        {isEditing ? (
          <ul className="planner-menu-edit" ref={listRef}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <input
                  data-menu-name
                  value={entry.name}
                  placeholder="品項"
                  aria-label="品項"
                  onChange={(event) => updateEntry(entry.id, { name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addEntry();
                  }}
                />
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addEntry();
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="planner-menu-remove"
                  aria-label={`刪除品項 ${entry.name}`}
                  onClick={() =>
                    setEntries((current) =>
                      current.length > 1
                        ? current.filter((candidate) => candidate.id !== entry.id)
                        : [makeMenuEntry()],
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="planner-menu-list">
            {savedEntries.map((entry) => (
              <li key={entry.id}>
                <span>{entry.name}</span>
                <i aria-hidden="true" />
                <b>{formatMenuPrice(entry.price) || "—"}</b>
              </li>
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
          {placeId && !isLinkFormOpen && (
            <button type="button" onClick={() => setIsLinkFormOpen(true)}>
              更換店家連結
            </button>
          )}
        </div>
        {isLinkFormOpen && (
          <div className="planner-menu-link-form">
            <label htmlFor="planner-menu-link-input">
              貼上這家店的 Google Maps 網址，之後就能直接開到菜單
            </label>
            <div>
              <input
                id="planner-menu-link-input"
                value={linkDraft}
                placeholder="https://www.google.com/maps/place/…"
                onChange={(event) => {
                  setLinkDraft(event.target.value);
                  setLinkError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyLink();
                }}
              />
              <button type="button" onClick={applyLink}>
                套用
              </button>
            </div>
            {linkError && <small role="alert">{linkError}</small>}
          </div>
        )}
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
            <button type="button" className="is-primary" onClick={() => setIsEditing(true)}>
              編輯菜單
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h10.5a1.5 1.5 0 0 1 1.5 1.5v15a.5.5 0 0 1-.5.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M8.5 8h6M8.5 11.5h6M8.5 15h4" />
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
          即時路況
          <i>↗</i>
        </a>
      </div>
    </section>
  );
}

function Planner() {
  const { user, syncSpaceId, syncVersion } = useAuth();
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
  const [draggedDayId, setDraggedDayId] = useState(null);
  const [dragOverDayId, setDragOverDayId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [locating, setLocating] = useState({});
  const [locationErrors, setLocationErrors] = useState({});
  const [travelSegments, setTravelSegments] = useState({});
  const [cloudLoadedFor, setCloudLoadedFor] = useState(null);
  const [saveRequest, setSaveRequest] = useState(0);
  const [plannerSaveStatus, setPlannerSaveStatus] = useState("");
  const [dayPendingDelete, setDayPendingDelete] = useState(null);
  const [menuItemId, setMenuItemId] = useState(null);
  const initialCloudDataRef = useRef({ days, activeDayId });
  const lastCloudKeyRef = useRef(null);
  const localEditPendingRef = useRef(false);
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
    savePlannerCloud(cloudKey, { days })
      .then(() => {
        localEditPendingRef.current = false;
        setPlannerSaveStatus("已儲存並同步");
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
    const drafts = new Map(itemDraftsRef.current);
    const itemsToLocate = items
      .filter((item) => drafts.has(item.id))
      .map((item) => ({ ...item, text: drafts.get(item.id) }))
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
  const applyLocatedItem = (itemId, location, locatedText = "") => {
    localEditPendingRef.current = true;
    setDays((current) =>
      current.map((day) => {
        if (day.id !== activeDayId) return day;
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
    setPlannerSaveStatus(cloudKey ? "定位完成，正在同步…" : "定位完成");
    setSaveRequest((request) => request + 1);
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
      applyLocatedItem(item.id, namedPlace, item.text);
      return;
    }
    setLocating((current) => ({ ...current, [item.id]: true }));
    setLocationErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const location = await geocodeJapanesePlace(item.text);
      if (!location) {
        const fallbackTown = findTownForText(item.text);
        if (fallbackTown) {
          applyLocatedItem(item.id, fallbackTown, item.text);
          return;
        }
        setLocationErrors((current) => ({
          ...current,
          [item.id]: "找不到地點，請改用日文名稱或地址，或貼上 Google Maps 的連結或座標",
        }));
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
    locateItem({ ...item, text: draftText });
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

  const saveItemMenu = (itemId, patch) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
    setPlannerSaveStatus(cloudKey ? "菜單已儲存，正在同步…" : "菜單已儲存在此裝置");
    setSaveRequest((request) => request + 1);
  };

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
                <em className="planner-title-day">{days.length} 天行程表</em>
              </h2>
            </div>
          </div>
          <nav className="planner-day-picker" aria-label="選擇行程天數">
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
                        {day.date && (
                          <em>{formatItineraryDate(day.date, true)}</em>
                        )}
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
                                onClick={() => setMapFocus({ itemId: item.id })}
                                aria-label={`STOP ${String(index + 1).padStart(2, "0")}，點擊在地圖上顯示，拖曳調整順序`}
                                title="點擊在地圖上顯示・拖曳調整順序"
                              >
                                <span>STOP</span>
                                <span>{String(index + 1).padStart(2, "0")}</span>
                              </button>
                              <div className="planner-item-copy">
                                <div className="planner-item-meta">
                                  <b>
                                    {itemMotif && (
                                      <span
                                        className={`planner-item-category-icon ${itemMotif === "lamb" ? "is-lamb" : ""} ${itemMotif === "chairlift" ? "is-chairlift" : ""}`}
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
                                          className={`planner-locate planner-icon-locate ${locating[item.id] ? "is-locating" : ""}`}
                                          type="button"
                                          aria-label="重新定位"
                                          data-tooltip={locating[item.id] ? undefined : "重新定位"}
                                          disabled={locating[item.id]}
                                          onClick={() => locateCurrentItem(item)}
                                        >
                                          {locating[item.id] ? (
                                            "定位中…"
                                          ) : (
                                            <span className="planner-locate-icon" aria-hidden="true">⌖</span>
                                          )}
                                        </button>
                                        {isFoodLocation(resolvedLocation) && itemMotif !== "chairlift" && (
                                          <button
                                            className={`planner-locate planner-menu-btn ${item.menu?.length ? "has-menu" : ""}`}
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
                                      className={`planner-locate planner-icon-locate ${locating[item.id] ? "is-locating" : ""}`}
                                      type="button"
                                      aria-label="定位"
                                      data-tooltip={locating[item.id] ? undefined : "定位"}
                                      disabled={locating[item.id]}
                                      onClick={() => locateCurrentItem(item)}
                                    >
                                      {locating[item.id] ? (
                                        "定位中…"
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
            mapsQuery={[menuLocation?.name ?? title, menuLocation?.displayName].filter(Boolean).join(" ")}
            initialMenu={menuItem.menu}
            placeId={menuItem.googlePlaceId ?? findGooglePlaceId(menuText)}
            onSave={(menu) => saveItemMenu(menuItem.id, { menu })}
            onSavePlaceId={(googlePlaceId) =>
              saveItemMenu(menuItem.id, { googlePlaceId })
            }
            onClose={() => setMenuItemId(null)}
          />
        );
      })()}
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
