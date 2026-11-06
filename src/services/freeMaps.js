// Free map services that need no API key or billing account. All of them use
// OpenStreetMap data, so a place must exist in OSM to be found.
const PHOTON_URL = "https://photon.komoot.io/api/";
const NOMINATIM_LOOKUP_URL = "https://nominatim.openstreetmap.org/lookup";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const GSI_ADDRESS_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch";
// Nominatim allows one request per second.
const NOMINATIM_GAP_MS = 1100;
// When Photon stops answering, skip it for a while instead of waiting for a
// timeout on every search.
const PHOTON_RETRY_AFTER_MS = 5 * 60 * 1000;
const ROUTE_URLS = {
  driving: [
    "https://router.project-osrm.org/route/v1/driving",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  ],
  walking: ["https://routing.openstreetmap.de/routed-foot/route/v1/foot"],
};
// The free routing servers answer bursts with 429, so requests are sent one at
// a time and every finished route is cached.
const ROUTE_REQUEST_GAP_MS = 1100;
const TRANSIT_URL = "https://api.transitous.org/api/v5/plan";
// Stops are often some way from a station; the default 15 minute walk finds
// nothing for trips like 函館 to 大沼公園.
const TRANSIT_MAX_WALK_SECONDS = 30 * 60;
const ROUTE_CACHE_KEY = "yuki-tabi-route-cache-v1";
const JAPAN_BBOX = "122,24,154,46";
// Trips start and end in Taiwan (home, airport, 高鐵), so Taiwan is searched
// when nothing in Japan matches.
const REGIONS = {
  japan: { countryCode: "JP", nominatimCode: "jp", bbox: JAPAN_BBOX },
  taiwan: { countryCode: "TW", nominatimCode: "tw", bbox: "118,21,123,27" },
};
const REQUEST_TIMEOUT_MS = 10000;

// The planner decides lodging and food stops from Google-style place types, so
// OSM categories are translated to the same vocabulary.
const OSM_PLACE_TYPES = {
  restaurant: ["restaurant", "food"],
  fast_food: ["restaurant", "food", "meal_takeaway"],
  food_court: ["restaurant", "food"],
  cafe: ["cafe", "food"],
  ice_cream: ["food"],
  bakery: ["bakery", "food"],
  confectionery: ["food"],
  pub: ["bar"],
  bar: ["bar"],
  hotel: ["lodging", "hotel"],
  motel: ["lodging", "motel"],
  hostel: ["lodging", "hostel"],
  guest_house: ["lodging", "guest_house"],
  apartment: ["lodging"],
  camp_site: ["lodging", "campground"],
  aerodrome: ["airport"],
  convenience: ["convenience_store"],
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 429) throw new Error("map-service-rate-limited");
  if (!response.ok) throw new Error("map-service-unavailable");
  return response.json();
};

let nextNominatimAt = 0;
async function fetchNominatim(url) {
  const wait = nextNominatimAt - Date.now();
  nextNominatimAt = Math.max(Date.now(), nextNominatimAt) + NOMINATIM_GAP_MS;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return fetchJson(url);
}

async function loadPlaceDetails({ osm_type: osmType, osm_id: osmId }) {
  if (!osmType || !osmId) return {};
  const query = new URLSearchParams({
    osm_ids: `${osmType}${osmId}`,
    format: "jsonv2",
    extratags: "1",
  });
  try {
    const [place] = await fetchNominatim(`${NOMINATIM_LOOKUP_URL}?${query}`);
    return place?.extratags ?? {};
  } catch {
    // Website and cuisine are extras; the located stop is still usable.
    return {};
  }
}

const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const normalizeName = (name) =>
  name.toLocaleLowerCase().replace(/[\s・·,，.()（）-]/g, "");

