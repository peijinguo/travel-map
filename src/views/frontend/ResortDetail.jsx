import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import CartoonTrailMap from "../../component/CartoonTrailMap";
import LiftRouteMap from "../../component/LiftRouteMap";
import ZaoLiftStatusMap from "../../component/ZaoLiftStatusMap";
import { zaoLiftStatuses } from "../../data/zaoLiftStatus";
import { useAuth } from "../../context/AuthContext";
import {
  loadResortNoteCloud,
  saveResortNoteCloud,
} from "../../services/firebase";
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

const zaoTrailMapUrl =
  "https://zaomountainresort.com/wp-content/uploads/2025/12/ed53c4ff5e3d9f4e6125d52781bc7b50-scaled.jpg";
const zaoSarukuraWinterUrl = "http://www.zao-sarukura.co.jp/winter.html";
const zaoLiftStatusUrl =
  "https://zaomountainresort.com/ropeway-lift-information/";
const kamuiTodayUrl = "https://www.kamui-skilinks.com/today/#coursemap";
const appiTrailMapUrl =
  "https://www.appi.co.jp/snow-mountain-resort/assets/img/course/course_2025-26_all.jpg?1785064646792";
const appiWeatherUrl = "https://www.appi.co.jp/snow-mountain-resort/";
const appiLiftStatusUrl =
  "https://www.appi.co.jp/snow-mountain-resort/info/";
const appiLiftStatusMapUrl =
  "https://www.appi.co.jp/snow-mountain-resort/assets/img/info/condition_back.jpg";
const kamuiCourseMapUrl =
  "https://www.kamui-skilinks.com/pdf_data/coursemap2024.pdf";
const kamuiCourseMapImage =
  `${import.meta.env.BASE_URL}assets/kamui-ski-links-course-map.png`;
const pippuTrailMapUrl =
  "https://pippu.ski/wp/wp-content/uploads/2026/05/pippu_panfu2024-scaled.jpg";
