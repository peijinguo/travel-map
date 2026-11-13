// The 7-day forecast for a resort page, in Open-Meteo's shape
// ({ current: {...}, daily: {...} }). Open-Meteo is tried first; when it does
// not answer in time, MET Norway's free forecast is used instead and turned
// into the same shape.

const OPEN_METEO_TIMEOUT = 8000;
const MET_NO_TIMEOUT = 12000;

const withTimeout = (signal, ms) => AbortSignal.any([signal, AbortSignal.timeout(ms)]);

async function fetchOpenMeteo(latitude, longitude, signal) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,snowfall",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum,wind_speed_10m_max",
    timezone: "Asia/Tokyo",
    forecast_days: "7",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, {
    signal: withTimeout(signal, OPEN_METEO_TIMEOUT),
  });
  if (!response.ok) throw new Error("Open-Meteo request failed");
  return response.json();
}

// MET Norway symbol codes → the WMO weather codes Open-Meteo uses.
const symbolToCode = (symbol = "") => {
  const name = symbol.replace(/_(day|night|polartwilight)$/u, "");
  if (name.includes("thunder")) return 95;
  if (name.includes("snowshowers")) return name.startsWith("heavy") ? 86 : 85;
  if (name.includes("snow") || name.includes("sleet")) {
    if (name.startsWith("heavy")) return 75;
    return name.startsWith("light") ? 71 : 73;
  }
  if (name.includes("rainshowers")) return name.startsWith("heavy") ? 82 : 80;
  if (name.includes("rain")) {
    if (name.startsWith("heavy")) return 65;
    return name.startsWith("light") ? 61 : 63;
  }
  if (name === "fog") return 45;
  if (name === "cloudy") return 3;
  if (name === "partlycloudy") return 2;
  if (name === "fair") return 1;
  return 0;
};

// Rain and snow codes outrank cloud codes when picking a day's weather.
const codeWeight = (code) => (code >= 95 ? 5 : code >= 71 ? 4 : code >= 51 ? 3 : code);

// Precipitation counts as snow at or below 1°C; 1 mm of water ≈ 1 cm of snow.
const snowCm = (mm, temperature) => (temperature <= 1 ? mm : 0);

// Wind chill (°C, km/h), the "feels like" Open-Meteo would give in the cold.
const feelsLike = (temperature, windKmh) =>
  temperature <= 10 && windKmh > 4.8
    ? 13.12 + 0.6215 * temperature - 11.37 * windKmh ** 0.16 + 0.3965 * temperature * windKmh ** 0.16
    : temperature;

const japanDate = (iso) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date(iso));

async function fetchMetNo(latitude, longitude, signal) {
  const query = new URLSearchParams({
    lat: Number(latitude).toFixed(4),
    lon: Number(longitude).toFixed(4),
  });
  const response = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?${query}`,
    { signal: withTimeout(signal, MET_NO_TIMEOUT) },
  );
  if (!response.ok) throw new Error("MET Norway request failed");
  const series = (await response.json())?.properties?.timeseries ?? [];
  if (!series.length) throw new Error("MET Norway sent no forecast");

  const days = new Map();
  series.forEach((entry, index) => {
    const details = entry.data?.instant?.details ?? {};
    const temperature = details.air_temperature;
    if (!Number.isFinite(temperature)) return;
    const date = japanDate(entry.time);
    const day = days.get(date) ?? { max: -Infinity, min: Infinity, snow: 0, wind: 0, code: 0 };
    day.max = Math.max(day.max, temperature);
    day.min = Math.min(day.min, temperature);
    day.wind = Math.max(day.wind, (details.wind_speed ?? 0) * 3.6);
    // Hourly steps carry next_1_hours; further out the steps are 6 hours apart.
    const next = entry.data.next_1_hours ?? entry.data.next_6_hours;
    const nextTime = series[index + 1]?.time;
    const stepHours = nextTime ? (new Date(nextTime) - new Date(entry.time)) / 3600000 : 1;
    const covered = entry.data.next_1_hours ? 1 : 6;
    const precipitation = (next?.details?.precipitation_amount ?? 0) * Math.min(stepHours / covered, 1);
    day.snow += snowCm(precipitation, temperature);
    const code = symbolToCode(next?.summary?.symbol_code);
    if (codeWeight(code) > codeWeight(day.code)) day.code = code;
    days.set(date, day);
  });

  const dates = [...days.keys()].sort().slice(0, 7);
  const first = series[0];
  const now = first.data.instant.details;
  const windKmh = (now.wind_speed ?? 0) * 3.6;
  const nextHour = first.data.next_1_hours;
  return {
    current: {
      temperature_2m: now.air_temperature,
      apparent_temperature: feelsLike(now.air_temperature, windKmh),
      weather_code: symbolToCode(nextHour?.summary?.symbol_code),
      wind_speed_10m: windKmh,
      snowfall: snowCm(nextHour?.details?.precipitation_amount ?? 0, now.air_temperature),
    },
    daily: {
      time: dates,
      weather_code: dates.map((date) => days.get(date).code),
      temperature_2m_max: dates.map((date) => days.get(date).max),
      temperature_2m_min: dates.map((date) => days.get(date).min),
      snowfall_sum: dates.map((date) => Math.round(days.get(date).snow * 10) / 10),
      wind_speed_10m_max: dates.map((date) => days.get(date).wind),
    },
  };
}

export async function fetchResortForecast(latitude, longitude, signal) {
  try {
    return await fetchOpenMeteo(latitude, longitude, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    return fetchMetNo(latitude, longitude, signal);
  }
}
