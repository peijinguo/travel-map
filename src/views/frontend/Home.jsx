import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import HomeWaves from "../../component/HomeWaves";
import { japanPrefecturePaths, municipalityPaths } from "../../municipalityPaths";

// Calibrated to the geographic extent of the source SVG. Town anchors are
// derived from real latitude/longitude instead of hand-positioned pixels.
const projectLocation = (latitude, longitude) => ({
  x: 1090 + (longitude - 129) * 25.1,
  y: 1320 + (45.52 - latitude) * 34,
});

// Shared with the resort detail route.
// eslint-disable-next-line react-refresh/only-export-components
export const snowTowns = [
  {
    id: "nanae",
    name: "七飯町",
    prefecture: "北海道",
    kana: "NANAE",
    motif: "onumaDango",
    latitude: 41.98649,
    longitude: 140.746745,
    // Float the Onuma dango over Uchiura Bay so it stays off the map's land.
    visualX: 89,
    visualY: 10,
    pinVisual: true,
    note: "駒ヶ岳與大沼湖景",
    resorts: ["Hakodate Nanae Snow Park"],
  },
  {
    id: "mori",
    name: "森町",
    prefecture: "北海道",
    kana: "MORI",
    motif: "ikaMeshi",
    latitude: 42.00256,
    longitude: 140.60217,
    // Float the Mori ikameshi over the Japan Sea so it stays off the map's land.
    visualX: -49,
    visualY: 8,
    pinVisual: true,
    note: "大沼自然與親子雪場",
    resorts: ["グリーンピア大沼スキー場"],
  },
  {
    id: "niseko",
    name: "二世古町",
    prefecture: "北海道",
    kana: "NISEKO",
    motif: "yotei",
    latitude: 42.8048,
    longitude: 140.6874,
    visualX: -190,
    visualY: 1,
    pinVisual: true,
    note: "羊蹄山與粉雪",
    resorts: ["Niseko Tokyu Grand HIRAFU", "Niseko Village", "Niseko Annupuri", "Niseko Hanazono", "Niseko Moiwa"],
  },
  {
    id: "otaru",
    name: "小樽市",
    prefecture: "北海道",
    kana: "OTARU",
    motif: "glass",
    latitude: 43.1907,
    longitude: 140.9947,
    visualX: -151,
    visualY: -130,
    pinVisual: true,
    note: "運河與玻璃工藝",
    resorts: ["小樽天狗山滑雪場", "朝里川溫泉滑雪場", "Snow Cruise Onze"],
  },
  {
    id: "utashinai",
    name: "歌志內市",
    prefecture: "北海道",
    kana: "UTASHINAI",
    motif: "coal",
    latitude: 43.5167,
    longitude: 142.0489,
    visualX: -68,
    visualY: -128,
    pinVisual: true,
    note: "煤礦記憶與雲海之里",
    resorts: ["かもい岳国際スキー場"],
  },
  {
    id: "sapporo",
    name: "札幌市",
    prefecture: "北海道",
    kana: "SAPPORO",
    motif: "tvTower",
    latitude: 43.0618,
    longitude: 141.3545,
    visualX: -160,
    visualY: -70,
    pinVisual: true,
    note: "札幌電視塔與雪祭",
    resorts: ["札幌手稻滑雪場", "札幌國際滑雪場", "札幌盤溪滑雪場", "札幌藻岩山滑雪場", "Fu's Snow Area", "Takino Snow World Family Ski Resort"],
  },
  {
    id: "mashike",
    name: "增毛町",
    prefecture: "北海道",
    kana: "MASHIKE",
    motif: "cherry",
    latitude: 43.8569,
    longitude: 141.5252,
    visualX: -170,
    visualY: -177,
    pinVisual: true,
    note: "櫻桃果園與日本海",
    resorts: ["暑寒別岳滑雪場"],
  },
  {
    id: "horokanai",
    name: "幌加內町",
    prefecture: "北海道",
    kana: "HOROKANAI",
    motif: "soba",
    latitude: 44.0046,
    longitude: 142.1556,
    visualX: 30,
    visualY: -112,
    pinVisual: true,
    note: "日本第一的蕎麥之鄉，享受極寒粉雪。",
    resorts: ["幌立滑雪場"],
  },
  {
    id: "asahikawa",
    name: "旭川市",
    prefecture: "北海道",
    kana: "ASAHIKAWA",
    motif: "penguin",
    latitude: 43.7706,
    longitude: 142.3648,
    visualX: 135,
    visualY: -29,
    pinVisual: true,
    note: "旭山動物園",
    resorts: ["Kamui Ski Links", "Santa Present Park", "伊ノ沢市民スキー場"],
  },
  {
    id: "pippu",
    name: "比布町",
    prefecture: "北海道",
    kana: "PIPPU",
    motif: "strawberry",
    latitude: 43.8755,
    longitude: 142.4735,
    visualX: 120,
    visualY: -116,
    pinVisual: true,
    note: "草莓之鄉與大雪山連峰景觀",
    resorts: ["比布滑雪場"],
  },
  {
    id: "toma",
    name: "當麻町",
    prefecture: "北海道",
    kana: "TOHMA",
    motif: "watermelon",
    latitude: 43.828,
    longitude: 142.5085,
    visualX: 239,
    visualY: -5,
    pinVisual: true,
    note: "田園與田助西瓜",
    resorts: ["當麻山滑雪場"],
  },
  {
    id: "higashikawa",
    name: "東川町",
    prefecture: "北海道",
    kana: "HIGASHIKAWA",
    motif: "camera",
    latitude: 43.6989,
    longitude: 142.5102,
    visualX: 238,
    visualY: 38,
    pinVisual: true,
    note: "寫真之町與旭岳",
    resorts: ["Canmore Ski Village", "旭岳 Ropeway 滑雪路線"],
  },
  {
    id: "kamikawa",
    name: "上川町",
    prefecture: "北海道",
    kana: "KAMIKAWA",
    motif: "kamikawaRopeway",
    latitude: 43.8471,
    longitude: 142.7704,
    visualX: 228,
    visualY: -117,
    pinVisual: true,
    note: "層雲峽與大雪山",
    resorts: ["大雪山層雲峽黑岳滑雪場", "町營中山滑雪場"],
  },
  {
    id: "furano",
    name: "富良野市",
    prefecture: "北海道",
    kana: "FURANO",
    motif: "lavender",
    latitude: 43.342,
    longitude: 142.3832,
    visualX: 134,
    visualY: 46,
    pinVisual: true,
    note: "薰衣草花田",
    resorts: ["富良野滑雪場"],
  },
  {
    id: "hachimantai",
    name: "八幡平市",
    prefecture: "岩手縣",
    kana: "HACHIMANTAI",
    motif: "birch",
    latitude: 39.9565,
    longitude: 141.071,
    visualX: 120,
    visualY: 1,
    pinVisual: true,
    note: "安比高原白樺林",
    resorts: ["安比高原滑雪場", "八幡平度假村 Panorama 滑雪場", "八幡平度假村下倉滑雪場"],
  },
  {
    id: "shizukuishi",
    name: "雫石町",
    prefecture: "岩手縣",
    kana: "SHIZUKUISHI",
    motif: "cow",
    latitude: 39.6963,
    longitude: 140.9755,
    visualX: -169,
    visualY: 3,
    pinVisual: true,
    note: "岩手山南麓雪鄉",
    resorts: ["雫石滑雪場", "網張溫泉滑雪場", "岩手高原 Snow Park"],
  },
  {
    id: "kitakami",
    name: "北上市",
    prefecture: "岩手縣",
    kana: "KITAKAMI",
    motif: "yakeishi",
    latitude: 39.2868,
    longitude: 141.1132,
    visualX: 206,
    visualY: 10,
    pinVisual: true,
    note: "燒石連峰與夏油高原",
    resorts: ["夏油高原滑雪場"],
  },
  {
    id: "zao",
    name: "山形市",
    prefecture: "山形縣",
    kana: "YAMAGATA",
    motif: "juhyo",
    latitude: 38.1674,
    longitude: 140.3958,
    visualX: 134,
    visualY: 10,
    pinVisual: true,
    note: "藏王樹冰",
    resorts: ["藏王溫泉滑雪場", "藏王猿倉滑雪場"],
  },
  {
    id: "yuzawa",
    name: "湯澤町",
    prefecture: "新潟縣",
    kana: "YUZAWA",
    motif: "onigiri",
    latitude: 36.934,
    longitude: 138.8174,
    visualX: 110,
    visualY: 20,
    pinVisual: true,
    note: "溫泉雪鄉",
    resorts: ["GALA 湯澤", "苗場滑雪場", "神樂滑雪場", "岩原滑雪場", "湯澤高原", "神立 Snow Resort", "中里 Snow Wood"],
  },
  {
    id: "myoko",
    name: "妙高市",
    prefecture: "新潟縣",
    kana: "MYOKO",
    motif: "koshihikari",
    latitude: 36.8724,
    longitude: 138.253,
    visualX: -175,
    visualY: 20,
    pinVisual: true,
    note: "越光米之鄉",
    resorts: ["ARAI SNOW RESORT", "赤倉觀光 Resort", "赤倉溫泉滑雪場", "池之平溫泉 Alpen Blick", "妙高杉之原滑雪場", "關溫泉滑雪場"],
  },
  {
    id: "hakuba",
    name: "白馬村",
    prefecture: "長野縣",
    kana: "HAKUBA",
    motif: "hakuba",
    latitude: 36.6982,
    longitude: 137.8619,
    visualX: 1,
    visualY: 150,
    pinVisual: true,
    note: "北阿爾卑斯山",
    resorts: ["白馬八方尾根", "ABLE 白馬五龍", "Hakuba 47", "白馬岩岳 Snow Field", "白馬 Sanosaka 滑雪場"],
  },
  {
    id: "nozawa",
    name: "野澤溫泉村",
    prefecture: "長野縣",
    kana: "NOZAWA",
    motif: "onsen",
    latitude: 36.9229,
    longitude: 138.4406,
    visualX: -105,
    visualY: -15,
    pinVisual: true,
    note: "野澤菜與外湯",
    resorts: ["野澤溫泉滑雪場"],
  },
  {
    id: "yamanouchi",
    name: "山之內町",
    prefecture: "長野縣",
    kana: "YAMANOUCHI",
    motif: "monkey",
    latitude: 36.7446,
    longitude: 138.4127,
    visualX: 120,
    visualY: 140,
    pinVisual: true,
    note: "雪猴泡湯",
    resorts: ["志賀高原－奧志賀高原", "志賀高原－燒額山", "志賀高原－一之瀨", "志賀高原－高天原", "志賀高原－寺小屋", "志賀高原－東館山／發哺溫泉", "志賀高原－橫手山・澀峠", "志賀高原－熊之湯", "志賀高原－Sun Valley／丸池／蓮池"],
  },
];