const kamuiLiftStatuses = [
  { name: "Kamui Gondola", officialName: "カムイゴンドラ", status: "CLOSED" },
  { name: "第 1 號纜車", officialName: "第1リフト", status: "CLOSED" },
  { name: "第 2 號纜車", officialName: "第2リフト", status: "CLOSED" },
  { name: "第 3 號纜車", officialName: "第3リフト", status: "CLOSED" },
  { name: "第 4 號纜車", officialName: "第4リフト", status: "CLOSED" },
  { name: "第 5 號纜車", officialName: "第5リフト", status: "CLOSED" },
];
const zaoSarukuraLiftStatuses = [
  {
    name: "第 1 Romance Lift",
    officialName: "ZAO猿倉第1ロマンスリフト · 300 m",
    status: "CLOSED",
  },
  {
    name: "第 2 Romance Lift",
    officialName: "ZAO猿倉第2ロマンスリフト · 500 m",
    status: "CLOSED",
  },
];
const appiLiftStatuses = [
  { name: "安比 Gondola", officialName: "安比ゴンドラ", status: "營運中", hours: "8:00–15:00", isOpen: true },
  { name: "Central Quad", officialName: "セントラルクワッド", status: "未運行" },
  { name: "Central 第 2 纜車", officialName: "セントラル第2リフト", status: "未運行" },
  { name: "Central 第 3 纜車", officialName: "セントラル第3リフト", status: "未運行" },
  { name: "Central 第 5 纜車", officialName: "セントラル第5リフト", status: "未運行" },
  { name: "Sailer Quad", officialName: "ザイラークワッド", status: "未運行" },
  { name: "Vista Quad", officialName: "ビスタクワッド", status: "未運行" },
];
const appiLiftStatusLayers = [
  { name: "Vista Quad", file: "01_s.gif", left: "20.1%", top: "18.4%", width: "26.1%" },
  { name: "Sailer Quad", file: "02_s.gif", left: "19.7%", top: "16.5%", width: "30.5%" },
  { name: "Sailer 第 2 Lift", file: "05_s.gif", left: "32.5%", top: "30.9%", width: "15.6%" },
  { name: "安比 Gondola・營運中", file: "07_e.gif", left: "51.9%", top: "4.2%", width: "13.9%" },
  { name: "Central Quad", file: "11_s.gif", left: "67.4%", top: "66.1%", width: "20.4%" },
  { name: "Central 第 2 Lift", file: "12_s.gif", left: "62.2%", top: "41.8%", width: "29.7%" },
  { name: "Central 第 5 Lift", file: "13_s.gif", left: "58%", top: "15.9%", width: "15.2%" },
  { name: "Central 第 3 Lift", file: "09_s.gif", left: "57.3%", top: "12%", width: "14.9%" },
];
const appiCourseStatusLayers = [
  ["01_c.png", 52.76, 16.937, 4.341], ["02_c.png", 56.395, 33.413, 5.704],
  ["03_c.png", 60.787, 52.852, 6.614], ["04_c.png", 54.982, 17.123, 2.524],
  ["05_c.png", 56.547, 22.492, 3.534], ["06_c.png", 58.667, 32.675, 3.331],
  ["07_c.png", 61.191, 42.669, 3.938], ["08_c.png", 64.069, 51.465, 5.856],
  ["09_c.png", 64.927, 68.959, 3.383], ["50_c.png", 62.504, 70.718, 3.433],
  ["11_c.png", 63.817, 71.273, 2.574], ["12_c.png", 57.405, 66.459, 7.825],
  ["13_c.png", 59.424, 32.211, 12.218], ["10_c.png", 72.349, 63.59, 4.189],
  ["14_c.png", 58.868, 22.123, 3.787], ["15_c.png", 62.05, 27.675, 10.45],
  ["16_c.png", 69.269, 42.669, 1.414], ["17_c.png", 72.703, 43.041, 5.352],
  ["18_c.png", 71.339, 43.318, 2.069], ["19_c.png", 59.626, 21.937, 5.806],
  ["20_c.png", 64.877, 25.732, 9.845], ["21_c.png", 75.024, 34.154, 5.756],
  ["22_c.png", 74.166, 34.803, 5.099], ["23_c.png", 53.214, 14.809, 29.485],
  ["24_c.png", 79.418, 37.672, 2.979], ["25_c.png", 74.066, 46.096, 6.311],
  ["26_c.png", 68.108, 65.904, 5.503], ["27_c.png", 74.066, 10.181, 6.664],
  ["28_c.png", 75.177, 14.531, 14.187], ["29_c.png", 48.922, 30.175, 12.218],
  ["30_c.png", 51.042, 33.785, 5.907], ["31_c.png", 47.761, 17.494, 4.442],
  ["32_c.png", 30.09, 32.303, 18.781], ["34_c.png", 52.609, 45.724, 5.099],
  ["35_c.png", 35.189, 43.782, 16.56], ["36_c.png", 34.231, 37.858, 13.278],
  ["38_c.png", 35.493, 18.419, 13.58], ["39_c.png", 35.493, 31.84, 3.079],
  ["40_c.png", 27.465, 43.782, 4.948], ["41_c.png", 37.512, 13.976, 13.429],
  ["42_c.png", 31.353, 30.73, 6.311], ["43_c.png", 21.356, 42.949, 10.45],
  ["44_c.png", 46.095, 14.623, 3.331], ["45_c.png", 34.231, 17.4, 11.763],
  ["46_c.png", 35.089, 28.601, 3.231], ["47_c.png", 19.589, 33.785, 14.691],
  ["57_c.png", 77.953, 12.68, 5.806], ["58_c.png", 74.722, 14.995, 2.625],
  ["59_c.png", 49.478, 18.233, 5.402], ["60_c.png", 51.042, 35.913, 6.007],
  ["61_c.png", 37.714, 18.233, 11.259],
].map(([file, left, top, width]) => ({
  file,
  left: `${left}%`,
  top: `${top}%`,
  width: `${width}%`,
}));
const SNOW_SAPPORO_WEATHER_API =
  "https://snowsapporo.com/tw/wp-json/wp/v2/pages/11";
const snowSapporoResorts = {
  "札幌藻岩山滑雪場": {
    sourceName: "札幌藻岩山滑雪場",
    detailUrl: "https://snowsapporo.com/tw/skiarea/moiwa/",
  },
  "札幌手稻滑雪場": {
    sourceName: "札幌手稻滑雪場",
    detailUrl: "https://snowsapporo.com/tw/skiarea/teine/",
  },
  "札幌國際滑雪場": {
    sourceName: "札幌國際滑雪場",
    detailUrl: "https://snowsapporo.com/tw/skiarea/kokusai/",
  },
  "札幌盤溪滑雪場": {
    sourceName: "札幌盤溪滑雪場",
    detailUrl: "https://snowsapporo.com/tw/skiarea/bankei/",
  },
  "Fu's Snow Area": {
    sourceName: "Fu’s snow.area",
    detailUrl: "https://snowsapporo.com/tw/skiarea/fus/",
  },
};