// Photon matches loosely and can return a different place with a similar name
// (鹿部温泉 -> 鹿塩温泉). A wrong pin is worse than "not found", so Japanese and
// Chinese queries must name the result. A query that is only part of the stop's
// full name must not widen the match: リブマックスリゾート函館 alone would also
// accept the chain's other hotels. English queries are kept as they also match
// a place's translated name.
function isSamePlaceName(name, query, fullName, matchEnglish = false) {
  if (!matchEnglish && !CJK_PATTERN.test(query)) return true;
  const resultName = normalizeName(name);
  if (resultName.length < 3) return false;
  // A generic word left over from a partial name ("Yakiniku") must not match a
  // place that is merely called that.
  if (query !== fullName && resultName.length < normalizeName(fullName).length / 2) return false;
  return (
    normalizeName(query).includes(resultName) ||
    normalizeName(fullName).includes(resultName) ||
    resultName.includes(normalizeName(fullName))
  );
}

// A ski area often shares its name with the resort hotel next to it
// (グリーンピア大沼 is both). When the stop names a ski area, prefer the
// winter-sports result among the same-name matches.
const SKI_AREA_PATTERN = /滑雪場|滑雪场|スキー場|スノーパーク|ski\s*(?:area|resort)|snow\s*(?:resort|park)/iu;
const isSkiAreaTag = (key, value) =>
  value === "winter_sports" || key === "piste" || value === "ski_resort";
// Likewise an airport stop takes the airport itself, not a station or hotel
// named after it (「桃園機場捷運台北車站」 is in Taipei).
const AIRPORT_PATTERN = /機場|机场|空港|airport/iu;
const isAirportTag = (key, value) => key === "aeroway" || value === "aerodrome";
function pickPreferred(matches, fullName, getTag) {
  const preferredTag = SKI_AREA_PATTERN.test(fullName)
    ? isSkiAreaTag
    : AIRPORT_PATTERN.test(fullName)
      ? isAirportTag
      : null;
  const preferred = preferredTag && matches.find((match) => preferredTag(...getTag(match)));
  return preferred ?? matches[0];
}

// A part of a stop's name, such as "Hakodate" from "Ai Hakodate Yakiniku",
// would otherwise match the whole city and pin the stop at its centre.
const isBroadAreaForPartialName = (osmCategory, query, fullName) =>
  query !== fullName && ["place", "boundary"].includes(osmCategory);

async function searchNominatim(query, fullName, region = REGIONS.japan) {
  const parameters = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: region.nominatimCode,
    extratags: "1",
    namedetails: "1",
  });
  const places = await fetchNominatim(`${NOMINATIM_SEARCH_URL}?${parameters}`);
  // Nominatim also matches words in addresses, so English queries must match
  // one of the place's names too.
  const matches = places.filter(
    ({ name, namedetails = {}, category }) =>
      !isBroadAreaForPartialName(category, query, fullName) &&
      [name, ...Object.values(namedetails)]
        .filter(Boolean)
        .some((candidate) => isSamePlaceName(candidate, query, fullName, true)),
  );
  const place = pickPreferred(matches, fullName, ({ category, type }) => [category, type]);
  if (!place) return null;
  const details = place.extratags ?? {};
  return {
    id: `osm-${place.osm_type[0].toUpperCase()}${place.osm_id}`,
    name: place.name || query,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    displayName: place.display_name,
    query,
    types: OSM_PLACE_TYPES[place.type] ?? [],
    website: details.website ?? details["contact:website"] ?? "",
    ...(details.cuisine ? { cuisine: details.cuisine } : {}),
  };
}

const ADDRESS_PATTERN = /[都道府県市区町村郡].*\d/u;

// Japanese addresses are covered by the GSI (国土地理院) address search. Only
// street-level results are kept; a bare city name would drop the pin in the
// city centre.
async function searchJapaneseAddress(query) {
  if (!ADDRESS_PATTERN.test(query)) return null;
  const results = await fetchJson(`${GSI_ADDRESS_URL}?${new URLSearchParams({ q: query })}`);
  const result = results.find(({ properties }) => /\d|丁目|番/u.test(properties.title));
  if (!result) return null;
  const [longitude, latitude] = result.geometry.coordinates;
  return {
    id: `gsi-${latitude.toFixed(5)},${longitude.toFixed(5)}`,
    name: query,
    latitude,
    longitude,
    displayName: result.properties.title,
    query,
    types: [],
    website: "",
  };
}

let photonDownUntil = 0;

