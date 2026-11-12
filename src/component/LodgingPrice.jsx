import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { saveLodgingPriceCloud, subscribeLodgingPricesCloud } from "../services/firebase";

// The price row on a 機票住宿 lodging card: type the stay's total in yen and
// it shows NT$ a night at today's exchange rate. On a synced trip the prices
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

// Yen → NT$ for today, fetched once a day and shared by every card.
let ratePromise = null;
const today = () => new Date().toISOString().slice(0, 10);
function loadRate() {
  const cached = readJson(RATE_STORAGE_KEY, null);
  if (cached?.date === today() && cached.rate > 0) return Promise.resolve(cached);
  ratePromise ??= fetch(RATE_URL)
    .then((response) => response.json())
    .then((data) => {
      const rate = data?.rates?.TWD;
      if (!(rate > 0)) throw new Error("no rate");
      const fresh = { rate, date: today() };
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
    loadRate().then((result) => alive && result && setRate(result));
    return () => {
      alive = false;
    };
  }, []);
  return rate;
}

const formatNumber = (value) => Math.round(value).toLocaleString("zh-TW");

// Cloud field names cannot hold dots or slashes.
const cloudField = (key) => key.replace(/[./\[\]*~`]/gu, "_");

function LodgingPrice({ priceKey, nights }) {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const rate = useJpyRate();
  const [total, setTotal] = useState(() => readJson(PRICE_STORAGE_KEY, {})[priceKey] ?? "");

  // The trip's shared price for this stay, kept up to date as others type.
  useEffect(() => {
    if (!cloudKey) return undefined;
    return subscribeLodgingPricesCloud(
      cloudKey,
      (prices) => {
        const shared = prices[cloudField(priceKey)];
        const local = readJson(PRICE_STORAGE_KEY, {})[priceKey];
        // A price typed on this device before prices were shared: share it.
        if (!shared && local) {
          saveLodgingPriceCloud(cloudKey, cloudField(priceKey), local).catch(() => {});
          const rest = readJson(PRICE_STORAGE_KEY, {});
          delete rest[priceKey];
          writeJson(PRICE_STORAGE_KEY, rest);
        }
        setTotal(shared ?? local ?? "");
      },
      (error) => console.error("無法同步住宿價格", error),
    );
  }, [cloudKey, priceKey]);

  const update = (value) => {
    const digits = value.replace(/[^\d]/g, "");
    setTotal(digits);
    if (cloudKey) {
      saveLodgingPriceCloud(cloudKey, cloudField(priceKey), digits).catch((error) =>
        console.error("無法儲存住宿價格", error),
      );
      return;
    }
    const prices = readJson(PRICE_STORAGE_KEY, {});
    if (digits) prices[priceKey] = digits;
    else delete prices[priceKey];
    writeJson(PRICE_STORAGE_KEY, prices);
  };

  const yen = Number(total);
  const perNight = yen && nights && rate?.rate ? (yen * rate.rate) / nights : null;

  return (
    <div className="lodging-price">
      <label>
        <span>{nights} 晚總價</span>
        <span className="lodging-price-input">
          <i aria-hidden="true">¥</i>
          <input
            inputMode="numeric"
            placeholder="輸入住宿總價"
            value={total ? Number(total).toLocaleString("en-US") : ""}
            onChange={(event) => update(event.target.value)}
            aria-label="住宿總價（日圓）"
          />
        </span>
      </label>
      <p className="lodging-price-result">
        {perNight ? (
          <>
            <b>NT${formatNumber(perNight)}</b> / 晚
            <small>
              匯率 {rate.rate.toFixed(4)}
            </small>
          </>
        ) : (
          <small>{yen && !rate ? "匯率讀取中…" : "輸入總價換算台幣/晚"}</small>
        )}
      </p>
    </div>
  );
}

export default LodgingPrice;
