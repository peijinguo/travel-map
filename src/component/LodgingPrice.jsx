import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { saveLodgingPriceCloud, subscribeLodgingPricesCloud } from "../services/firebase";

// The price row on a 機票住宿 lodging card: type the stay's total in yen and
// it shows NT$ a night at the live exchange rate (shown in the card's corner). On a synced trip the prices
// are shared with everyone on it (any phone or computer); without one they are
// kept on this device.
const PRICE_STORAGE_KEY = "yuki-tabi-lodging-prices-v1";
const RATE_STORAGE_KEY = "yuki-tabi-jpy-twd-rate-v1";
const RATE_URL = "https://open.er-api.com/v6/latest/JPY";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the value lives for this visit only
  }
};

// Yen → NT$ at the live market rate, shared by every card and refreshed every
// few minutes while the page is open. fxratesapi gives a live quote; the daily
// open.er-api rate is the fallback, and the last rate seen is kept for offline.
const LIVE_RATE_URL = "https://api.fxratesapi.com/latest?base=JPY&currencies=TWD";
const RATE_MAX_AGE = 5 * 60 * 1000;
let ratePromise = null;
const fetchRate = async () => {
  try {
    const data = await fetch(LIVE_RATE_URL).then((response) => response.json());
    const rate = Number(data?.rates?.TWD);
    if (rate > 0) return rate;
  } catch {
    // fall through to the daily rate
  }
  const data = await fetch(RATE_URL).then((response) => response.json());
  const rate = data?.rates?.TWD;
  if (!(rate > 0)) throw new Error("no rate");
  return rate;
};
function loadRate() {
  const cached = readJson(RATE_STORAGE_KEY, null);
  if (cached?.at && Date.now() - cached.at < RATE_MAX_AGE && cached.rate > 0)
    return Promise.resolve(cached);
  ratePromise ??= fetchRate()
    .then((rate) => {
      const fresh = { rate, at: Date.now() };
      writeJson(RATE_STORAGE_KEY, fresh);
      return fresh;
    })
    // Offline: an older rate is better than none.
    .catch(() => (cached?.rate > 0 ? cached : null))
    .finally(() => {
      ratePromise = null;
    });
  return ratePromise;
}

function useJpyRate() {
  const [rate, setRate] = useState(() => readJson(RATE_STORAGE_KEY, null));
  useEffect(() => {
    let alive = true;
    const refresh = () => loadRate().then((result) => alive && result && setRate(result));
    refresh();
    const timer = setInterval(refresh, RATE_MAX_AGE);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return rate;
}

const formatRateTime = (at) =>
  new Date(at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });

const formatNumber = (value) => Math.round(value).toLocaleString("zh-TW");

// Cloud field names cannot hold dots or slashes.
const cloudField = (key) => key.replace(/[./\[\]*~`]/gu, "_");

// One value of a stay shared on the trip (or kept on this device without one):
// the yen total, or the free-cancellation date.
function useLodgingValue(key) {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [value, setValue] = useState(() => readJson(PRICE_STORAGE_KEY, {})[key] ?? "");

  // The trip's shared value for this stay, kept up to date as others type.
  useEffect(() => {
    if (!cloudKey) return undefined;
    return subscribeLodgingPricesCloud(
      cloudKey,
      (prices) => {
        const shared = prices[cloudField(key)];
        const local = readJson(PRICE_STORAGE_KEY, {})[key];
        // A value typed on this device before it was shared: share it.
        if (!shared && local) {
          saveLodgingPriceCloud(cloudKey, cloudField(key), local).catch(() => {});
          const rest = readJson(PRICE_STORAGE_KEY, {});
          delete rest[key];
          writeJson(PRICE_STORAGE_KEY, rest);
        }
        setValue(shared ?? local ?? "");
      },
      (error) => console.error("無法同步住宿資料", error),
    );
  }, [cloudKey, key]);

  const save = (next) => {
    setValue(next);
    if (cloudKey) {
      saveLodgingPriceCloud(cloudKey, cloudField(key), next).catch((error) =>
        console.error("無法儲存住宿資料", error),
      );
      return;
    }
    const prices = readJson(PRICE_STORAGE_KEY, {});
    if (next) prices[key] = next;
    else delete prices[key];
    writeJson(PRICE_STORAGE_KEY, prices);
  };
  return [value, save];
}

function LodgingPrice({ priceKey, nights }) {
  const rate = useJpyRate();
  const [total, saveTotal] = useLodgingValue(priceKey);
  const [cancelBy, saveCancelBy] = useLodgingValue(`${priceKey}|cancel`);
  const update = (value) => saveTotal(value.replace(/[^\d]/g, ""));

  const yen = Number(total);
  const perNight = yen && nights && rate?.rate ? (yen * rate.rate) / nights : null;

  return (
    <div className="lodging-price">
      {rate?.rate > 0 && (
        <p className="lodging-rate" title={rate.at ? `更新於 ${formatRateTime(rate.at)}` : undefined}>
          匯率 {rate.rate.toFixed(4)}
        </p>
      )}
      <label>
        <span>{nights} 晚總價</span>
        <span className="lodging-price-input">
          <i aria-hidden="true">¥</i>
          <input
            inputMode="numeric"
            placeholder="總價"
            value={total ? Number(total).toLocaleString("en-US") : ""}
            onChange={(event) => update(event.target.value)}
            aria-label="住宿總價（日圓）"
          />
        </span>
      </label>
      <label className="lodging-cancel">
        <input
          type="date"
          value={cancelBy}
          onChange={(event) => saveCancelBy(event.target.value)}
          aria-label="免費取消期限"
        />
        <span>前免費取消</span>
      </label>
      <p className="lodging-price-result">
        {perNight ? (
          <>
            <b>NT${formatNumber(perNight)}</b> / 晚
          </>
        ) : (
          <small>{yen && !rate ? "匯率讀取中…" : "輸入總價換算台幣/晚"}</small>
        )}
      </p>
    </div>
  );
}

export default LodgingPrice;
