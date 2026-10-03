import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const routesEndpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";

function readCoordinate(value, label) {
  const latitude = Number(value?.latitude);
  const longitude = Number(value?.longitude);
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new HttpsError("invalid-argument", `${label} 座標格式錯誤`);
  }
  return { latitude, longitude };
}

function normalizeDepartureTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError("invalid-argument", "出發時間格式錯誤");
  }
  const minimum = new Date(Date.now() + 5 * 60 * 1000);
  const maximum = new Date(Date.now() + 99 * 24 * 60 * 60 * 1000);
  if (date < minimum) return minimum.toISOString();
  if (date > maximum) return null;
  return date.toISOString();
}

export const getTransitRoute = onCall(
  {
    region: "asia-northeast1",
    secrets: [googleMapsApiKey],
    timeoutSeconds: 15,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "請先完成匿名登入");
    }

    const origin = readCoordinate(request.data?.origin, "起點");
    const destination = readCoordinate(request.data?.destination, "終點");
    const departureTime = normalizeDepartureTime(request.data?.departureTime);
    const body = {
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode: "TRANSIT",
      languageCode: "zh-TW",
      regionCode: "JP",
      computeAlternativeRoutes: true,
      ...(departureTime ? { departureTime } : {}),
    };

    const response = await fetch(routesEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": googleMapsApiKey.value(),
        "x-goog-fieldmask": "routes.duration,routes.localizedValues",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Google Routes API error", response.status, details.slice(0, 500));
      throw new HttpsError("unavailable", `Routes API 回應 ${response.status}`);
    }

    const payload = await response.json();
    const route = payload.routes?.[0];
    return {
      duration: route?.localizedValues?.duration?.text ?? null,
      durationSeconds: route?.duration
        ? Number.parseInt(route.duration.replace(/s$/, ""), 10)
        : null,
      source: "google-routes-api",
    };
  },
);