// Marker art and labels occupy more room than the geographic point beneath
// them. Resolve the final visual positions once so nearby municipalities stay
// individually selectable instead of overlapping each other.
const separateMarkerPositions = (towns, minimumDistance = 102) => {
  const positions = towns.map((town) => {
    const location = projectLocation(town.latitude, town.longitude);
    return {
      id: town.id,
      pinned: Boolean(town.pinVisual),
      anchorX: location.x,
      anchorY: location.y,
      x: location.x + (town.visualX ?? 0),
      y: location.y + (town.visualY ?? 0),
    };
  });

  for (let iteration = 0; iteration < 120; iteration += 1) {
    let moved = false;
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const a = positions[first];
        const b = positions[second];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance >= minimumDistance || (a.pinned && b.pinned)) continue;

        // Pinned markers were hand-placed in open water; push their
        // neighbours the whole way instead of nudging them back onto land.
        const shift = minimumDistance - distance;
        const shareA = a.pinned ? 0 : b.pinned ? 1 : 0.5;
        const unitX = dx / distance;
        const unitY = dy / distance;
        a.x -= unitX * shift * shareA;
        a.y -= unitY * shift * shareA;
        b.x += unitX * shift * (1 - shareA);
        b.y += unitY * shift * (1 - shareA);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return new Map(positions.map((position) => [position.id, {
    x: position.x - position.anchorX,
    y: position.y - position.anchorY,
  }]));
};