// fullName is the stop's complete name when query is only a part of it.
// Photon is tried first; Nominatim takes over when Photon is down.
export async function searchJapanPlace(query, fullName = query) {
  return (
    (await searchRegion(query, fullName, REGIONS.japan)) ??
    (await searchJapaneseAddress(query)) ??
    (await searchTaiwanPlace(query, fullName))
  );
}

async function searchRegion(query, fullName, region) {
  if (Date.now() >= photonDownUntil) {
    try {
      return await searchPhoton(query, fullName, region);
    } catch {
      photonDownUntil = Date.now() + PHOTON_RETRY_AFTER_MS;
    }
  }
  return searchNominatim(query, fullName, region);
}

// Taiwanese stops are usually written the colloquial way, 「新竹高鐵」, while
// the map names the station 「高鐵新竹站」.
// Airports are likewise 「桃園機場」 for 「臺灣桃園國際機場」.
const toTaiwanStationQueries = (query) => {
  const highSpeedRail = /^(.+?)高鐵站?$/u.exec(query);
  if (highSpeedRail) return [`高鐵${highSpeedRail[1]}站`];
  const airport = /^(?:臺灣|台灣)?(.+?)(?:國際)?機場$/u.exec(query);
  if (airport) return [`臺灣${airport[1]}國際機場`, `臺北${airport[1]}機場`, `${airport[1]}國際機場`];
  return [];
};

async function searchTaiwanPlace(query, fullName) {
  if (!CJK_PATTERN.test(query)) return null;
  for (const candidate of [...toTaiwanStationQueries(query), query]) {
    const place = await searchRegion(candidate, fullName, REGIONS.taiwan);
    if (place) return place;
  }
  return null;
}

async function searchPhoton(query, fullName, region = REGIONS.japan) {
  const parameters = new URLSearchParams({ q: query, limit: "5", bbox: region.bbox });
  // English queries are compared with the English names; Photon otherwise
  // matches loosely, e.g. "Ai Hakodate Yakiniku" returned 焼肉ライク.
  if (!CJK_PATTERN.test(query)) parameters.set("lang", "en");
  const { features = [] } = await fetchJson(`${PHOTON_URL}?${parameters}`);
  const matches = features.filter(
    ({ properties }) =>
      properties.countrycode === region.countryCode &&
      properties.name &&
      !isBroadAreaForPartialName(properties.osm_key, query, fullName) &&
      isSamePlaceName(properties.name, query, fullName, true),
  );
  const feature = pickPreferred(matches, fullName, ({ properties }) => [
    properties.osm_key,
    properties.osm_value,
  ]);
  if (!feature) return null;

  const { properties, geometry } = feature;
  const details = await loadPlaceDetails(properties);
  const [longitude, latitude] = geometry.coordinates;
  return {
    id: `osm-${properties.osm_type}${properties.osm_id}`,
    name: properties.name,
    latitude,
    longitude,
    displayName: [
      properties.postcode,
      properties.state,
      properties.city ?? properties.county,
      properties.district,
      properties.street,
      properties.housenumber,
      properties.name,
    ]
      .filter(Boolean)
      .join(" "),
    query,
    types: OSM_PLACE_TYPES[properties.osm_value] ?? [],
    website: details.website ?? details["contact:website"] ?? "",
    ...(details.cuisine ? { cuisine: details.cuisine } : {}),
  };
}

const inJapan = (latitude, longitude) =>
  (latitude > 20 && latitude < 46 && longitude > 122 && longitude < 154) ||
  // Taiwan, for pasted coordinates of the trip's start and end.
  (latitude > 21 && latitude < 27 && longitude > 118 && longitude < 123);

// A stop can carry exact coordinates, pasted as "41.794, 140.751" or as a
// Google Maps link, for places that no free search knows.
export function findCoordinatesInText(text) {
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2,3}\.\d{3,})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (inJapan(latitude, longitude)) return { latitude, longitude };
  }
  return null;
}

