import { trailMapProfiles } from "../data/trailMapProfiles";

const layouts = {
  wide: { top: [210, 150, 305, 112, 410, 132, 520, 96, 635, 135, 745, 108], base: [155, 258, 365, 282, 575, 265, 775, 286] },
  vertical: { top: [270, 86, 365, 72, 455, 94, 550, 76, 650, 103], base: [195, 282, 355, 285, 520, 281, 700, 286] },
  fan: { top: [185, 122, 300, 78, 430, 102, 560, 74, 695, 120], base: [210, 283, 390, 285, 560, 284, 735, 283] },
  dual: { top: [165, 118, 278, 84, 390, 112, 515, 80, 625, 112, 740, 90], base: [150, 282, 300, 282, 490, 282, 675, 282, 790, 282] },
};

function point(points, index) {
  return [points[(index * 2) % points.length], points[(index * 2 + 1) % points.length]];
}

function LiftRouteMap({ resort }) {
  if (resort === "かもい岳国際スキー場") {
    return (
      <svg className="lift-route-map kamoi-lift-route-map" viewBox="0 0 900 340" role="img" aria-label="かもい岳国際スキー場兩座 Pair Lift 動線">
        <defs><linearGradient id="kamoi-lift-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8f6fa" /><stop offset="1" stopColor="#f9fcfd" /></linearGradient></defs>
        <rect width="900" height="340" fill="url(#kamoi-lift-sky)" />
        <path className="lift-route-ridge" d="M0 220 134 153 279 176 410 106 535 159 677 111 900 173V340H0Z" />
        <path className="lift-route-base" d="M0 285 C184 260 335 299 492 274 C665 247 782 286 900 258V340H0Z" />
        <g className="lift-route-line"><line x1="350" y1="281" x2="271" y2="61" />{[.18,.35,.52,.69,.86].map((p) => <circle key={p} cx={350 - 79 * p} cy={281 - 220 * p} r="4" />)}<circle className="lift-route-station" cx="350" cy="281" r="8" /><circle className="lift-route-station" cx="271" cy="61" r="8" /></g>
        <g className="lift-route-line"><line x1="564" y1="281" x2="493" y2="153" />{[.25,.5,.75].map((p) => <circle key={p} cx={564 - 71 * p} cy={281 - 128 * p} r="4" />)}<circle className="lift-route-station" cx="564" cy="281" r="8" /><circle className="lift-route-station" cx="493" cy="153" r="8" /></g>
        <g className="kamoi-lift-route-label" transform="translate(223 142) rotate(-110)"><rect x="-72" y="-14" width="144" height="28" rx="10" /><text y="5" textAnchor="middle">第1ペアリフト · 1002m</text></g>
        <g className="kamoi-lift-route-label" transform="translate(554 196) rotate(-119)"><rect x="-70" y="-14" width="140" height="28" rx="10" /><text y="5" textAnchor="middle">第2ペアリフト · 584m</text></g>
        <g className="lift-route-legend" transform="translate(22 20)"><rect width="250" height="62" rx="14" /><text x="16" y="25">LIFT ROUTES</text><line x1="16" y1="43" x2="48" y2="43" /><circle cx="25" cy="43" r="4" /><text x="62" y="48">Pair Lift 2 座</text></g>
        <text className="lift-route-note" x="878" y="319" textAnchor="end">僅顯示上行纜車動線</text>
      </svg>
    );
  }
  const profile = trailMapProfiles[resort] ?? { lifts: 1, layout: "wide" };
  const layout = layouts[profile.layout] ?? layouts.wide;
  const lifts = Math.max(profile.lifts ?? 1, 1);

  return (
    <svg className="lift-route-map" viewBox="0 0 900 340" role="img" aria-label={`${resort}纜車動線示意圖，共 ${lifts} 座纜車或運輸設備`}>
      <defs>
        <linearGradient id="lift-route-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8f6fa" /><stop offset="1" stopColor="#f9fcfd" /></linearGradient>
      </defs>
      <rect width="900" height="340" fill="url(#lift-route-sky)" />
      <path className="lift-route-ridge" d="M0 214 98 164 193 185 305 112 402 163 505 104 614 164 716 116 814 164 900 132V340H0Z" />
      <path className="lift-route-base" d="M0 284 C173 258 326 298 478 271 C636 244 771 283 900 256V340H0Z" />
      {Array.from({ length: lifts }, (_, index) => {
        const [x1, y1] = point(layout.base, index);
        const [x2, y2] = point(layout.top, index + Math.floor(index / layout.base.length));
        const offset = Math.floor(index / layout.base.length) * 12;
        return (
          <g className="lift-route-line" key={index}>
            <line x1={x1 + offset} y1={y1} x2={x2 + offset} y2={y2} />
            {[.25, .5, .75].map((progress) => <circle key={progress} cx={x1 + offset + (x2 - x1) * progress} cy={y1 + (y2 - y1) * progress} r="4" />)}
            <circle className="lift-route-station" cx={x1 + offset} cy={y1} r="8" />
            <circle className="lift-route-station" cx={x2 + offset} cy={y2} r="8" />
          </g>
        );
      })}
      <g className="lift-route-legend" transform="translate(22 20)">
        <rect width="240" height="62" rx="14" />
        <text x="16" y="25">LIFT ROUTES</text>
        <line x1="16" y1="43" x2="48" y2="43" /><circle cx="25" cy="43" r="4" /><text x="62" y="48">纜車／運輸設備 {lifts} 座</text>
      </g>
      <text className="lift-route-note" x="878" y="319" textAnchor="end">僅顯示上行纜車動線</text>
    </svg>
  );
}

export default LiftRouteMap;