const markerPositions = separateMarkerPositions(snowTowns);

// Wide screens show the map's own area and let the icons spill out of the svg
// box. Phones size the svg to hold every icon (where it stands on every
// screen) and its name tag instead: Safari only answers taps inside an svg's
// box, so icons outside it could not be tapped.
const DESKTOP_VIEWBOX = "1005.5 1288 570 755";
// Japan's outline, grown to take in every icon (half an icon around it) and
// the name tag under it.
const PHONE_VIEWBOX = (() => {
  let [x0, y0, x1, y1] = [1104, 1320, 1512, 1814];
  snowTowns.forEach((town) => {
    const anchor = projectLocation(town.latitude, town.longitude);
    const offset = markerPositions.get(town.id);
    const x = anchor.x + offset.x;
    const y = anchor.y + offset.y;
    x0 = Math.min(x0, x - 32);
    x1 = Math.max(x1, x + 32);
    y0 = Math.min(y0, y - 32);
    y1 = Math.max(y1, y + 52);
  });
  return [x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6].map(Math.round).join(" ");
})();
const PHONE_QUERY = "(max-width: 760px)";

const usePhoneLayout = () => {
  const [phone, setPhone] = useState(() => window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
};

function Home() {
  const [activeId, setActiveId] = useState("hakuba");
  // A clicked town stays on the card while the mouse passes over other towns;
  // until one is clicked, hovering previews each town. Clicking the pinned
  // town again lets hovering take over again.
  const [pinnedId, setPinnedId] = useState(null);
  // While another town is pinned, the town under the mouse gets a copy drawn
  // on top of every marker. Moving the hovered marker itself in the DOM would
  // drop its :hover and pointer state, so it stays put and the copy shows.
  const [hoverId, setHoverId] = useState(null);
  const preview = (id) => {
    if (!pinnedId) setActiveId(id);
  };
  const pick = (id) => {
    setActiveId(id);
    setPinnedId((pinned) => (pinned === id ? null : id));
  };
  const phone = usePhoneLayout();
  const activeTown = snowTowns.find((town) => town.id === activeId) ?? snowTowns[0];
  const hoverTown = hoverId && hoverId !== activeTown.id
    ? snowTowns.find((town) => town.id === hoverId)
    : null;
  const renderedTowns = [
    ...snowTowns.filter((town) => town.id !== activeTown.id),
    activeTown,
  ];
  const markerArt = (town) => {
    const markerPosition = markerPositions.get(town.id);
    const visualX = markerPosition?.x ?? town.visualX ?? 0;
    const visualY = markerPosition?.y ?? town.visualY ?? 0;
    const location = projectLocation(town.latitude, town.longitude);
    return (
      <>
        {(municipalityPaths[town.id] ?? []).map((path, index) => (
          <path className="municipality-shape" d={path} fillRule="evenodd" key={`${town.id}-boundary-${index}`} />
        ))}
        <g className="marker-position" transform={`translate(${location.x} ${location.y})`}>
          {(visualX !== 0 || visualY !== 0) && (
            <line className="marker-leader" x1="0" y1="0" x2={visualX} y2={visualY} />
          )}
          <g className="marker-visual" transform={`translate(${visualX} ${visualY})`}>
            <g className="marker-pop">
              <HandDrawnMotif type={town.motif} className="marker-motif" />
              <g className="marker-label" transform="translate(0 25)">
                <rect x="-34" y="0" width="68" height="23" rx="11.5" />
                <text x="0" y="15" textAnchor="middle">{town.name}</text>
              </g>
            </g>
          </g>
        </g>
      </>
    );
  };

  return (
    <div className="home-page">
      <HomeWaves />
      <section className="map-hero" aria-labelledby="map-title">
        <div className="hero-copy">
          <h1 id="map-title" className="visually-hidden">日本雪場地圖</h1>
        </div>

        <div className="map-stage">
          <svg className="japan-map" viewBox={phone ? PHONE_VIEWBOX : DESKTOP_VIEWBOX} role="img" aria-label="日本雪場互動地圖">
            <g className="japan-geography" aria-hidden="true">
              {japanPrefecturePaths.flatMap((prefecture) =>
                prefecture.paths.map((path, index) => (
                  <path
                    className="prefecture-shape"
                    d={path}
                    fillRule="evenodd"
                    key={`${prefecture.id}-${index}`}
                  />
                )),
              )}
            </g>
            {renderedTowns.map((town) => {
              const selected = town.id === activeId;
              return (
                <g
                  className={`town-marker town-marker-${town.id} ${selected ? "is-active" : ""}`}
                  key={town.id}
                  role="button"
                  tabIndex="0"
                  aria-label={`${town.prefecture}${town.name}，${town.resorts.length} 座雪場`}
                  aria-pressed={selected}
                  // Only a real mouse previews on hover; on a touch screen the
                  // tap itself picks the town.
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "mouse") return;
                    setHoverId(town.id);
                    preview(town.id);
                  }}
                  onPointerLeave={() => setHoverId((id) => (id === town.id ? null : id))}
                  onFocus={() => preview(town.id)}
                  onClick={() => pick(town.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      pick(town.id);
                    }
                  }}
                >
                  {markerArt(town)}
                </g>
              );
            })}
            {hoverTown && (
              <g className={`town-marker town-marker-${hoverTown.id} is-active is-hover-copy`} aria-hidden="true" key={`copy-${hoverTown.id}`}>
                {markerArt(hoverTown)}
              </g>
            )}
          </svg>
        </div>

        <aside className="resort-panel" aria-live="polite">
          <div className="panel-topline"><span>{activeTown.prefecture}</span><span>{activeTown.kana}</span></div>
          <div className="town-heading">
            <div className="town-illustration"><HandDrawnMotif type={activeTown.motif} /></div>
            <div><h2>{activeTown.name}</h2><p>{activeTown.note}</p></div>
          </div>
          <ul className="resort-list">
            {activeTown.resorts.map((resort, index) => (
              <li key={resort}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Link to={`/resorts/${activeTown.id}/${index}`}>{resort}</Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>

    </div>
  );
}

export default Home;
