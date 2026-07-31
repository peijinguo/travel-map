const courseStyles = {
  beginner: { fill: "#dff1e7", stroke: "#43a36f", text: "#26734b" },
  intermediate: { fill: "#fff0c8", stroke: "#e2a529", text: "#9a6700" },
  advanced: { fill: "#ffe0d8", stroke: "#e85f45", text: "#a43425" },
  expert: { fill: "#eadff2", stroke: "#9661aa", text: "#67387a" },
};

function DifficultyBadge({ x, y, level, tone = "intermediate" }) {
  const style = courseStyles[tone];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="-42"
        y="-16"
        width="84"
        height="32"
        rx="12"
        fill="#fffdf8"
        stroke={style.stroke}
        strokeWidth="2"
      />
      <text
        y="5"
        textAnchor="middle"
        fill={style.text}
        fontSize="14"
        fontWeight="900"
      >
        {level}
      </text>
    </g>
  );
}

function CourseLabel({ x, y, width, name, subtitle, tone, rotate = 0 }) {
  const style = courseStyles[tone];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <rect
        x={-width / 2}
        y="-25"
        width={width}
        height="50"
        rx="13"
        fill="#fffdf8"
        stroke={style.stroke}
        strokeWidth="2.5"
      />
      <text
        y="-3"
        textAnchor="middle"
        fill={style.text}
        fontSize="17"
        fontWeight="900"
      >
        {name}
      </text>
      <text
        y="15"
        textAnchor="middle"
        fill="#687d78"
        fontSize="10"
        fontWeight="800"
      >
        {subtitle}
      </text>
    </g>
  );
}

function Lift({ path, name, length, labelX, labelY, rotate = 0 }) {
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#76523d"
        strokeWidth="5"
        strokeDasharray="12 10"
        strokeLinecap="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#f4bd43"
        strokeWidth="2"
        strokeDasharray="12 10"
        strokeLinecap="round"
      />
      <g transform={`translate(${labelX} ${labelY}) rotate(${rotate})`}>
        <rect
          x="-84"
          y="-17"
          width="168"
          height="34"
          rx="11"
          fill="#fffaf0"
          stroke="#76523d"
          strokeWidth="2"
        />
        <text
          y="5"
          textAnchor="middle"
          fill="#634330"
          fontSize="13"
          fontWeight="900"
        >
          {name} · {length}
        </text>
      </g>
    </g>
  );
}

function Parking({ x, y, number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="-58"
        y="-23"
        width="116"
        height="46"
        rx="14"
        fill="#fffdf8"
        stroke="#3d5950"
        strokeWidth="2"
      />
      <rect x="-48" y="-14" width="29" height="28" rx="7" fill="#397f9d" />
      <text
        x="-33.5"
        y="7"
        textAnchor="middle"
        fill="#fff"
        fontSize="18"
        fontWeight="900"
      >
        P
      </text>
      <text
        x="13"
        y="6"
        textAnchor="middle"
        fill="#263d37"
        fontSize="14"
        fontWeight="900"
      >
        第{number}駐車場
      </text>
    </g>
  );
}