const formatDuration = (seconds) => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} 分鐘`;
  return minutes ? `${hours} 小時 ${minutes} 分鐘` : `${hours} 小時`;
};

const formatDistance = (meters) =>
  meters < 1000
    ? `${Math.round(meters / 10) * 10} 公尺`
    : `${(meters / 1000).toFixed(1)} 公里`;

const readRouteCache = () => {
  try {
    return JSON.parse(localStorage.getItem(ROUTE_CACHE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const writeRouteCache = (key, route) => {
  try {
    localStorage.setItem(
      ROUTE_CACHE_KEY,
      JSON.stringify({ ...readRouteCache(), [key]: route }),
    );
  } catch {
    // Without storage the route is simply requested again next time.
  }
};

let routeQueue = Promise.resolve();

function enqueueRouteRequest(task) {
  const result = routeQueue.then(task);
  routeQueue = result
    .catch(() => null)
    .then(() => new Promise((resolve) => setTimeout(resolve, ROUTE_REQUEST_GAP_MS)));
  return result;
}

async function fetchRoute(baseUrl, coordinates) {
  const response = await fetch(`${baseUrl}/${coordinates}?overview=false`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload.routes?.[0] ?? null;
}

const toRouteCoordinates = ({ latitude, longitude }) =>
  `${longitude.toFixed(5)},${latitude.toFixed(5)}`;

// Timetables only cover the coming weeks, so a trip months away is estimated
// from the next weekday in Japan. Rural lines run rarely, so a midday start is
// tried when the 09:00 one finds nothing.
const TRANSIT_START_HOURS_JST = [9, 13];
function getNextWeekdayAt(hourJst) {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(hourJst - 9, 0, 0, 0);
  return date;
}

// Bus data is mostly missing, so without this a short taxi or bus hop such as
// 函館空港 to 湯の川 comes back as a 56 minute walk to a 2 minute tram ride.
function isSensibleTransitTrip({ duration, legs }) {
  const walkSeconds = legs
    .filter(({ mode }) => mode === "WALK")
    .reduce((total, leg) => total + leg.duration, 0);
  return walkSeconds <= TRANSIT_MAX_WALK_SECONDS && walkSeconds <= duration - walkSeconds;
}

// Resolves to null when no timetable data connects the two points. Coverage is
// mostly rail, so stops away from a station, such as ski resorts, often have none.
export async function requestTransitTime(from, to) {
  const cacheKey = `transit-v2:${toRouteCoordinates(from)};${toRouteCoordinates(to)}`;
  const cached = readRouteCache()[cacheKey];
  if (cached) return cached;

  return enqueueRouteRequest(async () => {
    for (const hour of TRANSIT_START_HOURS_JST) {
      const parameters = new URLSearchParams({
        fromPlace: `${from.latitude},${from.longitude}`,
        toPlace: `${to.latitude},${to.longitude}`,
        time: getNextWeekdayAt(hour).toISOString(),
        maxPreTransitTime: String(TRANSIT_MAX_WALK_SECONDS),
        maxPostTransitTime: String(TRANSIT_MAX_WALK_SECONDS),
      });
      const { itineraries = [] } = await fetchJson(`${TRANSIT_URL}?${parameters}`);
      const seconds = itineraries.filter(isSensibleTransitTrip).map(({ duration }) => duration);
      if (!seconds.length) continue;
      const summary = { duration: formatDuration(Math.min(...seconds)) };
      writeRouteCache(cacheKey, summary);
      return summary;
    }
    return null;
  });
}

// mode is "driving" or "walking". Resolves to null when no road connects the
// two points, for example across the sea.
export async function requestRoute(from, to, mode) {
  const coordinates = [from, to].map(toRouteCoordinates).join(";");
  const cacheKey = `${mode}:${coordinates}`;
  const cached = readRouteCache()[cacheKey];
  if (cached) return cached;

  return enqueueRouteRequest(async () => {
    for (const baseUrl of ROUTE_URLS[mode]) {
      const route = await fetchRoute(baseUrl, coordinates).catch(() => null);
      if (!route) continue;
      const summary = {
        duration: formatDuration(route.duration),
        distance: formatDistance(route.distance),
      };
      writeRouteCache(cacheKey, summary);
      return summary;
    }
    return null;
  });
}
