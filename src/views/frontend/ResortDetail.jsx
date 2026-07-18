import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import CartoonTrailMap from "../../component/CartoonTrailMap";
import "../../assets/pages/_resort-detail.scss";
import { snowTowns } from "./Home";

const weatherLabels = {
  0: "晴朗",
  1: "大致晴朗",
  2: "局部多雲",
  3: "陰天",
  45: "有霧",
  48: "霧凇",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "較強毛毛雨",
  61: "小雨",
  63: "降雨",
  65: "大雨",
  71: "小雪",
  73: "降雪",
  75: "大雪",
  77: "雪粒",
  80: "陣雨",
  81: "陣雨",
  82: "強陣雨",
  85: "陣雪",
  86: "強陣雪",
  95: "雷雨",
  96: "雷雨伴冰雹",
  99: "強雷雨伴冰雹",
};

const weatherSymbol = (code) => {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "雨";
  if ([0, 1].includes(code)) return "晴";
  if ([2, 3, 45, 48].includes(code)) return "雲";
  return "天";
};

function ResortDetail() {
  const { townId, resortIndex } = useParams();
  const town = snowTowns.find((item) => item.id === townId);
  const index = Number(resortIndex);
  const resort = town?.resorts[index];
  const [forecast, setForecast] = useState(null);
  const [weatherState, setWeatherState] = useState("loading");

  useEffect(() => {
    if (!town || !resort) return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({
      latitude: String(town.latitude),
      longitude: String(town.longitude),
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,snowfall",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum",
      timezone: "Asia/Tokyo",
      forecast_days: "7",
    });

    fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Weather request failed");
        return response.json();
      })
      .then((data) => {
        setForecast(data);
        setWeatherState("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setWeatherState("error");
      });

    return () => controller.abort();
  }, [town, resort]);

  if (!town || !resort) {
    return (
      <section className="resort-not-found">
        <p>找不到這座雪場。</p>
        <Link to="/">返回雪鄉地圖</Link>
      </section>
    );
  }

  const daily = forecast?.daily?.time?.map((date, dayIndex) => ({
    date,
    code: forecast.daily.weather_code[dayIndex],
    max: forecast.daily.temperature_2m_max[dayIndex],
    min: forecast.daily.temperature_2m_min[dayIndex],
    snowfall: forecast.daily.snowfall_sum[dayIndex],
  })) ?? [];
  const maxSnow = Math.max(...daily.map((day) => day.snowfall), 1);

  return (
    <div className="resort-detail-page">
      <section className="resort-detail-hero">
        <div>
          <Link className="back-to-map" to="/">← 返回地圖</Link>
          <p className="resort-location">{town.prefecture} · {town.name}</p>
          <h1>{resort}</h1>
          <p className="resort-intro">查看雪道入口、區域即時天氣與未來 7 天降雪預報。</p>
        </div>
        <div className="resort-hero-motif" aria-hidden="true"><HandDrawnMotif type={town.motif} /></div>
      </section>

      <section className="resort-info-grid" aria-label={`${resort}雪場資訊`}>
        <article className="trail-card resort-info-card">
          <p className="card-kicker">TRAIL MAP</p>
          <h2>雪道資訊</h2>
          <div className="trail-sketch"><CartoonTrailMap resort={resort} /></div>
          <p>卡通圖呈現雪道難度與纜車動線；雪道開放及運行狀況請以雪場官方資訊為準。</p>
        </article>

        <div className="resort-weather-column">
          <article className="current-weather-card resort-info-card">
          <p className="card-kicker">CURRENT WEATHER</p>
          <h2>目前天氣</h2>
          {weatherState === "loading" && <p className="weather-message">正在取得最新預報…</p>}
          {weatherState === "error" && <p className="weather-message">暫時無法取得天氣資料，請稍後再試。</p>}
          {weatherState === "ready" && forecast?.current && (
            <>
              <div className="current-weather-main">
                <span>{weatherSymbol(forecast.current.weather_code)}</span>
                <strong>{Math.round(forecast.current.temperature_2m)}°</strong>
                <p>{weatherLabels[forecast.current.weather_code] ?? "天氣變化"}</p>
              </div>
              <dl className="weather-metrics">
                <div><dt>體感</dt><dd>{Math.round(forecast.current.apparent_temperature)}°C</dd></div>
                <div><dt>風速</dt><dd>{Math.round(forecast.current.wind_speed_10m)} km/h</dd></div>
                <div><dt>當前降雪</dt><dd>{forecast.current.snowfall.toFixed(1)} cm</dd></div>
              </dl>
            </>
          )}
          <small>以 {town.name} 座標提供區域預報，山頂實況可能不同。</small>
          </article>

          <section className="snow-forecast-card">
            <div className="forecast-heading">
              <div><p className="card-kicker">7-DAY SNOWFALL</p><h2>未來 7 天降雪量</h2></div>
              <small>單位：cm</small>
            </div>
            {weatherState === "loading" && <p className="weather-message">正在載入 7 天降雪預報…</p>}
            {weatherState === "error" && <p className="weather-message">降雪預報暫時無法顯示。</p>}
            {weatherState === "ready" && (
              <div className="snowfall-chart">
                {daily.map((day) => {
                  const label = new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`));
                  return (
                    <div className="snowfall-day" key={day.date}>
                      <span>{label}</span>
                      <div className="snowfall-track"><i style={{ height: `${Math.max((day.snowfall / maxSnow) * 100, day.snowfall > 0 ? 8 : 2)}%` }} /></div>
                      <strong>{day.snowfall.toFixed(1)}</strong>
                      <small>{Math.round(day.min)}° / {Math.round(day.max)}°</small>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="weather-source">區域天氣資料由 Open-Meteo 提供；實際雪況請以雪場公告為準。</p>
          </section>
        </div>
      </section>
    </div>
  );
}

export default ResortDetail;