const snowSapporoWeatherLabel = (weather) => {
  const normalized = weather.toLocaleLowerCase();
  if (normalized.includes("snow")) return "降雪";
  if (normalized.includes("rain")) return "降雨";
  if (normalized.includes("cloud")) return "多雲";
  if (normalized.includes("clear") || normalized.includes("sun")) return "晴朗";
  if (normalized.includes("fog") || normalized.includes("mist")) return "有霧";
  return weather || "天氣變化";
};

const snowSapporoWeatherSymbol = (weather) => {
  const normalized = weather.toLocaleLowerCase();
  if (normalized.includes("snow")) return "❄";
  if (normalized.includes("rain")) return "雨";
  if (normalized.includes("cloud")) return "雲";
  if (normalized.includes("clear") || normalized.includes("sun")) return "晴";
  return "天";
};

function parseSnowSapporoWeather(html, sourceName) {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  const block = [...documentNode.querySelectorAll(".skiarea_block")].find(
    (candidate) => candidate.querySelector("h3")?.textContent.trim() === sourceName,
  );
  if (!block) return null;
  const temperatureText =
    block.querySelector(".temperature dd")?.textContent.trim() ?? "";
  return {
    temperature: Number.parseFloat(temperatureText),
    weather: block.querySelector(".weather dd")?.textContent.trim() ?? "",
    snow: block.querySelector(".snow dd")?.textContent.trim() ?? "–",
    updatedAt: block.querySelector("time")?.textContent.trim() ?? "",
  };
}

