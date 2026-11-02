// Free map services that need no API key or billing account. All of them use
// OpenStreetMap data, so a place must exist in OSM to be found.
const PHOTON_URL = "https://photon.komoot.io/api/";
const NOMINATIM_LOOKUP_URL = "https://nominatim.openstreetmap.org/lookup";
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
// Stops are often far from a station; the default 15 minute walk finds nothing
// for trips like 函館 to 大沼公園.
const TRANSIT_MAX_WALK_SECONDS = "3600";
const ROUTE_CACHE_KEY = "yuki-tabi-route-cache-v1";
const JAPAN_BBOX = "122,24,154,46";
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

async function loadPlaceDetails({ osm_type: osmType, osm_id: osmId }) {
  if (!osmType || !osmId) return {};
  const query = new URLSearchParams({
    osm_ids: `${osmType}${osmId}`,
    format: "jsonv2",
    extratags: "1",
  });
  try {
    const [place] = await fetchJson(`${NOMINATIM_LOOKUP_URL}?${query}`);
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
function isSamePlaceName(name, query, fullName) {
  if (!CJK_PATTERN.test(query)) return true;
  const resultName = normalizeName(name);
  if (resultName.length < 3) return false;
  return (
    normalizeName(query).includes(resultName) ||
    normalizeName(fullName).includes(resultName) ||
    resultName.includes(normalizeName(fullName))
  );
}

// fullName is the stop's complete name when query is only a part of it.
export async function searchJapanPlace(query, fullName = query) {
  const parameters = new URLSearchParams({ q: query, limit: "5", bbox: JAPAN_BBOX });
  const { features = [] } = await fetchJson(`${PHOTON_URL}?${parameters}`);
  const feature = features.find(
    ({ properties }) =>
      properties.countrycode === "JP" &&
      properties.name &&
      isSamePlaceName(properties.name, query, fullName),
  );
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
// from the next weekday at 09:00 in Japan.
function getNextWeekdayMorning() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// Resolves to null when no timetable data connects the two points. Coverage is
// mostly rail, so stops away from a station, such as ski resorts, often have none.
export async function requestTransitTime(from, to) {
  const cacheKey = `transit:${toRouteCoordinates(from)};${toRouteCoordinates(to)}`;
  const cached = readRouteCache()[cacheKey];
  if (cached) return cached;

  return enqueueRouteRequest(async () => {
    const parameters = new URLSearchParams({
      fromPlace: `${from.latitude},${from.longitude}`,
      toPlace: `${to.latitude},${to.longitude}`,
      time: getNextWeekdayMorning().toISOString(),
      maxPreTransitTime: TRANSIT_MAX_WALK_SECONDS,
      maxPostTransitTime: TRANSIT_MAX_WALK_SECONDS,
    });
    const { itineraries = [] } = await fetchJson(`${TRANSIT_URL}?${parameters}`);
    const seconds = itineraries
      .filter(({ legs }) => legs.some(({ mode }) => mode !== "WALK"))
      .map(({ duration }) => duration);
    if (!seconds.length) return null;
    const summary = { duration: formatDuration(Math.min(...seconds)) };
    writeRouteCache(cacheKey, summary);
    return summary;
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
