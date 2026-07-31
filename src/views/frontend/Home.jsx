import { useState } from "react";
import { Link } from "react-router-dom";
import HandDrawnMotif from "../../component/HandDrawnMotif";
import HomeFooter from "../../component/HomeFooter";
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
    id: "niseko",
    name: "二世古町",
    prefecture: "北海道",
    kana: "NISEKO",
    motif: "yotei",
    latitude: 42.8048,
    longitude: 140.6874,
    visualX: -154,
    visualY: 28,
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
    visualX: -182,
    visualY: -49,
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
    visualX: -198,
    visualY: -79,
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
    visualX: -201,
    visualY: 6,
    note: "札幌電視塔與雪祭",
    resorts: ["札幌手稻滑雪場", "札幌國際滑雪場", "札幌盤溪滑雪場", "札幌藻岩山滑雪場", "Fu's Snow Area"],
  },
  {
    id: "mashike",
    name: "增毛町",
    prefecture: "北海道",
    kana: "MASHIKE",
    motif: "cherry",
    latitude: 43.8569,
    longitude: 141.5252,
    visualX: -69,
    visualY: -86,
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
    visualY: -98,
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
    visualX: 126,
    visualY: -9,
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
    visualX: 224,
    visualY: -112,
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
    visualX: 232,
    visualY: -56,
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
    visualX: 232,
    visualY: 28,
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
    visualX: 157,
    visualY: -127,
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
    visualX: 136,
    visualY: 46,
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
    visualX: -155,
    visualY: -15,
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
    visualX: -195,
    visualY: 40,
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
    visualX: -300,
    visualY: 120,
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
    visualX: 155,
    visualY: -55,
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
    visualX: 195,
    visualY: -25,
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
    visualX: -360,
    visualY: 95,
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
    visualX: -240,
    visualY: 145,
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
    visualX: 205,
    visualY: 55,
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
    visualX: 205,
    visualY: 125,
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
        if (distance >= minimumDistance) continue;

        const shift = (minimumDistance - distance) / 2;
        const unitX = dx / distance;
        const unitY = dy / distance;
        a.x -= unitX * shift;
        a.y -= unitY * shift;
        b.x += unitX * shift;
        b.y += unitY * shift;
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

function Home() {
  const [activeId, setActiveId] = useState("hakuba");
  const activeTown = snowTowns.find((town) => town.id === activeId) ?? snowTowns[0];
  const renderedTowns = [
    ...snowTowns.filter((town) => town.id !== activeTown.id),
    activeTown,
  ];

  return (
    <div className="home-page">
      <section className="map-hero" aria-labelledby="map-title">
        <div className="hero-copy">
          <p className="eyebrow"><span>JAPAN</span> POWDER TRIP</p>
          <h1 id="map-title">想去哪座<br /><em>雪山</em>冒險？</h1>
        </div>

        <div className="map-stage">
          <svg className="japan-map" viewBox="1005.5 1288 570 755" role="img" aria-label="日本雪場互動地圖">
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
              const markerPosition = markerPositions.get(town.id);
              const visualX = markerPosition?.x ?? town.visualX ?? 0;
              const visualY = markerPosition?.y ?? town.visualY ?? 0;
              const location = projectLocation(town.latitude, town.longitude);
              return (
                <g
                  className={`town-marker town-marker-${town.id} ${selected ? "is-active" : ""}`}
                  key={town.id}
                  role="button"
                  tabIndex="0"
                  aria-label={`${town.prefecture}${town.name}，${town.resorts.length} 座雪場`}
                  aria-pressed={selected}
                  onMouseEnter={() => setActiveId(town.id)}
                  onFocus={() => setActiveId(town.id)}
                  onClick={() => setActiveId(town.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveId(town.id);
                    }
                  }}
                >
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
                </g>
              );
            })}
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

      <HomeFooter />
    </div>
  );
}

export default Home;