function ResortExperienceNote({ resort, storageKey }) {
  const { user, authReady, isFirebaseConfigured, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [experienceNote, setExperienceNote] = useState(
    () => localStorage.getItem(storageKey) ?? "",
  );
  const [noteStatus, setNoteStatus] = useState("");
  const [cloudLoadedFor, setCloudLoadedFor] = useState(null);
  const latestNoteRef = useRef(experienceNote);

  useEffect(() => {
    latestNoteRef.current = experienceNote;
    localStorage.setItem(storageKey, experienceNote);
  }, [experienceNote, storageKey]);

  useEffect(() => {
    let cancelled = false;
    setCloudLoadedFor(null);
    if (!cloudKey) return undefined;

    loadResortNoteCloud(cloudKey, storageKey)
      .then(async (cloudNote) => {
        if (cancelled) return;
        if (cloudNote === null) {
          const localNote = localStorage.getItem(storageKey) ?? "";
          if (localNote) {
            await saveResortNoteCloud(cloudKey, storageKey, localNote);
          }
        } else if (latestNoteRef.current === experienceNote) {
          setExperienceNote(cloudNote);
        }
        if (!cancelled) {
          setCloudLoadedFor(cloudKey);
          setNoteStatus("已同步至雲端");
        }
      })
      .catch((error) => {
        console.error("無法載入雲端筆記", error);
        if (!cancelled) setNoteStatus("雲端同步失敗，內容已保存在此裝置");
      });

    return () => {
      cancelled = true;
    };
  }, [cloudKey, storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cloudKey || cloudLoadedFor !== cloudKey) return undefined;

    setNoteStatus("同步中…");
    const timer = window.setTimeout(() => {
      const nextNote = experienceNote.trim();
      saveResortNoteCloud(cloudKey, storageKey, nextNote)
        .then(() => setNoteStatus("已同步至雲端"))
        .catch((error) => {
          console.error("無法同步雲端筆記", error);
          setNoteStatus("雲端同步失敗，內容已保存在此裝置");
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [experienceNote, cloudKey, storageKey, cloudLoadedFor]);

  useEffect(() => {
    if (!authReady || cloudKey) return;
    setNoteStatus(
      isFirebaseConfigured
        ? "無法啟用雲端同步，內容會保存在此裝置"
        : "內容會保存在此裝置",
    );
  }, [authReady, cloudKey, isFirebaseConfigured]);

  const saveExperienceNote = async (event) => {
    event.preventDefault();
    const nextNote = experienceNote.trim();
    localStorage.setItem(storageKey, nextNote);
    setExperienceNote(nextNote);
    if (!cloudKey) {
      setNoteStatus("已儲存在此裝置");
      return;
    }
    try {
      await saveResortNoteCloud(cloudKey, storageKey, nextNote);
      setNoteStatus("已同步至雲端");
    } catch {
      setNoteStatus("已儲存在此裝置，雲端同步失敗");
    }
  };

  return (
    <section className="resort-experience-card" aria-labelledby="resort-experience-title">
      <div className="experience-heading">
        <div>
          <p className="card-kicker">MY EXPERIENCE</p>
          <h2 id="resort-experience-title">雪場體驗</h2>
        </div>
      </div>

      <form onSubmit={saveExperienceNote}>
        <label htmlFor="resort-experience-note">我在 {resort} 的紀錄</label>
        <textarea
          id="resort-experience-note"
          value={experienceNote}
          onChange={(event) => {
            setExperienceNote(event.target.value);
          }}
          placeholder="例如：上午雪況較鬆、最喜歡的雪道、適合的裝備……"
          rows="6"
        />
        <div className="experience-actions">
          <span role="status" aria-live="polite">{noteStatus}</span>
          <button type="submit">儲存</button>
        </div>
      </form>
    </section>
  );
}

function KamuiLiftStatus() {
  return (
    <div className="kamui-lift-status">
      <div className="kamui-lift-status-summary">
        <div>
          <span className="kamui-status-dot" aria-hidden="true" />
          <div>
            <strong>目前全數停駛</strong>
            <small>OFFICIAL STATUS · CLOSED</small>
          </div>
        </div>
        <a href={kamuiTodayUrl} target="_blank" rel="noreferrer">
          查看官方即時資訊 ↗
        </a>
      </div>
      <ul aria-label="Kamui Ski Links 官方纜車運行狀況">
        {kamuiLiftStatuses.map((lift) => (
          <li key={lift.officialName}>
            <div>
              <strong>{lift.name}</strong>
              <small>{lift.officialName}</small>
            </div>
            <span className="kamui-lift-closed">{lift.status}</span>
          </li>
        ))}
      </ul>
      <p>
        纜車可能因天候或其他因素部分或全面停駛；最新狀態請以官方頁面為準。
      </p>
    </div>
  );
}

function ZaoSarukuraLiftStatus() {
  return (
    <div className="kamui-lift-status">
      <div className="kamui-lift-status-summary">
        <div>
          <span className="kamui-status-dot" aria-hidden="true" />
          <div>
            <strong>2025–26 雪季已結束</strong>
            <small>OFFICIAL STATUS · SEASON CLOSED</small>
          </div>
        </div>
        <a href={zaoSarukuraWinterUrl} target="_blank" rel="noreferrer">
          查看官方即時資訊 ↗
        </a>
      </div>
      <ul aria-label="藏王猿倉滑雪場官方纜車運行狀況">
        {zaoSarukuraLiftStatuses.map((lift) => (
          <li key={lift.officialName}>
            <div>
              <strong>{lift.name}</strong>
              <small>{lift.officialName}</small>
            </div>
            <span className="kamui-lift-closed">{lift.status}</span>
          </li>
        ))}
      </ul>
      <p>
        官方公告雪場已於 2026 年 3 月 8 日結束本季營業；兩座纜車目前停止運行。
      </p>
    </div>
  );
}

function ZaoOnsenLiftStatus() {
  const statusLabel = (status) => ({
    平常運転: "正常運轉",
    通常運転: "正常運轉",
    運行中: "正常運轉",
    運転見合わせ: "暫停運轉",
    シーズン終了: "雪季結束",
  })[status] || status;
  const isOpen = (status) => ["平常運転", "通常運転", "運行中"].includes(status);
  const displayTime = (time) => time?.replace(/:00$/, "");

  return (
    <div className="kamui-lift-status">
      <figure className="appi-lift-status-map zao-lift-status-map">
        <ZaoLiftStatusMap lifts={zaoLiftStatuses} />
        <figcaption>
          藍線：正常運轉 · 灰線：停駛／雪季結束 ·{" "}
          <a href={zaoLiftStatusUrl} target="_blank" rel="noreferrer">
            開啟官方互動圖 ↗
          </a>
        </figcaption>
      </figure>
      <ul aria-label="藏王溫泉滑雪場官方 Ropeway 與纜車運行狀況">
        {zaoLiftStatuses.map((lift) => (
          <li key={lift.number}>
            <div>
              <strong>{lift.number}. {lift.name}</strong>
              {(lift.openTime || lift.closeTime) && (
                <small>{displayTime(lift.openTime)}–{displayTime(lift.closeTime)}</small>
              )}
            </div>
            <span className={`kamui-lift-closed ${isOpen(lift.officialStatus) ? "is-open" : ""}`}>
              {statusLabel(lift.officialStatus)}
            </span>
          </li>
        ))}
      </ul>
      <p>
        運行狀態可能因天候臨時調整；最新狀態請以藏王溫泉官方頁面為準。
      </p>
    </div>
  );
}

function AppiLiftStatus() {
  return (
    <div className="kamui-lift-status">
      <figure className="appi-lift-status-map">
        <a href={appiLiftStatusUrl} target="_blank" rel="noreferrer">
          <span className="appi-lift-status-map-canvas">
            <img
              className="appi-lift-status-map-base"
              src={appiLiftStatusMapUrl}
              alt="安比高原官方 Course 與 Lift 運行狀況圖"
              referrerPolicy="no-referrer"
            />
            <span className="appi-lift-status-map-date">
              7 月 26 日 雪道／纜車運行狀況
            </span>
            {appiCourseStatusLayers.map((layer) => (
              <img
                className="appi-course-status-layer"
                key={layer.file}
                src={`https://www.appi.co.jp/snow-mountain-resort/assets/img/info/course/${layer.file}`}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                style={{
                  left: layer.left,
                  top: layer.top,
                  width: layer.width,
                }}
              />
            ))}
            {appiLiftStatusLayers.map((layer) => (
              <img
                className="appi-lift-status-layer"
                key={layer.file}
                src={`https://www.appi.co.jp/snow-mountain-resort/assets/img/info/lift/${layer.file}`}
                alt={layer.name}
                referrerPolicy="no-referrer"
                style={{
                  left: layer.left,
                  top: layer.top,
                  width: layer.width,
                }}
              />
            ))}
          </span>
        </a>
        <figcaption>
          <a href={appiLiftStatusUrl} target="_blank" rel="noreferrer">
            查看官方完整 Course／Lift 狀態圖 ↗
          </a>
        </figcaption>
      </figure>
      <ul aria-label="安比高原滑雪場官方纜車運行狀況">
        {appiLiftStatuses.map((lift) => (
          <li key={lift.officialName}>
            <div>
              <strong>{lift.name}</strong>
              <small>{lift.officialName}{lift.hours ? ` · ${lift.hours}` : ""}</small>
            </div>
            <span className={`kamui-lift-closed ${lift.isOpen ? "is-open" : ""}`}>
              {lift.status}
            </span>
          </li>
        ))}
      </ul>
      <p>
        上行纜車營運至 15:00，下行最終搭乘時間為 16:00；實際運行可能因天候調整，請以官方資訊為準。
      </p>
    </div>
  );
}

function ResortDetail() {
  const { townId, resortIndex } = useParams();
  const town = snowTowns.find((item) => item.id === townId);
  const index = Number(resortIndex);
  const resort = town?.resorts[index];
  const [forecast, setForecast] = useState(null);
  const [weatherState, setWeatherState] = useState("loading");
  const [snowSapporoResult, setSnowSapporoResult] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHeroCompact, setIsHeroCompact] = useState(false);
  const heroRef = useRef(null);

  const noteStorageKey = `resort-experience:${townId}:${resortIndex}`;
  const favoriteStorageKey = `resort-favorite:${townId}:${resortIndex}`;
  const isOfficialMoiwa = resort === "Niseko Moiwa";
  const isOfficialOnze = resort === "Snow Cruise Onze";
  const isZaoOnsen = resort === "藏王溫泉滑雪場";
  const isZaoSarukura = resort === "藏王猿倉滑雪場";
  const isKamuiSkiLinks = resort === "Kamui Ski Links";
  const isAppiKogen = resort === "安比高原滑雪場";
  const isPippu = resort === "比布滑雪場";
  const snowSapporoConfig = snowSapporoResorts[resort];
  const usesSnowSapporo = Boolean(snowSapporoConfig);
  const snowSapporoState = !usesSnowSapporo
    ? "idle"
    : snowSapporoResult?.sourceName === snowSapporoConfig.sourceName
      ? snowSapporoResult.status
      : "loading";
  const snowSapporoWeather =
    snowSapporoState === "ready" ? snowSapporoResult.weather : null;

  useEffect(() => {
    const syncFavorite = () => {
      setIsFavorite(localStorage.getItem(favoriteStorageKey) === "true");
    };
    syncFavorite();
    window.addEventListener("storage", syncFavorite);
    window.addEventListener("resort-favorites-changed", syncFavorite);
    return () => {
      window.removeEventListener("storage", syncFavorite);
      window.removeEventListener("resort-favorites-changed", syncFavorite);
    };
  }, [favoriteStorageKey]);

  useEffect(() => {
    const updateCompactHero = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? Infinity;
      setIsHeroCompact(heroBottom <= 88);
    };
    updateCompactHero();
    window.addEventListener("scroll", updateCompactHero, { passive: true });
    return () => window.removeEventListener("scroll", updateCompactHero);
  }, []);

  const toggleFavorite = () => {
    setIsFavorite((current) => {
      const next = !current;
      localStorage.setItem(favoriteStorageKey, String(next));
      window.dispatchEvent(new CustomEvent("resort-favorites-changed"));
      return next;
    });
  };

  useEffect(() => {
    if (!town || !resort) return undefined;
    const controller = new AbortController();
    const query = new URLSearchParams({
      latitude: String(town.latitude),
      longitude: String(town.longitude),
      current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,snowfall",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum,wind_speed_10m_max",
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
  }, [town, resort, isOfficialMoiwa]);

  useEffect(() => {
    if (!snowSapporoConfig) return undefined;
    const controller = new AbortController();
    fetch(SNOW_SAPPORO_WEATHER_API, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Snow Sapporo request failed");
        return response.json();
      })
      .then((page) => {
        const weather = parseSnowSapporoWeather(
          page.content?.rendered ?? "",
          snowSapporoConfig.sourceName,
        );
        if (!weather || !Number.isFinite(weather.temperature))
          throw new Error("Snow Sapporo resort data missing");
        setSnowSapporoResult({
          sourceName: snowSapporoConfig.sourceName,
          status: "ready",
          weather,
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setSnowSapporoResult({
            sourceName: snowSapporoConfig.sourceName,
            status: "error",
            weather: null,
          });
      });
    return () => controller.abort();
  }, [snowSapporoConfig]);

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
    wind: forecast.daily.wind_speed_10m_max?.[dayIndex] ?? 0,
  })) ?? [];
  const maxSnow = Math.max(...daily.map((day) => day.snowfall), 1);

  return (
    <div className="resort-detail-page">
      <section className="resort-detail-hero" ref={heroRef}>
        <div>
          <Link className="back-to-map" to="/">← 返回地圖</Link>
          <p className="resort-location">{town.prefecture} · {town.name}</p>
          <h1>{resort}</h1>
          <p className="resort-intro">查看雪道入口、區域即時天氣與未來 7 天降雪預報。</p>
          <button
            className={`favorite-resort-button ${isFavorite ? "is-favorite" : ""}`}
            type="button"
            aria-pressed={isFavorite}
            onClick={toggleFavorite}
          >
            <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
            {isFavorite ? "已加入我的收藏" : "加入我的收藏"}
          </button>
        </div>
        <div className="resort-hero-motif" aria-hidden="true"><HandDrawnMotif type={town.motif} /></div>
      </section>
      {isHeroCompact && (
        <section className="compact-resort-hero" aria-label={`${resort} resort heading`}>
          <div>
            <p className="resort-location">{town.prefecture} 繚 {town.name}</p>
            <h1>{resort}</h1>
          </div>
          <div className="resort-hero-motif" aria-hidden="true"><HandDrawnMotif type={town.motif} /></div>
        </section>
      )}

      <section className="resort-info-grid" aria-label={`${resort}雪場資訊`}>
        <article className="trail-card resort-info-card">
          <p className="card-kicker">TRAIL MAP</p>
          <h2>雪道資訊</h2>
          {isAppiKogen ? (
            <figure className="official-trail-map">
              <a href={appiTrailMapUrl} target="_blank" rel="noreferrer">
                <img
                  src={appiTrailMapUrl}
                  alt="安比高原滑雪場 2025–26 雪道圖"
                />
              </a>
            </figure>
          ) : isPippu ? (
            <figure className="official-trail-map">
              <a href={pippuTrailMapUrl} target="_blank" rel="noreferrer">
                <img src={pippuTrailMapUrl} alt="比布滑雪場官方雪道圖" />
              </a>
            </figure>
          ) : isZaoOnsen ? (
            <figure className="official-trail-map">
              <a href={zaoTrailMapUrl} target="_blank" rel="noreferrer">
                <img src={zaoTrailMapUrl} alt="藏王溫泉滑雪場雪道圖" />
              </a>
            </figure>
          ) : isKamuiSkiLinks ? (
            <figure className="official-trail-map">
              <a href={kamuiCourseMapUrl} target="_blank" rel="noreferrer">
                <img
                  src={kamuiCourseMapImage}
                  alt="Kamui Ski Links 官方 Course Map"
                />
              </a>
            </figure>
          ) : (
            <div className="trail-sketch"><CartoonTrailMap resort={resort} /></div>
          )}
          <div className="lift-route-section">
            <div className="lift-route-heading"><p className="card-kicker">LIFT STATUS</p><h3>纜車運行狀況</h3></div>
            {isKamuiSkiLinks ? (
              <KamuiLiftStatus />
            ) : isZaoOnsen ? (
              <ZaoOnsenLiftStatus />
            ) : isZaoSarukura ? (
              <ZaoSarukuraLiftStatus />
            ) : isAppiKogen ? (
              <AppiLiftStatus />
            ) : (
              <div className="lift-route-sketch"><LiftRouteMap resort={resort} /></div>
            )}
          </div>
        </article>

        <div className="resort-weather-column">
          <article className="current-weather-card resort-info-card">
          <p className="card-kicker">CURRENT WEATHER</p>
          <h2>目前天氣</h2>
          {!isOfficialOnze && !isZaoSarukura && !isAppiKogen && (usesSnowSapporo ? snowSapporoState === "loading" : weatherState === "loading") && <p className="weather-message">正在取得最新預報…</p>}
          {!isOfficialOnze && !isZaoSarukura && !isAppiKogen && (usesSnowSapporo ? snowSapporoState === "error" : weatherState === "error") && <p className="weather-message">暫時無法取得天氣資料，請稍後再試。</p>}
          {isOfficialMoiwa && <><div className="official-moiwa-status"><span aria-hidden="true">⏸</span><div><strong>2025–26 SEASON COMPLETE</strong><p>官方公告：本季營運已結束。</p></div></div><a className="official-weather-link" href="https://niseko-moiwa.jp/slope/" target="_blank" rel="noreferrer">查看 Niseko Moiwa 官方即時公告 ↗</a></>}
          {isAppiKogen ? (
            <>
              <div className="current-weather-main">
                <span aria-hidden="true">雲</span>
                <strong>16°</strong>
                <p>陰天</p>
              </div>
              <dl className="weather-metrics">
                <div><dt>官方天氣</dt><dd>曇</dd></div>
                <div><dt>目前季節</dt><dd>2026 綠季</dd></div>
                <div><dt>官方更新</dt><dd>7/26 20:00</dd></div>
              </dl>
              <a className="official-weather-link" href={appiWeatherUrl} target="_blank" rel="noreferrer">
                查看安比高原官方即時天氣 ↗
              </a>
            </>
          ) : isZaoSarukura ? (
            <>
              <div className="official-moiwa-status">
                <span aria-hidden="true">⏸</span>
                <div>
                  <strong>2025–26 SEASON CLOSED</strong>
                  <p>官方公告：2026 年 3 月 8 日已結束本季營業。</p>
                </div>
              </div>
              <div className="current-weather-main zao-sarukura-current-weather">
                <span aria-hidden="true">—</span>
                <strong>—</strong>
                <p>官方目前未發布觀測值</p>
              </div>
              <dl className="weather-metrics">
                <div><dt>天氣／氣溫</dt><dd>未提供</dd></div>
                <div><dt>雪質／積雪</dt><dd>未提供</dd></div>
                <div><dt>官方表格時間</dt><dd>3/10 05:11</dd></div>
              </dl>
              <a className="official-weather-link" href={zaoSarukuraWinterUrl} target="_blank" rel="noreferrer">
                查看藏王猿倉官方雪況 ↗
              </a>
            </>
          ) : isOfficialOnze ? (
            <>
              <div className="official-moiwa-status">
                <span aria-hidden="true">⏸</span>
                <div><strong>SEASON CLOSED</strong><p>官方公告：2026 年 3 月 29 日已結束本季營運。</p></div>
              </div>
              <div className="current-weather-main">
                <span aria-hidden="true">🌧️</span>
                <strong>4°</strong>
                <p>濕雪</p>
              </div>
              <dl className="weather-metrics">
                <div><dt>營運狀態</dt><dd>休業</dd></div>
                <div><dt>風速</dt><dd>2 m/s</dd></div>
                <div><dt>積雪</dt><dd>30 cm</dd></div>
              </dl>
              <small>官方更新：3 月 29 日 23:00</small>
              <a className="official-weather-link" href="https://onze.jp/" target="_blank" rel="noreferrer">查看 Snow Cruise Onze 官方雪況公告 ↗</a>
            </>
          ) : usesSnowSapporo && snowSapporoState === "ready" && snowSapporoWeather ? (
            <>
              <div className="current-weather-main">
                <span>{snowSapporoWeatherSymbol(snowSapporoWeather.weather)}</span>
                <strong>{Math.round(snowSapporoWeather.temperature)}°</strong>
                <p>{snowSapporoWeatherLabel(snowSapporoWeather.weather)}</p>
              </div>
              <dl className="weather-metrics">
                <div><dt>資料來源</dt><dd>Snow Sapporo</dd></div>
                <div><dt>積雪量</dt><dd>{snowSapporoWeather.snow}</dd></div>
                <div><dt>更新時間</dt><dd>{snowSapporoWeather.updatedAt || "最新"}</dd></div>
              </dl>
              <a className="official-weather-link" href={snowSapporoConfig.detailUrl} target="_blank" rel="noreferrer">
                查看 {resort} Snow Sapporo 天氣 ↗
              </a>
            </>
          ) : weatherState === "ready" && forecast?.current && (
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
          {isAppiKogen ? (
            <small>目前天氣由安比高原官方網站提供；資料以官方更新時間為準。</small>
          ) : isZaoSarukura ? (
            <small>目前天氣以藏王猿倉官方頁面為準；休季期間未提供氣象觀測值。</small>
          ) : usesSnowSapporo ? (
            <small>目前天氣由 Snow Sapporo 提供；資料以網站更新時間為準。</small>
          ) : (
            <small>以 {town.name} 座標提供區域預報，山頂實況可能不同。</small>
          )}
          </article>

          <section className="snow-forecast-card">
            <div className="forecast-heading">
              <div><p className="card-kicker">7-DAY SNOWFALL</p><h2>未來 7 天降雪量</h2></div>
              <small>單位：cm</small>
            </div>
            {weatherState === "loading" && <p className="weather-message">正在載入 7 天降雪預報…</p>}
            {weatherState === "error" && <p className="weather-message">降雪預報暫時無法顯示。</p>}
            {isOfficialMoiwa && weatherState === "ready" && <div className="official-forecast"><div className="moiwa-forecast-grid">{daily.slice(0, 5).map((day) => <div className="moiwa-forecast-day" key={day.date}><strong>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</strong><span className="moiwa-weather-icon">{weatherSymbol(day.code)}</span><p><b>{Math.round(day.max)}°</b> <i>{Math.round(day.min)}°</i></p><small>風速 {Math.round(day.wind)} km/h</small><em>{day.snowfall.toFixed(1)} cm</em></div>)}</div><a href="https://niseko-moiwa.jp/slope/" target="_blank" rel="noreferrer">查看 Niseko Moiwa 官方 Snow Forecast ↗</a></div>}
            {!isOfficialMoiwa && weatherState === "ready" && (
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
            <p className="weather-source">
              {isAppiKogen
                ? "目前天氣由安比高原官方網站提供；7 天降雪預報由 Open-Meteo 提供。"
                : isZaoSarukura
                ? "目前天氣與雪場狀態由藏王猿倉官方網站提供；7 天降雪預報由 Open-Meteo 提供。"
                : usesSnowSapporo
                ? "目前天氣與積雪由 Snow Sapporo 提供；7 天降雪預報由 Open-Meteo 提供。"
                : "區域天氣資料由 Open-Meteo 提供；實際雪況請以雪場公告為準。"}
            </p>
          </section>
        </div>

        <ResortExperienceNote
          key={noteStorageKey}
          resort={resort}
          storageKey={noteStorageKey}
        />
      </section>
    </div>
  );
}

export default ResortDetail;