function ZaoSarukuraTrailMap({ resort }) {
  return (
    <svg
      className="cartoon-trail-map zao-sarukura-map"
      viewBox="0 0 960 560"
      role="img"
      aria-label={`${resort}雪道圖：6條正式雪道、1條規劃中連絡雪道、2座纜車與2處停車場`}
    >
      <defs>
        <linearGradient id="sarukura-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe7ed" />
          <stop offset=".65" stopColor="#edf5f3" />
          <stop offset="1" stopColor="#fbfcf7" />
        </linearGradient>
        <linearGradient id="sarukura-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e7f1ef" />
        </linearGradient>
        <pattern id="sarukura-forest" width="27" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M13.5 1 7 14h4L4 28h19l-7-14h4Z"
            fill="#467567"
            stroke="#31594e"
            strokeWidth="1"
          />
        </pattern>
        <filter id="sarukura-paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#294e45" floodOpacity=".18" />
        </filter>
        <marker
          id="sarukura-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10Z" fill="#de5b45" />
        </marker>
      </defs>

      <rect width="960" height="560" rx="20" fill="url(#sarukura-sky)" />

      {/* Mountain and forest silhouette */}
      <path
        d="M0 232 92 172 180 184 272 105 350 148 466 64 565 124 682 71 790 128 870 94 960 132V475H0Z"
        fill="#a6bab2"
      />
      <path
        d="M0 258 97 190 186 205 280 125 364 166 470 83 575 145 690 91 800 149 878 115 960 153V486H0Z"
        fill="url(#sarukura-forest)"
      />

      {/* Snow zones: each polygon is deliberately separated by forest */}
      <path
        d="M22 382C50 327 72 250 112 178C132 142 156 117 184 102C178 177 186 253 218 323C227 343 235 360 243 376C171 365 100 367 22 382Z"
        fill="url(#sarukura-snow)"
        stroke="#b4cfca"
        strokeWidth="3"
      />
      <path
        d="M190 371C217 318 235 249 246 176C253 132 266 100 286 79C305 112 315 159 316 211C318 270 328 323 355 374Z"
        fill="url(#sarukura-snow)"
        stroke="#b4cfca"
        strokeWidth="3"
      />
      <path
        d="M158 382C215 364 286 359 370 371L418 466H116Z"
        fill="url(#sarukura-snow)"
        stroke="#b4cfca"
        strokeWidth="3"
      />
      <path
        d="M370 371C434 348 503 344 577 359L651 466H418Z"
        fill="url(#sarukura-snow)"
        stroke="#b4cfca"
        strokeWidth="3"
      />
      <path
        d="M506 358C545 302 573 235 597 161C612 113 633 76 662 50C689 89 700 141 697 201C694 264 682 319 657 369Z"
        fill="url(#sarukura-snow)"
        stroke="#b4cfca"
        strokeWidth="3"
      />

      {/* Forest divider makes it explicit that Suzukasawa does not join A Course */}
      <path
        d="M169 321C194 322 217 331 238 350L250 388C217 379 185 375 151 378Z"
        fill="url(#sarukura-forest)"
        stroke="#31594e"
        strokeWidth="2"
      />
      <g transform="translate(202 344)">
        <rect x="-66" y="-13" width="132" height="26" rx="9" fill="#31594e" opacity=".9" />
        <text y="5" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">
          林帶分隔・無連接
        </text>
      </g>

      {/* Course center lines */}
      <path d="M178 116C153 169 133 226 113 285C101 320 91 345 75 369" fill="none" stroke="#e2a529" strokeWidth="8" strokeDasharray="13 9" strokeLinecap="round" />
      <path d="M281 92C276 151 276 216 287 277C294 316 306 341 326 365" fill="none" stroke="#e85f45" strokeWidth="8" strokeLinecap="round" />
      <path d="M163 397C219 390 276 399 346 440" fill="none" stroke="#43a36f" strokeWidth="8" strokeLinecap="round" />
      <path d="M390 388C444 373 508 382 586 444" fill="none" stroke="#e2a529" strokeWidth="8" strokeLinecap="round" />
      <path d="M285 91C360 92 446 89 554 105" fill="none" stroke="#e85f45" strokeWidth="8" strokeLinecap="round" markerEnd="url(#sarukura-arrow)" />
      <path d="M659 62C650 129 641 204 636 270C633 311 632 337 625 358" fill="none" stroke="#9661aa" strokeWidth="9" strokeLinecap="round" />

      {/* Planned connecting route: shown as planned, not an open course */}
      <path
        d="M326 126C378 168 421 220 465 273C493 306 527 329 566 350"
        fill="none"
        stroke="#de5b45"
        strokeWidth="7"
        strokeDasharray="16 12"
        strokeLinecap="round"
        markerEnd="url(#sarukura-arrow)"
      />
      <g transform="translate(432 224) rotate(43)" filter="url(#sarukura-paper-shadow)">
        <rect x="-112" y="-18" width="224" height="36" rx="11" fill="#fff7f1" stroke="#de5b45" strokeWidth="2" />
        <text y="6" textAnchor="middle" fill="#b53e2d" fontSize="14" fontWeight="900">
          新連絡コース（計画中）
        </text>
      </g>

      {/* Lifts follow the same spatial relationship as the source map */}
      <Lift
        path="M381 450 214 111"
        name="第2ロマンスリフト"
        length="500 m"
        labelX={295}
        labelY={278}
        rotate={63}
      />
      <Lift
        path="M210 462C325 451 442 451 570 459"
        name="第1ロマンスリフト"
        length="300 m"
        labelX={390}
        labelY={477}
      />

      {/* Course names and difficulty zones */}
      <CourseLabel x={86} y={239} width={154} name="鈴か沢コース" subtitle="700 m・最大 20°" tone="intermediate" rotate={-57} />
      <DifficultyBadge x={70} y={151} level="初・中級" tone="intermediate" />

      <CourseLabel x={261} y={218} width={166} name="振り子沢コース" subtitle="660 m・最大 25°" tone="advanced" rotate={-86} />
      <DifficultyBadge x={240} y={72} level="中級" tone="advanced" />

      <CourseLabel x={420} y={77} width={174} name="かもしかコース" subtitle="150 m・最大 9°" tone="advanced" />
      <DifficultyBadge x={373} y={45} level="上級" tone="advanced" />

      <CourseLabel x={657} y={202} width={190} name="チャンピオンコース" subtitle="500 m・最大 37°" tone="expert" rotate={-83} />
      <DifficultyBadge x={716} y={87} level="超上級" tone="expert" />

      <CourseLabel x={252} y={414} width={140} name="Aコース" subtitle="320 m・最大 15°" tone="beginner" />
      <DifficultyBadge x={168} y={408} level="初級" tone="beginner" />

      <CourseLabel x={495} y={413} width={172} name="中央ゲレンデ" subtitle="320 m・最大 25°" tone="intermediate" />
      <DifficultyBadge x={570} y={397} level="初・中級" tone="intermediate" />

      {/* Base facilities and access */}
      <path d="M62 508C276 493 544 507 895 470" fill="none" stroke="#9baaa5" strokeWidth="16" strokeLinecap="round" />
      <path d="M62 508C276 493 544 507 895 470" fill="none" stroke="#fffdf8" strokeWidth="3" strokeDasharray="15 11" />
      <g transform="translate(627 444)" filter="url(#sarukura-paper-shadow)">
        <path d="M-34 28V-3L0-25 35-3V28M35 28V5L58-9 83 5V28Z" fill="#f2d4a7" stroke="#684b3a" strokeWidth="3" />
        <rect x="-7" y="5" width="17" height="23" rx="2" fill="#9b5d45" />
        <text x="25" y="47" textAnchor="middle" fill="#263d37" fontSize="12" fontWeight="900">
          レストハウス
        </text>
      </g>
      <Parking x={112} y={516} number="2" />
      <Parking x={842} y={491} number="1" />

      {/* Title and concise legend */}
      <g transform="translate(748 22)" filter="url(#sarukura-paper-shadow)">
        <rect width="190" height="66" rx="16" fill="#fffdf8" stroke="#36564c" strokeWidth="2" />
        <text x="16" y="27" fill="#263d37" fontSize="17" fontWeight="900">
          ZAO 猿倉スキー場
        </text>
        <text x="16" y="50" fill="#5d746c" fontSize="11" fontWeight="800" letterSpacing="1">
          COURSE &amp; LIFT MAP
        </text>
      </g>
      <g transform="translate(19 19)" filter="url(#sarukura-paper-shadow)">
        <rect width="128" height="104" rx="15" fill="#fffdf8" stroke="#36564c" strokeWidth="2" />
        <text x="13" y="22" fill="#263d37" fontSize="12" fontWeight="900">雪道分區</text>
        {[
          ["初級", "#43a36f"],
          ["中級", "#e2a529"],
          ["上級", "#e85f45"],
          ["超上級", "#9661aa"],
        ].map(([label, color], index) => (
          <g key={label} transform={`translate(14 ${42 + index * 17})`}>
            <line x2="25" stroke={color} strokeWidth="7" strokeLinecap="round" />
            <text x="35" y="4" fill="#263d37" fontSize="11" fontWeight="800">{label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default ZaoSarukuraTrailMap;
