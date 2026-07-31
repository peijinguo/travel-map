import { trailMapProfiles } from "../data/trailMapProfiles";
import ZaoSarukuraTrailMap from "./ZaoSarukuraTrailMap";

const palette = ["#67a96b", "#3f91c2", "#e56b4a"];

function trailLabelWidth(text, fontSize = 9, padding = 18, minimum = 30) {
  const contentWidth = [...String(text)].reduce((width, character) => {
    const isWideCharacter = character.codePointAt(0) > 255;
    return width + (isWideCharacter ? fontSize : fontSize * 0.62);
  }, 0);
  return Math.max(minimum, Math.ceil(contentWidth + padding));
}

function CourseLabel({ x, y, number, color }) {
  return (
    <g className="trail-course-label" transform={`translate(${x} ${y})`}>
      <circle r="13" fill={color} />
      <text y="5" textAnchor="middle">
        {number}
      </text>
    </g>
  );
}

function ChairLift({ id, x1, y1, x2, y2, color, chairs = 4 }) {
  return (
    <g className="real-chair-lift" aria-label={id}>
      <line className="lift-cable" x1={x1} y1={y1} x2={x2} y2={y2} />
      {Array.from({ length: chairs }, (_, index) => {
        const progress = (index + 1) / (chairs + 1);
        const x = x1 + (x2 - x1) * progress;
        const y = y1 + (y2 - y1) * progress;
        return (
          <g key={index} transform={`translate(${x} ${y})`}>
            <line className="lift-hanger" y2="12" />
            <path className="lift-chair" d="M-8 12h16v5H-8z" fill={color} />
          </g>
        );
      })}
      <circle cx={x1} cy={y1} r="7" fill={color} />
      <circle cx={x2} cy={y2} r="7" fill={color} />
    </g>
  );
}

function SantaPresentTrailMap({ resort }) {
  const courses = [
    {
      number: 1,
      name: "登山道雪道",
      detail: "1000m · 中級",
      color: "#9d63a8",
      d: "M322 92 C220 110 165 185 170 282 C174 350 210 407 256 444",
    },
    {
      number: 2,
      name: "浪漫雪道",
      detail: "600m · 初級",
      color: "#ef9e00",
      d: "M310 112 C258 158 250 221 269 286 C282 330 307 363 330 399",
    },
    {
      number: 3,
      name: "Black 雪道",
      detail: "900m · 中級",
      color: "#e51b23",
      d: "M366 103 C350 172 353 244 348 315 C347 354 347 391 346 427",
    },
    {
      number: 4,
      name: "Center 雪道",
      detail: "350m · 初級",
      color: "#09aade",
      d: "M485 275 C470 310 466 353 486 389 C501 415 532 433 564 443",
    },
    {
      number: 5,
      name: "Green 雪道",
      detail: "700m · 進階",
      color: "#0aa63b",
      d: "M440 139 C414 191 430 242 485 259 C554 280 607 278 653 329 C681 360 694 397 725 423",
    },
    {
      number: 6,
      name: "Slalom Burn",
      detail: "800m · 進階",
      color: "#ef78ae",
      d: "M478 127 C552 164 606 214 663 267 C724 323 759 365 752 417",
    },
  ];

  return (
    <svg
      className="cartoon-trail-map santa-present-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}真實雪道配置卡通重繪圖`}
    >
      <defs>
        <linearGradient id="santa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#87d7ed" />
          <stop offset="1" stopColor="#f7fcff" />
        </linearGradient>
        <linearGradient id="santa-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="santa-trees"
          width="26"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M13 1 3 20h7L5 28h16l-5-8h7Z"
            fill="#4d9d72"
            stroke="#337856"
            strokeWidth="1.2"
          />
        </pattern>
      </defs>

      <rect width="900" height="650" fill="url(#santa-sky)" />
      <path
        className="real-map-back-ridge"
        d="M0 258 112 193 217 226 338 164 451 213 548 159 667 205 777 169 900 233V520H0Z"
      />
      <path
        className="real-map-forest"
        d="M0 233 159 155 290 146 365 95 447 125 515 150 588 176 687 221 900 272V520H0Z"
      />
      <path
        className="real-map-snowfield"
        d="M139 455 C157 344 154 233 310 105 C355 75 405 89 462 122 C570 186 628 224 771 411 L738 470 L174 487Z"
      />
      <path
        className="real-map-tree-island"
        d="M209 440 C186 340 190 232 305 122 L331 130 C291 216 302 324 326 432Z"
      />
      <path
        className="real-map-tree-island"
        d="M365 429 C377 330 374 215 392 116 L430 129 C409 210 412 323 410 428Z"
      />
      <path
        className="real-map-tree-island"
        d="M485 258 C456 223 445 184 466 142 C513 167 559 199 604 237 C556 219 524 223 485 258Z"
      />

      {courses.map((course) => (
        <path
          className="real-course"
          d={course.d}
          key={course.number}
          style={{ "--course-color": course.color }}
        />
      ))}
      <path
        className="real-course"
        d="M443 142 C475 181 493 222 527 250 C567 282 626 303 659 338 C682 361 699 390 719 421"
        style={{ "--course-color": "#0aa63b" }}
      />

      <ChairLift
        id="Black Lift"
        x1={360}
        y1={441}
        x2={370}
        y2={92}
        color="#303a43"
        chairs={7}
      />
      <ChairLift
        id="Center Lift"
        x1={570}
        y1={443}
        x2={506}
        y2={286}
        color="#e42c2c"
        chairs={3}
      />
      <ChairLift
        id="Green Lift"
        x1={756}
        y1={422}
        x2={480}
        y2={135}
        color="#169447"
        chairs={6}
      />

      <g className="santa-tower" transform="translate(371 58)">
        <path d="M-9 35H9L6 4H-6Z" />
        <path d="M-17 4H17L12-5H-12Z" />
        <rect x="-7" y="-19" width="14" height="14" rx="2" />
        <line y1="-19" y2="-31" />
      </g>

      <g className="santa-base-buildings" transform="translate(545 426)">
        <path d="M0 39V10L31-10 62 10v29M62 39V17L91 0l29 17v22M120 39V10l24-15 26 15v29" />
        <path d="M-9 42H180" />
        <rect x="18" y="20" width="15" height="19" />
        <rect x="79" y="20" width="17" height="12" />
        <text x="83" y="58" textAnchor="middle">
          CHRISTMAS LODGE
        </text>
      </g>
      <g className="santa-parking" transform="translate(775 430)">
        <path d="M0 0 112-23 124 41 13 55Z" />
        <text x="64" y="28" textAnchor="middle">
          P
        </text>
      </g>

      <CourseLabel x={206} y={286} number="1" color="#9d63a8" />
      <CourseLabel x={269} y={224} number="2" color="#ef9e00" />
      <CourseLabel x={350} y={293} number="3" color="#e51b23" />
      <CourseLabel x={480} y={345} number="4" color="#09aade" />
      <CourseLabel x={588} y={278} number="5" color="#0aa63b" />
      <CourseLabel x={622} y={222} number="6" color="#ef78ae" />

      <g
        className="real-map-legend santa-compact-legend"
        transform="translate(15 10)"
      >
        <rect width="300" height="82" rx="16" />
        <text className="legend-title" x="16" y="22">
          SANTA PRESENT PARK
        </text>
        {courses.map((course, index) => (
          <g
            key={course.number}
            transform={`translate(${16 + (index % 2) * 144} ${42 + Math.floor(index / 2) * 17})`}
          >
            <circle cx="6" cy="-3" r="6" fill={course.color} />
            <text className="legend-number" x="6" y="0" textAnchor="middle">
              {course.number}
            </text>
            <text className="legend-course-name" x="17">
              {course.name}
            </text>
            <title>{course.detail}</title>
          </g>
        ))}
      </g>
      <g className="real-map-north" transform="translate(850 72)">
        <path d="M0 24 11-11 22 24 11 18Z" />
        <text x="11" y="41" textAnchor="middle">
          N
        </text>
      </g>
    </svg>
  );
}

function KurodakeTrailMap({ resort }) {
  const routes = [
    {
      id: "A",
      name: "Slalom／中級 Course",
      level: "intermediate",
      lineStyle: "solid",
      slope: "最高 25°",
      color: "#df3434",
      d: "M540 82 C546 116 549 148 547 171 C545 194 531 211 527 234 C521 267 533 294 526 338",
    },
    {
      id: "B",
      name: "路線下／初級 Course",
      level: "beginner",
      lineStyle: "solid",
      slope: "最低 8°",
      color: "#2c9d62",
      d: "M493 217 C465 275 435 361 365 475",
    },
    {
      id: "C",
      name: "林間／初級 Course",
      level: "beginner",
      lineStyle: "dashed",
      slope: "最低 8°",
      color: "#2c9d62",
      d: "M520 300 C540 282 516 311 486 338 C460 371 439 397 431 421",
    },
    {
      id: "D",
      name: "雪庇／中級 Course",
      level: "intermediate",
      lineStyle: "solid",
      slope: "最高 25°",
      color: "#2c9d62",
      d: "M519 348 C554 380 516 371 500 383 C494 391 464 406 485 428 C504 468 406 470 365 475",
    },
  ];

  return (
    <svg
      className="cartoon-trail-map kurodake-trail-map"
      viewBox="0 0 900 560"
      role="img"
      aria-label={`${resort}依官方配置重繪雪道圖，最大坡度25度、最低坡度8度`}
    >
      <defs>
        <linearGradient id="kurodake-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#78c9e8" />
          <stop offset="1" stopColor="#eff9fd" />
        </linearGradient>
        <linearGradient id="kurodake-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d5e9f3" />
        </linearGradient>
        <pattern
          id="kurodake-forest"
          width="24"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 4 17h5l-5 9h16l-5-9h5Z"
            fill="#397b68"
            stroke="#265e50"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width="900" height="560" fill="url(#kurodake-sky)" />
      <path
        className="kurodake-back-ridge"
        d="M0 280 112 225 205 240 306 164 395 198 502 42 588 142 668 111 741 178 822 151 900 218V560H0Z"
      />
      <path
        className="kurodake-mountain"
        d="M174 527 C204 400 257 257 382 143 L502 42 579 148 C637 233 690 367 734 527Z"
      />
      <path
        className="kurodake-snow-face"
        d="M270 520 C292 414 335 263 439 139 L502 56 558 151 C599 245 616 377 632 520Z"
      />
      <path
        className="kurodake-forest"
        d="M154 529 C190 403 266 286 374 183 C358 294 365 397 392 505 C449 420 524 368 620 319 C664 385 704 452 731 529Z"
      />
      <path
        className="kurodake-ski-area"
        d="M354 480 C403 343 457 194 527 75 C602 76 640 113 623 166 C605 218 612 267 647 313 C681 357 674 410 618 447 C555 488 459 501 354 480Z"
      />
      <path
        className="kurodake-boundary"
        d="M354 486 C405 344 458 193 526 70 C608 70 649 111 631 169 C613 221 622 268 656 313 C693 363 683 422 621 457 C555 494 459 507 354 486Z"
      />
      <path
        className="kurodake-mountain-trail"
        d="M540 76 C633 82 659 125 641 174 C622 225 634 267 669 315 C704 364 697 428 628 467 C557 505 454 516 347 493"
      />

      {routes.map((route) => (
        <g key={route.id}>
          {route.upperD && (
            <path
              className={`kurodake-course is-${route.level} is-${route.lineStyle}`}
              d={route.upperD}
              style={{ "--kurodake-course": route.upperColor }}
            />
          )}
          {route.branchD && (
            <path
              className={`kurodake-course is-${route.level} is-${route.lineStyle}`}
              d={route.branchD}
              style={{ "--kurodake-course": route.color }}
            />
          )}
          <path
            className={`kurodake-course is-${route.level} is-${route.lineStyle}`}
            d={route.d}
            style={{ "--kurodake-course": route.color }}
          >
            <title>{`${route.name}｜${route.slope}`}</title>
          </path>
        </g>
      ))}
      <ChairLift
        id="黑岳雙人纜椅"
        x1={365}
        y1={475}
        x2={540}
        y2={82}
        color="#273c46"
        chairs={7}
      />
      {[
        {
          x: 598,
          y: 190,
          name: "Slalom",
          color: "#df3434",
          lineStyle: "solid",
        },
        {
          x: 432,
          y: 315,
          name: "路線下",
          color: "#2c9d62",
          lineStyle: "solid",
        },
        { x: 473, y: 382, name: "林間", color: "#2c9d62", lineStyle: "dashed" },
        { x: 580, y: 348, name: "雪庇", color: "#2c9d62", lineStyle: "solid" },
      ].map((label) => {
        const width = trailLabelWidth(label.name, 9, 44, 58);
        const left = -width / 2;
        return (
          <g
            className={`kurodake-route-label is-${label.lineStyle}`}
            transform={`translate(${label.x} ${label.y})`}
            key={label.name}
          >
            <rect
              x={left}
              y="-14"
              width={width}
              height="28"
              rx="10"
              style={{ stroke: label.color }}
            />
            <line
              x1={left + 10}
              x2={left + 26}
              style={{ stroke: label.color }}
            />
            <text x={left + 32} y="4">
              {label.name}
            </text>
          </g>
        );
      })}
      <g className="kurodake-station" transform="translate(520 57)">
        <path d="M0 20V4l18-12L37 4v16" />
        <text x="18" y="35" textAnchor="middle">
          黑岳七合目
        </text>
      </g>
      <g className="kurodake-station" transform="translate(335 468)">
        <path d="M0 22V4l19-12L40 4v18" />
        <text x="20" y="38" textAnchor="middle">
          纜椅乘場
        </text>
      </g>
      <g className="kurodake-station is-fifth" transform="translate(286 515)">
        <path d="M0 25V5l23-14L47 5v20" />
        <text x="24" y="42" textAnchor="middle">
          黑岳五合目站
        </text>
      </g>

      <path className="kurodake-walk" d="M310 517 C326 500 342 488 365 478" />
      <text className="kurodake-walk-label" x="316" y="511">
        至纜椅約 200m
      </text>
      <path className="kurodake-ropeway" d="M309 541 215 559" />
      <g className="kurodake-cabin" transform="translate(262 549)">
        <path d="M-13-8H13L10 9H-10Z" />
        <line y1="-8" y2="-15" />
      </g>
      <text className="kurodake-ropeway-label" x="92" y="550">
        黑岳 Ropeway／往層雲峽
      </text>

      {[
        { x: 656, y: 172 },
        { x: 682, y: 286 },
        { x: 678, y: 405 },
      ].map((point, index) => (
        <g
          className="kurodake-danger"
          transform={`translate(${point.x} ${point.y})`}
          key={index}
        >
          <path d="M0 18 11-4 22 18Z" />
          <text x="11" y="14" textAnchor="middle">
            !
          </text>
        </g>
      ))}
      <path
        className="kurodake-cliff"
        d="M647 134 C663 199 657 258 674 319 C687 367 704 411 726 449"
      />

      <g className="kurodake-summit" transform="translate(502 46)">
        <path d="M0 16 10-3 20 16Z" />
        <text x="10" y="31" textAnchor="middle">
          黑岳 1,984m
        </text>
      </g>
      <g className="kurodake-title" transform="translate(22 22)">
        <rect width="278" height="82" rx="17" />
        <text x="18" y="30">
          KURODAKE SKI AREA
        </text>
        <text className="kurodake-stats" x="18" y="55">
          最大坡度 25° · 最低坡度 8°
        </text>
      </g>
      <g className="kurodake-legend" transform="translate(22 122)">
        <rect width="268" height="132" rx="16" />
        {routes.map((route, index) => (
          <g
            className={`is-${route.lineStyle}`}
            transform={`translate(18 ${24 + index * 27})`}
            key={route.id}
          >
            <line x2="28" style={{ stroke: route.color }} />
            <text x="39" y="4">
              {route.name}
            </text>
            <text className="legend-slope" x="196" y="4">
              {route.slope}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function NakayamaTrailMap({ resort }) {
  const towHandles = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84];
  const lights = [
    { x: 453, y: 386, scale: 1 },
    { x: 487, y: 305, scale: 0.86 },
    { x: 520, y: 226, scale: 0.72 },
    { x: 550, y: 153, scale: 0.58 },
  ];

  return (
    <svg
      className="cartoon-trail-map nakayama-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}專屬雪道圖：一條三百公尺雪道，最大坡度二十度，設有一座繩索牽引與夜間照明`}
    >
      <defs>
        <linearGradient id="nakayama-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#91cfe3" />
          <stop offset="1" stopColor="#eef7fa" />
        </linearGradient>
        <linearGradient id="nakayama-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcebf1" />
        </linearGradient>
        <pattern
          id="nakayama-trees"
          width="25"
          height="29"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 3 18h6l-5 9h17l-5-9h6Z"
            fill="#446f66"
            stroke="#31564f"
            strokeWidth="1.1"
          />
        </pattern>
      </defs>

      <rect width="900" height="520" fill="url(#nakayama-sky)" />
      <path
        className="nakayama-back-hill"
        d="M0 263 C105 174 210 126 337 158 C427 180 481 129 573 77 C666 111 745 168 900 209 V520H0Z"
      />
      <path
        className="nakayama-forest"
        d="M0 240 C118 154 237 132 369 169 C435 187 484 137 566 83 L593 83 C682 117 775 160 900 205 V520H0Z"
      />
      <path
        className="nakayama-run"
        d="M563 84 C550 139 535 201 519 263 C501 330 469 395 409 462 L676 462 C621 413 587 351 573 283 C557 207 568 143 594 84Z"
      />
      <path
        className="nakayama-course is-intermediate"
        d="M581 101 C565 164 553 224 548 281 C544 315 534 344 519 369"
      />
      <path
        className="nakayama-course is-beginner"
        d="M519 369 C499 401 478 428 449 451"
      />

      <g className="nakayama-rope-tow" aria-label="Rope Tow 1座">
        <line x1="430" y1="452" x2="555" y2="102" />
        {towHandles.map((progress) => {
          const x = 430 + (555 - 430) * progress;
          const y = 452 + (102 - 452) * progress;
          return (
            <g key={progress} transform={`translate(${x} ${y})`}>
              <line x2="11" y2="4" />
              <path d="M11 4v13m-5 0h12" />
            </g>
          );
        })}
        <circle cx="430" cy="452" r="7" />
        <circle cx="555" cy="102" r="7" />
      </g>

      {lights.map((light, index) => (
        <g
          className="nakayama-light"
          transform={`translate(${light.x} ${light.y}) scale(${light.scale})`}
          key={index}
        >
          <line y2="-62" />
          <path d="M0-62 19-56 16-48 0-53Z" />
        </g>
      ))}

      <g className="nakayama-safety-net" transform="translate(505 438)">
        <path d="M0 0 C48-13 96-13 146 1" />
        {[0, 25, 50, 75, 100, 125, 146].map((x) => (
          <line x1={x} y1={x === 146 ? 1 : 0} x2={x} y2="29" key={x} />
        ))}
        <path d="M0 10 C48-3 96-3 146 11M0 20 C48 7 96 7 146 21" />
      </g>

      <g className="nakayama-hut" transform="translate(330 432)">
        <path d="M0 30V9L27-7 56 9v21" />
        <rect x="10" y="14" width="13" height="16" />
        <text x="28" y="47" textAnchor="middle">
          休憩所
        </text>
      </g>
      <g className="nakayama-snow-gun" transform="translate(682 425)">
        <path d="M0 10 16-12 27-7 15 15Z" />
        <line x1="14" y1="14" x2="8" y2="29" />
        <line x1="18" y1="13" x2="28" y2="28" />
      </g>

      <g className="nakayama-slope-tag" transform="translate(584 207)">
        <rect x="-31" y="-14" width="62" height="28" rx="9" />
        <text y="5" textAnchor="middle">
          最大 20°
        </text>
      </g>
      <g
        className="nakayama-slope-tag is-beginner"
        transform="translate(515 403)"
      >
        <rect x="-34" y="-14" width="68" height="28" rx="9" />
        <text y="5" textAnchor="middle">
          初級緩坡
        </text>
      </g>
      <CourseLabel x={550} y={302} number="1" color="#e79a17" />

      <g className="nakayama-title" transform="translate(20 20)">
        <rect width="305" height="76" rx="17" />
        <text x="18" y="29">
          町營中山滑雪場
        </text>
        <text className="nakayama-subtitle" x="18" y="54">
          NAKAYAMA SKI AREA · 上川町
        </text>
      </g>
      <g className="nakayama-info" transform="translate(20 113)">
        <rect width="305" height="186" rx="17" />
        <text className="nakayama-info-title" x="18" y="28">
          1 COURSE · 300m · MAX 20°
        </text>
        <g className="nakayama-level-bar" transform="translate(18 44)">
          <rect width="269" height="14" rx="7" />
          <path d="M0 7A7 7 0 0 1 7 0h74v14H7A7 7 0 0 1 0 7Z" />
          <text x="40" y="30">
            初級 30%
          </text>
          <text x="180" y="30">
            中級 70%
          </text>
        </g>
        <g className="nakayama-facts" transform="translate(18 96)">
          <text y="0">Rope Tow</text>
          <text x="269" y="0" textAnchor="end">
            1 座
          </text>
          <text y="27">Night Skiing</text>
          <text x="269" y="27" textAnchor="end">
            夜間照明
          </text>
          <text y="54">Snowboard</text>
          <text x="269" y="54" textAnchor="end">
            全面滑走可
          </text>
          <text y="81">Rental</text>
          <text x="269" y="81" textAnchor="end">
            無
          </text>
        </g>
      </g>
      <text className="nakayama-course-length" x="615" y="335">
        300m
      </text>
    </svg>
  );
}

function KamuiTrailMap({ resort }) {
  const courses = [
    {
      n: 1,
      name: "Chibikko",
      level: "beginner",
      length: 100,
      slope: 8,
      label: [469, 356],
      d: "M442 363 C450 354 462 350 478 351",
    },
    {
      n: 2,
      name: "Lesson",
      level: "beginner",
      length: 900,
      slope: 15,
      label: [405, 332],
      d: "M426 362 C410 356 394 345 385 330 C377 315 380 296 394 281",
    },
    {
      n: 3,
      name: "Center",
      level: "beginner",
      length: 800,
      slope: 18,
      label: [449, 286],
      d: "M431 362 C429 337 428 310 428 282",
    },
    {
      n: 4,
      name: "Family",
      level: "beginner",
      length: 900,
      slope: 18,
      label: [458, 245],
      d: "M428 282 C452 278 478 267 500 252 C522 238 546 231 568 237",
    },
    {
      n: 5,
      name: "初心者 Course（Next Step）",
      level: "beginner",
      length: 4000,
      slope: 18,
      label: [438, 133],
      d: "M585 121 C548 131 506 135 463 134 C420 133 382 140 350 156 C326 168 307 184 302 198 C297 211 305 224 324 234 C349 248 390 249 428 243",
    },
    {
      n: 6,
      name: "Jr. Challenge Rock",
      level: "beginner",
      length: 300,
      slope: 15,
      label: [330, 221],
      d: "M394 281 C378 272 359 263 345 250 C335 240 329 226 333 211",
    },
    {
      n: 7,
      name: "Shirakaba 1",
      level: "beginner",
      length: 800,
      slope: 20,
      label: [591, 300],
      d: "M568 237 C587 248 600 265 605 284 C610 302 609 320 600 337",
    },
    {
      n: 8,
      name: "Bank",
      level: "beginner",
      length: 700,
      slope: 18,
      label: [519, 313],
      d: "M568 237 C552 253 544 273 544 293 C543 315 534 336 518 350",
    },
    {
      n: 9,
      name: "Gold 1",
      level: "beginner",
      length: 900,
      slope: 18,
      label: [536, 273],
      d: "M568 237 C551 235 532 239 514 249 C496 259 480 272 466 286",
    },
    {
      n: 10,
      name: "Gold 3",
      level: "beginner",
      length: 900,
      slope: 22,
      label: [541, 67],
      d: "M417 35 C450 34 484 42 511 56 C535 68 558 79 584 82 C600 84 608 99 603 117",
    },
    {
      n: 11,
      name: "Jr. Challenge Forest",
      level: "intermediate",
      length: 400,
      slope: 20,
      label: [591, 98],
      d: "M584 82 C572 91 567 103 568 117 C569 130 575 140 586 147",
    },
    {
      n: 12,
      name: "Gold 2",
      level: "intermediate",
      length: 1200,
      slope: 30,
      label: [551, 181],
      d: "M586 147 C568 161 558 178 557 196 C556 211 560 224 568 237",
    },
    {
      n: 13,
      name: "Shirakaba 2",
      level: "intermediate",
      length: 1000,
      slope: 28,
      label: [615, 183],
      d: "M603 117 C621 133 630 152 630 174 C630 199 622 220 605 238 C596 247 586 251 574 250",
    },
    {
      n: 14,
      name: "Royal Intermediate",
      level: "intermediate",
      length: 700,
      slope: 28,
      label: [317, 99],
      d: "M151 85 C208 88 266 88 315 76 C354 67 386 48 417 35",
    },
    {
      n: 15,
      name: "Link",
      level: "intermediate",
      length: 1100,
      slope: 26,
      label: [255, 132],
      d: "M151 85 C181 103 205 126 224 151 C241 173 257 190 276 201 C291 210 302 225 300 241",
    },
    {
      n: 16,
      name: "Slalom Burn",
      level: "intermediate",
      length: 1100,
      slope: 28,
      label: [129, 185],
      d: "M151 85 C133 108 124 134 124 162 C123 194 118 224 106 252 C102 264 103 276 111 286",
    },
    {
      n: 17,
      name: "Logging Road",
      level: "intermediate",
      length: 1300,
      slope: 26,
      label: [178, 224],
      d: "M151 85 C171 112 181 139 181 167 C181 195 190 220 207 240 C221 257 219 274 205 286 C184 301 143 299 111 286",
    },
    {
      n: 18,
      name: "Royal Advanced",
      level: "advanced",
      length: 800,
      slope: 28,
      label: [170, 154],
      d: "M151 85 C165 108 170 132 168 158 C166 184 158 205 146 224",
    },
    {
      n: 19,
      name: "Silky",
      level: "advanced",
      length: 800,
      slope: 30,
      label: [224, 208],
      d: "M224 151 C228 173 228 193 221 211 C214 230 204 245 190 257",
    },
    {
      n: 20,
      name: "Dynamic",
      level: "advanced",
      length: 1100,
      slope: 35,
      label: [193, 136],
      d: "M151 85 C184 104 204 129 208 158 C213 191 205 218 185 239 C173 252 164 269 164 286",
    },
    {
      n: 21,
      name: "Deep Powder",
      level: "advanced",
      length: 800,
      slope: 32,
      label: [129, 99],
      d: "M151 85 C132 101 120 122 115 146 C109 170 103 193 94 215",
    },
    {
      n: 22,
      name: "Fresh Powder",
      level: "advanced",
      length: 600,
      slope: 30,
      label: [407, 71],
      d: "M417 35 C400 55 391 78 391 103 C391 127 382 148 365 166",
    },
    {
      n: 23,
      name: "Tree Run",
      level: "advanced",
      length: 1200,
      slope: 30,
      label: [362, 124],
      d: "M389 58 C371 81 359 105 356 131 C353 156 343 179 326 197",
    },
    {
      n: 24,
      name: "Bumps",
      level: "advanced",
      length: 1100,
      slope: 30,
      label: [284, 208],
      d: "M357 75 C337 98 321 123 314 151 C307 181 307 210 315 237 C321 256 318 276 306 292",
    },
    {
      n: 25,
      name: "Todomatsu",
      level: "advanced",
      length: 800,
      slope: 30,
      label: [236, 209],
      d: "M315 76 C302 104 294 133 294 162 C294 191 284 215 265 235 C250 250 236 268 229 286",
    },
    {
      n: 26,
      name: "Royal Powder",
      level: "advanced",
      length: 400,
      slope: 35,
      label: [254, 132],
      d: "M151 85 C191 92 227 108 250 132 C270 153 282 177 281 203 C280 224 287 239 300 249",
    },
  ];
  const courseColor = {
    beginner: "#87b814",
    intermediate: "#d51d27",
    advanced: "#20282d",
  };

  return (
    <svg
      className="cartoon-trail-map kamui-trail-map"
      viewBox="0 0 900 506"
      role="img"
      aria-label={`${resort}依官方比例重繪的雪道圖，包含 26 條雪道、坡度與纜車配置`}
    >
      <defs>
        <linearGradient id="kamui-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd4ef" />
          <stop offset="1" stopColor="#f7fcff" />
        </linearGradient>
        <linearGradient id="kamui-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="kamui-forest"
          width="24"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 3 18h6l-5 8h16l-5-8h6Z"
            fill="#4e8fb1"
            stroke="#347696"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="506" fill="url(#kamui-sky)" />
      <path
        className="kamui-back-ridge"
        d="M0 272 82 201 164 214 248 153 338 172 416 31 520 75 607 82 704 114 791 89 900 181V520H0Z"
      />
      <path
        className="kamui-forest"
        d="M30 430 55 167 151 83 287 75 356 53 417 29 516 48 606 78 681 142 755 182 835 430Z"
      />
      <path
        className="kamui-snow-mass"
        d="M66 389 C61 296 70 176 151 85 C225 91 302 78 357 55 C382 44 401 34 417 31 C474 42 526 70 585 118 C636 164 653 237 647 314 C631 330 613 340 600 361 L345 361 C326 334 310 313 300 294 C260 303 218 299 186 299 C151 298 122 299 104 286 C82 250 69 215 66 176Z"
      />
      <path
        className="kamui-powder"
        d="M88 143 C105 112 127 94 151 87 C139 132 137 177 146 224 C124 216 105 190 88 143Z"
      />
      <path
        className="kamui-powder"
        d="M268 94 C298 75 329 63 359 54 C337 91 326 132 328 174 C298 158 278 130 268 94Z"
      />
      <path
        className="kamui-powder"
        d="M468 51 C511 66 548 88 585 117 C558 126 540 149 531 181 C501 148 480 105 468 51Z"
      />
      <path
        className="kamui-powder"
        d="M585 121 C612 141 628 167 633 198 C614 193 596 199 580 216 C574 183 576 151 585 121Z"
      />
      <path
        className="kamui-boundary"
        d="M103 286 C75 264 67 222 66 176 C75 133 102 102 151 85 C232 91 312 75 417 31 C486 42 539 77 585 118 C617 135 635 168 637 207 C641 247 632 282 613 312 C625 322 638 326 651 326"
      />

      {courses.map((course) => (
        <path
          className="kamui-course"
          d={course.d}
          key={course.n}
          style={{ "--kamui-course": courseColor[course.level] }}
        >
          <title>{`${course.n}. ${course.name}｜全長 ${course.length.toLocaleString()}m｜最大坡度 ${course.slope}°`}</title>
        </path>
      ))}
      {courses.map((course) => (
        <g
          className={`kamui-slope-tag is-${course.level}`}
          transform={`translate(${course.label[0]} ${course.label[1]})`}
          key={`slope-${course.n}`}
        >
          <rect x="-15" y="-10" width="30" height="20" rx="4" />
          <text y="4" textAnchor="middle">
            {course.slope}°
          </text>
        </g>
      ))}

      <ChairLift
        id="Kamui Gondola"
        x1={347}
        y1={359}
        x2={417}
        y2={35}
        color="#188c82"
        chairs={7}
      />
      <ChairLift
        id="No. 1 Pair Lift"
        x1={428}
        y1={362}
        x2={428}
        y2={282}
        color="#e68125"
        chairs={3}
      />
      <ChairLift
        id="No. 2 Pair Lift"
        x1={613}
        y1={312}
        x2={585}
        y2={121}
        color="#e0c000"
        chairs={4}
      />
      <ChairLift
        id="No. 3 Pair Lift"
        x1={521}
        y1={362}
        x2={568}
        y2={237}
        color="#d8262d"
        chairs={3}
      />
      <ChairLift
        id="No. 4 Pair Lift"
        x1={111}
        y1={286}
        x2={151}
        y2={85}
        color="#287ca7"
        chairs={5}
      />
      <ChairLift
        id="No. 5 Pair Lift"
        x1={199}
        y1={252}
        x2={151}
        y2={85}
        color="#313c43"
        chairs={4}
      />

      {[
        { x: 151, y: 85 },
        { x: 417, y: 31 },
        { x: 585, y: 121 },
      ].map((peak, index) => (
        <g
          className="trail-summit"
          transform={`translate(${peak.x} ${peak.y})`}
          key={index}
        >
          <line y2="-22" />
          <path d="M1-22 25-15 1-8Z" />
        </g>
      ))}
      <g className="kamui-base" transform="translate(397 358)">
        <path d="M0 30V8l26-16 28 16v22M58 30V14L78 2l21 12v16M106 30V9l25-14 25 14v21" />
        <text x="78" y="48" textAnchor="middle">
          CENTER HOUSE · REST AREA · RENTAL
        </text>
      </g>

      <g className="kamui-legend" transform="translate(670 25)">
        <rect width="205" height="86" rx="15" />
        <g transform="translate(16 19)">
          <line x2="26" />
          <text x="34" y="4">
            初級
          </text>
        </g>
        <g transform="translate(16 43)">
          <line className="mid" x2="26" />
          <text x="34" y="4">
            中級
          </text>
        </g>
        <g transform="translate(16 67)">
          <line className="advanced" x2="26" />
          <text x="34" y="4">
            進階／非壓雪
          </text>
        </g>
      </g>
      <g className="kamui-course-index" transform="translate(27 326)">
        <rect width="300" height="156" rx="16" />
        <text className="kamui-index-title" x="16" y="24">
          KAMUI SKI LINKS
        </text>
        {courses.slice(0, 13).map((course, index) => (
          <text
            x={16 + Math.floor(index / 7) * 126}
            y={45 + (index % 7) * 13}
            key={course.n}
          >
            {course.n}. {course.name}
          </text>
        ))}
        <line
          className="kamui-index-divider"
          x1="16"
          y1="137"
          x2="284"
          y2="137"
        />
        <text className="kamui-index-stats" x="16" y="150">
          26 雪道 · 最大坡度 35° · 5 Pair Lifts · 1 Gondola
        </text>
      </g>
    </svg>
  );
}

function FusTrailMap({ resort }) {
  const courses = [
    {
      id: "D",
      name: "Dynamic",
      level: "上級",
      stats: "1,200m · 38° / 25° / 28°",
      color: "#252729",
      d: "M465 105 C438 176 425 264 414 344 C405 396 397 438 391 477",
      label: [421, 258],
    },
    {
      id: "P",
      name: "Panorama",
      level: "中・上級",
      stats: "800m · 28° / 22° / 25°",
      color: "#252729",
      d: "M498 110 C551 126 585 160 583 205 C581 246 566 286 552 326",
      label: [567, 212],
    },
    {
      id: "C",
      name: "Crystal",
      level: "中級",
      stats: "800m · 25° / 13° / 22°",
      color: "#252729",
      d: "M487 225 C476 294 464 375 451 479",
      label: [464, 344],
    },
    {
      id: "R",
      name: "Romance",
      level: "中級",
      stats: "800m · 22° / 13° / 20°",
      color: "#df2029",
      d: "M480 88 C547 93 590 126 571 159 C548 197 507 213 520 259 C534 304 615 303 624 347 C634 391 577 407 568 446 C561 479 579 502 605 515",
      label: [559, 284],
    },
    {
      id: "M",
      name: "Mild",
      level: "初・中級",
      stats: "1,800m · 22° / 13° / 15°",
      color: "#df2029",
      d: "M582 262 C633 294 661 330 637 364 C616 393 577 411 588 442 C600 474 643 482 650 516",
      label: [630, 341],
    },
    {
      id: "F1",
      name: "Family",
      level: "初級",
      stats: "500m · 15° / 10° / 13°",
      color: "#0a9f4f",
      d: "M407 365 C398 410 389 459 381 516",
      label: [391, 430],
    },
    {
      id: "F2",
      name: "Family",
      level: "初級",
      stats: "500m · 15° / 10° / 13°",
      color: "#0a9f4f",
      d: "M508 367 C499 415 489 466 478 516",
      label: [492, 432],
    },
  ];
  const sourceLifts = [
    ["第1 Pair Lift", 350, 524, 410, 357],
    ["第1 Romance Lift", 555, 524, 573, 310],
    ["第2 Romance Lift", 505, 332, 493, 103],
  ];
  const lifts = sourceLifts.map((lift, index) => {
    if (index === 0) return ["雙人吊椅", ...lift.slice(1)];
    if (index === 1) return ["第1浪漫吊椅", ...lift.slice(1)];
    return ["第2浪漫吊椅", 620, 310, 560, 120];
  });
  const guide = courses.filter((course) => course.id !== "F2");
  return (
    <svg
      className="cartoon-trail-map fus-trail-map"
      viewBox="0 0 900 650"
      role="img"
      aria-label={`${resort}依官方配置重繪：六條雪道、三座 Lift、雪橇道及兒童雪場`}
    >
      <defs>
        <linearGradient id="fus-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8d1d3" />
          <stop offset="1" stopColor="#edf7f8" />
        </linearGradient>
        <linearGradient id="fus-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf1" />
        </linearGradient>
        <pattern
          id="fus-trees"
          width="22"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 18h6l-5 7h15l-5-7h6Z"
            fill="#75a9a5"
            stroke="#4e7f7b"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="650" fill="url(#fus-sky)" />
      <path
        className="fus-back-ridge"
        d="M0 180 89 132 173 155 262 105 348 148 438 83 531 137 623 88 715 139 808 95 900 127V650H0Z"
      />
      <path
        className="fus-forest"
        d="M60 535 C109 338 177 191 302 132 C368 101 431 85 487 79 C575 91 644 153 692 248 C746 337 788 438 835 535Z"
      />
      <path
        className="fus-snowfield"
        d="M326 535 C337 397 364 240 435 113 C452 81 483 73 511 86 C577 138 626 241 657 354 C682 423 687 483 665 535Z"
      />

      {courses.map((course) => (
        <path
          className="fus-course-corridor"
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      {courses.map((course) => (
        <path
          className="fus-course"
          d={course.d}
          key={course.id}
          style={{ "--fus-course": course.color }}
        >
          <title>{`${course.name}：${course.level}，${course.stats}`}</title>
        </path>
      ))}
      {lifts.map(([id, x1, y1, x2, y2]) => (
        <ChairLift
          id={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          color="#4d4d4d"
          chairs={4}
          key={id}
        />
      ))}
      {courses
        .filter((course) => course.id !== "F2")
        .map((course) => {
          const width = trailLabelWidth(course.name, 9, 20, 42);
          return (
            <g
              className="fus-route-label"
              transform={`translate(${course.label[0]} ${course.label[1]})`}
              key={`label-${course.id}`}
            >
              <rect
                x={-width / 2}
                y="-12"
                width={width}
                height="24"
                rx="8"
                style={{ stroke: course.color }}
              />
              <text y="4" textAnchor="middle">
                {course.name}
              </text>
            </g>
          );
        })}

      <path
        className="fus-luge"
        d="M176 280 C205 304 194 324 177 338 C159 353 198 369 180 388 C160 407 123 391 112 416 C100 442 151 454 165 481"
      />
      <g className="fus-luge-house" transform="translate(130 470)">
        <path d="M0 24V7L23-7 47 7v17" />
        <text x="24" y="41" textAnchor="middle">
          雪橇屋
        </text>
      </g>
      <g className="fus-kids" transform="translate(745 486)">
        <path d="M-74 25 C-43-13 31-16 78 17 L67 35H-63Z" />
        <text y="15" textAnchor="middle">
          兒童雪場
        </text>
      </g>
      <g className="fus-base" transform="translate(420 510)">
        <path d="M0 30V7L35-11 71 7v23M77 30V12L103-3l27 15v18" />
        <text x="65" y="48" textAnchor="middle">
          CORE HOUSE · BUS · PARKING
        </text>
      </g>
      <g className="fus-summit" transform="translate(467 70)">
        <path d="M0 25 14-5 29 25Z" />
        <text x="15" y="43" textAnchor="middle">
          標高 563m
        </text>
      </g>

      <g className="fus-title" transform="translate(20 20)">
        <rect width="310" height="78" rx="17" />
        <text x="18" y="30">
          FU'S SNOW AREA
        </text>
        <text className="fus-title-sub" x="18" y="55">
          6 COURSES · 3 LIFTS · MAX 38°
        </text>
      </g>
      <g className="fus-legend" transform="translate(690 20)">
        <rect width="188" height="116" rx="15" />
        <g transform="translate(15 23)">
          <line className="beginner" x2="27" />
          <text x="37" y="4">
            初級
          </text>
        </g>
        <g transform="translate(15 52)">
          <line className="intermediate" x2="27" />
          <text x="37" y="4">
            中級
          </text>
        </g>
        <g transform="translate(15 81)">
          <line className="advanced" x2="27" />
          <text x="37" y="4">
            上級
          </text>
        </g>
      </g>
      <g className="fus-guide" transform="translate(20 562)">
        <rect width="860" height="70" rx="15" />
        {guide.map((course, index) => (
          <g
            transform={`translate(${18 + (index % 3) * 281} ${21 + Math.floor(index / 3) * 28})`}
            key={`guide-${course.id}`}
          >
            <circle r="7" style={{ fill: course.color }} />
            <text x="11" y="-2">
              {course.name} · {course.level}
            </text>
            <text className="fus-guide-stat" x="11" y="10">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function NisekoMoiwaTrailMap({ resort }) {
  const courses = [
    {
      id: "1",
      name: "Giant Run",
      length: "600m",
      level: "advanced",
      d: "M470 108 C468 175 457 255 449 342",
      label: [448, 218],
    },
    {
      id: "2",
      name: "Expert Run",
      length: "800m",
      level: "advanced",
      d: "M382 245 C372 290 367 365 372 440",
      label: [362, 338],
    },
    {
      id: "3",
      name: "Shirakaba",
      length: "500m",
      level: "advanced",
      d: "M590 208 C568 252 560 302 574 348",
      label: [590, 282],
    },
    {
      id: "4",
      name: "Forest Run",
      length: "600m",
      level: "intermediate",
      d: "M348 258 C326 302 314 348 320 398",
      label: [318, 338],
    },
    {
      id: "5",
      name: "Sky Course",
      length: "2,000m",
      level: "intermediate",
      d: "M496 120 C565 150 650 203 681 274 C706 331 641 375 575 432",
      label: [636, 198],
    },
    {
      id: "6",
      name: "Main Course",
      length: "1,200m",
      level: "intermediate",
      d: "M452 225 C439 294 426 371 426 444",
      label: [414, 349],
    },
    {
      id: "7",
      name: "Fairy Tale",
      length: "400m",
      level: "beginner",
      d: "M306 402 C271 386 251 401 266 428 C281 454 321 455 338 435",
      label: [263, 416],
    },
    {
      id: "8",
      name: "Family Run",
      length: "600m",
      level: "beginner",
      d: "M346 389 C322 420 324 451 350 463",
      label: [330, 449],
    },
  ];
  const colors = {
    beginner: "#34a96a",
    intermediate: "#d94142",
    advanced: "#25272b",
  };
  return (
    <svg
      className="cartoon-trail-map niseko-moiwa-trail-map"
      viewBox="0 0 900 560"
      role="img"
      aria-label={`${resort} official slope map`}
    >
      <defs>
        <linearGradient id="niseko-moiwa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8bc8e2" />
          <stop offset="1" stopColor="#e9f6fa" />
        </linearGradient>
        <linearGradient id="niseko-moiwa-snow" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7eaf2" />
        </linearGradient>
        <pattern
          id="niseko-moiwa-trees"
          width="22"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path d="M11 1 4 16h5L4 23h14l-5-7h5Z" fill="#4c8371" />
        </pattern>
      </defs>
      <rect width="900" height="560" fill="url(#niseko-moiwa-sky)" />
      <path
        className="niseko-moiwa-ridge"
        d="M0 270 115 196 213 222 310 135 390 174 470 83 565 139 666 108 771 185 900 214V560H0Z"
      />
      <path
        className="niseko-moiwa-forest"
        d="M0 560V274C123 198 233 188 328 156 389 136 437 101 477 86 564 122 644 153 740 205 802 238 862 247 900 265V560Z"
      />
      <path
        className="niseko-moiwa-ski-area"
        d="M457 91 C425 149 407 214 391 268 C371 337 348 391 333 462 L474 471 C484 393 501 335 512 281 C525 219 522 151 493 102Z"
      />
      <path
        className="niseko-moiwa-ski-area is-east"
        d="M501 120 C556 140 643 198 670 254 C696 308 657 356 581 394 L546 450 493 449 C513 364 535 296 529 240Z"
      />
      <path
        className="niseko-moiwa-ski-area is-west"
        d="M393 223 C360 269 325 326 296 389 C280 424 291 451 333 466 L382 465 C372 416 373 343 392 268Z"
      />
      <path
        className="niseko-moiwa-boundary"
        d="M455 90 C419 163 397 246 374 323 C355 387 337 435 333 464M393 223 C360 269 325 326 296 389 C280 424 291 451 333 466M493 101 C550 132 635 190 670 252 C698 307 663 355 581 395 L548 450"
      />
      {courses.map((course) => (
        <path
          className={`niseko-moiwa-course is-${course.level}`}
          d={course.d}
          style={{ "--route": colors[course.level] }}
          key={course.id}
        />
      ))}
      <ChairLift
        id="Quad Lift · 1,574m"
        x1={442}
        y1={454}
        x2={466}
        y2={114}
        color="#db3d94"
        chairs={7}
      />
      <ChairLift
        id="Pair Lift #1 · 919m"
        x1={366}
        y1={461}
        x2={392}
        y2={243}
        color="#dc3d94"
        chairs={5}
      />
      <ChairLift
        id="Pair Lift #2 · 392m"
        x1={347}
        y1={463}
        x2={351}
        y2={392}
        color="#dc3d94"
        chairs={2}
      />
      {courses.map((course) => (
        <g
          className="niseko-moiwa-label"
          transform={`translate(${course.label[0]} ${course.label[1]})`}
          key={`label-${course.id}`}
        >
          <circle r="13" style={{ fill: colors[course.level] }} />
          <text y="5" textAnchor="middle">
            {course.id}
          </text>
          <title>{`${course.name} · ${course.length}`}</title>
        </g>
      ))}
      <g className="niseko-moiwa-peak" transform="translate(460 76)">
        <path d="M0 16 10-4 20 16Z" />
        <text x="10" y="32" textAnchor="middle">
          MOIWA PEAK · 790m
        </text>
        <text x="10" y="47" textAnchor="middle">
          GATE 6 / 10
        </text>
      </g>
      <g className="niseko-moiwa-base" transform="translate(386 452)">
        <path d="M0 32V9L31-10 63 9v23M68 32V13l25-15 27 15v19" />
        <text x="69" y="50" textAnchor="middle">
          CENTER LODGE · 330m
        </text>
      </g>
      <g className="niseko-moiwa-title" transform="translate(20 20)">
        <rect width="300" height="82" rx="16" />
        <text x="18" y="31">
          NISEKO MOIWA
        </text>
        <text x="18" y="55">
          SLOPE MAP
        </text>
        <text className="sub" x="18" y="73">
          6,000m · 8 ROUTES · 3 LIFTS
        </text>
      </g>
      <g className="niseko-moiwa-legend" transform="translate(677 22)">
        <rect width="202" height="116" rx="15" />
        <text x="18" y="25">
          DIFFICULTY
        </text>
        {[
          ["beginner", "BEGINNER"],
          ["intermediate", "INTERMEDIATE"],
          ["advanced", "ADVANCED / UNGROOMED"],
        ].map(([level, name], i) => (
          <g transform={`translate(18 ${49 + i * 22})`} key={level}>
            <line className={level} x2="28" />
            <text x="39" y="4">
              {name}
            </text>
          </g>
        ))}
      </g>
      <g className="niseko-moiwa-guide" transform="translate(18 489)">
        <rect width="864" height="55" rx="14" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${18 + (index % 4) * 210} ${21 + Math.floor(index / 4) * 24})`}
            key={`guide-${course.id}`}
          >
            <circle r="7" style={{ fill: colors[course.level] }} />
            <text x="12" y="4">
              {course.id} · {course.name}{" "}
              <tspan className="stat">{course.length}</tspan>
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function MoiwaTrailMap({ resort }) {
  const sourceCourses = [
    {
      id: "1",
      name: "Rabbit Flat",
      level: "上級",
      stats: "840m · 35° / 15°",
      color: "#26292b",
      d: "M625 157 C653 205 644 262 611 309 C586 344 567 387 556 440",
      label: [620, 247],
    },
    {
      id: "2U",
      name: "Dynamic Upper",
      level: "上級",
      stats: "上段 · 最大 37°",
      color: "#26292b",
      d: "M220 176 C229 213 238 250 246 284",
      label: [228, 224],
    },
    {
      id: "2L",
      name: "Dynamic Lower",
      level: "中級",
      stats: "全長 290m · 平均 22°",
      color: "#df2830",
      d: "M246 284 C254 329 263 375 276 425",
      label: [258, 348],
    },
    {
      id: "3",
      name: "Crystal",
      level: "中級",
      stats: "470m · 28° / 16°",
      color: "#df2830",
      d: "M434 187 C449 238 464 300 484 361",
      label: [454, 272],
    },
    {
      id: "5",
      name: "Family",
      level: "初級",
      stats: "400m · 13° / 10°",
      color: "#159c58",
      d: "M425 340 C403 373 385 410 371 456",
      label: [400, 390],
    },
    {
      id: "6",
      name: "Friendly",
      level: "初級",
      stats: "300m · 12° / 9°",
      color: "#159c58",
      d: "M523 331 C530 372 532 414 527 459",
      label: [530, 393],
    },
    {
      id: "7",
      name: "Connector",
      level: "初級",
      stats: "980m · 13° / 7°",
      color: "#159c58",
      d: "M72 188 C103 207 123 237 114 270 C106 301 130 329 164 342 C198 356 226 375 249 404",
      label: [122, 300],
    },
    {
      id: "8",
      name: "Sightseeing Road",
      level: "初級",
      stats: "2,620m · 7° / 5°",
      color: "#159c58",
      d: "M54 164 C161 173 273 161 368 178 C473 196 566 170 657 164 C705 162 742 178 769 205 C795 231 816 248 845 253",
      label: [500, 166],
    },
    {
      id: "9A",
      name: "Larch A",
      level: "上級",
      stats: "800m · 最大 38°",
      color: "#26292b",
      d: "M552 179 C530 224 515 269 505 315",
      label: [535, 242],
    },
    {
      id: "9B",
      name: "Larch B",
      level: "中級",
      stats: "800m · 平均 15°",
      color: "#df2830",
      d: "M576 186 C557 229 547 274 542 316",
      label: [561, 254],
    },
    {
      id: "10",
      name: "Forest",
      level: "中級",
      stats: "516m · 18° / 13°",
      color: "#df2830",
      d: "M352 177 C365 205 352 228 366 247 C380 266 397 281 405 305 C414 331 424 352 441 370",
      label: [382, 274],
    },
    {
      id: "4",
      name: "Panorama",
      level: "中級",
      stats: "800m · 24° / 12°",
      color: "#df2830",
      d: "M755 252 C720 269 700 293 709 316 C719 341 761 339 786 356 C807 371 805 405 790 441",
      label: [738, 321],
    },
  ];
  const courseGeometry = {
    1: {
      d: "M625 157 C646 184 652 215 642 247 C632 279 606 306 589 336 C571 368 560 407 556 440",
      label: [620, 238],
    },
    4: {
      d: "M838 220 C805 230 773 246 746 268 C720 289 708 310 724 326 C741 343 771 343 800 358",
      branchD:
        "M858 220 C851 256 841 293 823 326 C806 357 797 382 800 408 C802 430 808 449 803 462",
      label: [747, 304],
    },
    8: {
      d: "M54 164 C161 173 273 161 368 178 C473 196 566 170 657 164 C716 160 761 171 790 195 C812 213 832 221 858 220",
      branchD: "M858 220 C873 255 879 296 876 338 C873 381 869 425 864 462",
      label: [500, 166],
    },
  };
  const courses = sourceCourses.map((course) => ({
    ...course,
    ...(courseGeometry[course.id] ?? {}),
  }));
  const guide = [
    ["1", "Rabbit Flat", "840m · 35° / 15°", "#26292b"],
    ["2", "Dynamic", "290m · 37° / 22°", "#df2830"],
    ["3", "Crystal", "470m · 28° / 16°", "#df2830"],
    ["4", "Panorama", "800m · 24° / 12°", "#df2830"],
    ["5", "Family", "400m · 13° / 10°", "#159c58"],
    ["6", "Friendly", "300m · 12° / 9°", "#159c58"],
    ["7", "Connector", "980m · 13° / 7°", "#159c58"],
    ["8", "Sightseeing Road", "2,620m · 7° / 5°", "#159c58"],
    ["9", "Larch A / B", "800m · 38° / 15°", "#26292b"],
    ["10", "Forest", "516m · 18° / 13°", "#df2830"],
    ["11", "Fun×Fun Square", "初學者雪上活動區", "#e890a8"],
  ];
  const lifts = [
    ["Lift 1A", 477, 462, 468, 222],
    ["Lift 1B", 507, 462, 500, 219],
    ["Triple Lift 2", 571, 442, 618, 164],
    ["Pair Lift 3", 393, 438, 426, 207],
    ["Triple Lift 4", 820, 462, 838, 220],
  ];
  return (
    <svg
      className="cartoon-trail-map moiwa-trail-map"
      viewBox="0 0 900 650"
      role="img"
      aria-label={`${resort}依官方 Course Guide 重繪：北斜面、南斜面、十條雪道及 Fun Fun Square`}
    >
      <defs>
        <linearGradient id="moiwa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0e8" />
          <stop offset="1" stopColor="#edf8fb" />
        </linearGradient>
        <linearGradient id="moiwa-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="moiwa-trees"
          width="21"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 1 3 17h6l-5 7h15l-5-7h6Z"
            fill="#4d806c"
            stroke="#346553"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="650" fill="url(#moiwa-sky)" />
      <path
        className="moiwa-back-ridge"
        d="M0 214 84 168 167 194 246 130 335 174 427 115 516 168 609 112 700 167 789 120 900 157V650H0Z"
      />
      <path
        className="moiwa-forest"
        d="M38 505 C65 352 118 218 205 155 C285 132 356 150 419 185 C473 135 551 107 630 139 C674 157 703 189 728 228 C772 174 828 143 875 160 L900 505Z"
      />
      <rect
        className="moiwa-south-panel"
        x="668"
        y="143"
        width="216"
        height="359"
        rx="25"
      />
      <path
        className="moiwa-north-snow"
        d="M78 489 C101 371 139 249 204 168 C222 148 244 151 261 174 C296 235 319 330 328 474 C366 395 398 285 431 187 C451 152 488 142 521 160 C569 181 613 245 637 322 C628 379 601 431 560 480Z"
      />
      <path
        className="moiwa-south-snow"
        d="M690 486 C694 392 717 301 763 245 C789 218 821 205 845 221 C870 264 879 369 864 486Z"
      />

      {courses.map((course) => (
        <g key={`corridor-${course.id}`}>
          <path className="moiwa-course-corridor" d={course.d} />
          {course.branchD && (
            <path className="moiwa-course-corridor" d={course.branchD} />
          )}
        </g>
      ))}
      {courses.map((course) => (
        <path
          className="moiwa-course"
          d={course.d}
          key={course.id}
          style={{ "--moiwa-course": course.color }}
        >
          <title>{`${course.name}：${course.level}，${course.stats}`}</title>
        </path>
      ))}
      {courses
        .filter((course) => course.branchD)
        .map((course) => (
          <path
            className="moiwa-course"
            d={course.branchD}
            key={`branch-${course.id}`}
            style={{ "--moiwa-course": course.color }}
            aria-hidden="true"
          />
        ))}
      {lifts.map(([id, x1, y1, x2, y2]) => (
        <ChairLift
          id={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          color="#3d5460"
          chairs={5}
          key={id}
        />
      ))}
      {courses
        .filter((course) => !["2L", "9B"].includes(course.id))
        .map((course) => {
          const label = course.id.replace(/[ULAB]$/, "");
          const width = trailLabelWidth(label, 9, 16, 28);
          return (
            <g
              className="moiwa-route-label"
              transform={`translate(${course.label[0]} ${course.label[1]})`}
              key={`label-${course.id}`}
            >
              <rect
                x={-width / 2}
                y="-11"
                width={width}
                height="22"
                rx="7"
                style={{ stroke: course.color }}
              />
              <text y="4" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

      <g className="moiwa-area-label" transform="translate(88 215)">
        <rect width="112" height="34" rx="10" />
        <text x="56" y="22" textAnchor="middle">
          NORTH AREA
        </text>
      </g>
      <g className="moiwa-area-label is-south" transform="translate(718 160)">
        <rect width="112" height="34" rx="10" />
        <text x="56" y="22" textAnchor="middle">
          SOUTH AREA
        </text>
      </g>
      <g className="moiwa-base" transform="translate(433 456)">
        <path d="M0 28V8L27-8 55 8v20M61 28V11L85-3l25 14v17" />
        <text x="55" y="45" textAnchor="middle">
          NORTH LODGE · RENTAL
        </text>
      </g>
      <g className="moiwa-base" transform="translate(776 458)">
        <path d="M0 28V8L27-8 55 8v20" />
        <text x="28" y="45" textAnchor="middle">
          SOUTH BASE
        </text>
      </g>
      <g className="moiwa-fun" transform="translate(285 440)">
        <path d="M-54 23 C-29-10 20-11 56 15 L48 32H-47Z" />
        <text y="16" textAnchor="middle">
          11 · FUN×FUN SQUARE
        </text>
      </g>

      <g className="moiwa-title" transform="translate(20 20)">
        <rect width="330" height="78" rx="17" />
        <text x="18" y="30">
          札幌藻岩山滑雪場
        </text>
        <text className="moiwa-title-sub" x="18" y="55">
          10 COURSES · 5 LIFTS · NORTH / SOUTH
        </text>
      </g>
      <g className="moiwa-legend" transform="translate(690 20)">
        <rect width="188" height="116" rx="15" />
        <g transform="translate(15 23)">
          <line className="beginner" x2="27" />
          <text x="37" y="4">
            初級
          </text>
        </g>
        <g transform="translate(15 52)">
          <line className="intermediate" x2="27" />
          <text x="37" y="4">
            中級
          </text>
        </g>
        <g transform="translate(15 81)">
          <line className="advanced" x2="27" />
          <text x="37" y="4">
            上級
          </text>
        </g>
      </g>
      <g className="moiwa-guide" transform="translate(20 526)">
        <rect width="860" height="105" rx="15" />
        {guide.map(([id, name, stats, color], index) => (
          <g
            transform={`translate(${16 + (index % 4) * 211} ${21 + Math.floor(index / 4) * 29})`}
            key={`guide-${id}`}
          >
            <circle r="7" style={{ fill: color }} />
            <text x="11" y="-2">
              {id} · {name}
            </text>
            <text className="moiwa-guide-stat" x="11" y="10">
              {stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function BankeiTrailMap({ resort }) {
  const sourceCourses = [
    {
      id: "EA",
      name: "East A",
      level: "上級",
      stats: "500m · 33° / 22°",
      color: "#252729",
      d: "M250 175 C220 250 190 360 165 485",
      label: [210, 280],
    },
    {
      id: "EB",
      name: "East B",
      level: "中級",
      stats: "500m · 30° / 12°",
      color: "#d83f82",
      d: "M275 185 C256 255 245 350 225 478",
      label: [250, 330],
    },
    {
      id: "GA",
      name: "Green A",
      level: "初級",
      stats: "300m · 10° / 6°",
      color: "#238f8a",
      d: "M340 245 C320 310 330 390 355 475",
      label: [326, 331],
    },
    {
      id: "GB",
      name: "Green B",
      level: "中級",
      stats: "430m · 20° / 12°",
      color: "#d83f82",
      d: "M382 225 C370 300 375 390 400 475",
      label: [375, 295],
    },
    {
      id: "CA",
      name: "Center A",
      level: "初級",
      stats: "400m · 18° / 10°",
      color: "#238f8a",
      d: "M480 245 C467 310 470 400 478 480",
      label: [470, 330],
    },
    {
      id: "CB",
      name: "Center B",
      level: "初級",
      stats: "400m · 18° / 10°",
      color: "#238f8a",
      d: "M520 240 C515 320 520 400 522 480",
      label: [520, 311],
    },
    {
      id: "CC",
      name: "Center C",
      level: "初級",
      stats: "400m · 15° / 9°",
      color: "#238f8a",
      d: "M556 235 C552 310 558 400 565 480",
      label: [558, 350],
    },
    {
      id: "LK",
      name: "Orange Connector",
      level: "初級",
      stats: "350m · 10° / 6°",
      color: "#238f8a",
      d: "M392 232 C470 225 560 230 645 250",
      label: [500, 216],
    },
    {
      id: "OR",
      name: "Orange",
      level: "中級",
      stats: "1,250m · 30° / 12°",
      color: "#d83f82",
      d: "M560 145 C570 220 590 300 625 355 C648 393 635 435 610 478",
      label: [602, 287],
    },
    {
      id: "SL",
      name: "Slalom",
      level: "上級",
      stats: "270m · 30° / 30°",
      color: "#252729",
      d: "M650 150 C665 215 685 280 708 340",
      label: [674, 235],
    },
    {
      id: "MG",
      name: "FIS Mogul",
      level: "上級",
      stats: "270m · 27° / 27°",
      color: "#252729",
      d: "M700 142 C712 200 725 270 742 335",
      label: [718, 215],
    },
    {
      id: "HP",
      name: "FIS Halfpipe",
      level: "專用",
      stats: "180m · 平均 17°",
      color: "#92a91c",
      d: "M735 350 C720 380 705 420 695 470",
      label: [714, 405],
    },
    {
      id: "WA",
      name: "West A",
      level: "中級",
      stats: "400m · 20° / 12°",
      color: "#d83f82",
      d: "M790 220 C770 300 760 390 748 480",
      label: [775, 315],
    },
    {
      id: "WF",
      name: "West Forest",
      level: "初級",
      stats: "900m · 10° / 6°",
      color: "#238f8a",
      d: "M810 195 C786 250 775 320 765 360",
      label: [794, 255],
    },
    {
      id: "DG",
      name: "Acorn",
      level: "初級",
      stats: "400m · 15° / 8°",
      color: "#238f8a",
      d: "M835 170 C820 245 812 330 805 480",
      label: [817, 290],
    },
    {
      id: "KR",
      name: "Walnut",
      level: "初級",
      stats: "800m · 10° / 6°",
      color: "#238f8a",
      d: "M850 190 C842 260 840 350 840 480",
      label: [842, 365],
    },
    {
      id: "KN",
      name: "Mushroom",
      level: "初級",
      stats: "400m · 14° / 12°",
      color: "#238f8a",
      d: "M870 220 C860 300 864 390 870 480",
      label: [866, 420],
    },
  ];
  const courseGeometry = {
    EA: {
      d: "M250 175 C231 215 219 260 208 303 C197 349 177 399 163 439 C157 458 153 473 150 485",
      label: [205, 286],
    },
    EB: {
      d: "M276 185 C271 230 255 269 251 310 C247 351 250 393 232 430 C224 447 218 464 215 478",
      label: [249, 322],
    },
    GA: {
      d: "M355 234 C332 268 330 302 340 332 C350 363 358 390 352 420 C348 440 356 460 365 475",
      label: [341, 320],
    },
    GB: {
      d: "M396 216 C378 251 380 289 390 323 C400 357 397 391 405 423 C411 446 417 464 420 475",
      label: [389, 286],
    },
    CA: {
      d: "M465 278 C448 322 449 363 458 399 C466 431 476 458 480 480",
      label: [459, 333],
    },
    CB: {
      d: "M510 265 C502 307 506 350 516 387 C525 420 529 451 530 480",
      label: [508, 313],
    },
    CC: {
      d: "M548 260 C546 302 553 345 566 383 C578 418 587 452 590 480",
      label: [557, 354],
    },
    LK: {
      d: "M396 220 C455 213 505 223 555 234 C609 245 659 266 705 300",
      label: [518, 225],
    },
    OR: {
      d: "M585 145 C590 188 607 225 629 260 C650 294 659 329 653 366 C647 405 630 448 615 478",
      label: [631, 267],
    },
    SL: {
      d: "M642 150 C654 190 671 228 689 265 C701 289 709 315 716 338",
      label: [675, 214],
    },
    MG: {
      d: "M686 143 C697 180 713 219 729 258 C741 287 751 313 760 336",
      label: [716, 202],
    },
    HP: { d: "M760 342 C742 378 724 424 710 470", label: [729, 401] },
    WA: {
      d: "M883 326 C891 357 893 391 889 420 C886 444 883 464 881 480",
      label: [885, 371],
    },
    WF: {
      d: "M742 310 C758 275 783 244 812 229 C833 219 847 231 836 249 C816 276 790 302 781 334 C772 371 774 419 780 465",
      label: [792, 272],
    },
    DG: {
      d: "M812 337 C824 366 821 401 814 431 C809 450 805 466 804 480",
      label: [812, 374],
    },
    KR: {
      d: "M842 356 C851 386 849 419 843 445 C839 461 837 472 837 480",
      label: [846, 406],
    },
    KN: {
      d: "M858 374 C864 401 863 431 859 453 C856 465 856 475 857 480",
      label: [858, 436],
    },
  };
  const courses = sourceCourses.map((course) => ({
    ...course,
    ...courseGeometry[course.id],
  }));
  const lifts = [
    ["East Pair", 150, 487, 250, 175],
    ["Center Triple", 530, 487, 526, 240],
    ["Orange Pair", 615, 485, 560, 145],
    ["West Pair", 780, 487, 835, 220],
  ];
  return (
    <svg
      className="cartoon-trail-map bankei-trail-map"
      viewBox="0 0 900 650"
      role="img"
      aria-label={`${resort}依官方雪道圖重繪：EAST、CENTER、WEST 三區及十七條雪道`}
    >
      <defs>
        <linearGradient id="bankei-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0e8" />
          <stop offset="1" stopColor="#eaf7fb" />
        </linearGradient>
        <linearGradient id="bankei-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#deedf3" />
        </linearGradient>
        <pattern
          id="bankei-trees"
          width="22"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 18h6l-5 7h15l-5-7h6Z"
            fill="#4f806d"
            stroke="#356454"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="650" fill="url(#bankei-sky)" />
      <path
        className="bankei-back-ridge"
        d="M0 220 92 168 177 195 270 125 360 176 450 116 545 171 635 105 725 160 814 119 900 154V650H0Z"
      />
      <path
        className="bankei-forest"
        d="M70 515 C120 345 190 182 270 135 C345 172 404 208 445 248 C490 171 552 112 615 106 C679 128 723 168 755 222 C794 166 840 139 876 151 L900 515Z"
      />
      <path
        className="bankei-east-snow"
        d="M118 497 C132 379 169 248 239 167 C259 144 284 147 301 170 C337 231 362 341 370 493Z"
      />
      <path
        className="bankei-center-snow"
        d="M342 496 C363 350 410 218 575 118 C630 145 679 231 710 340 C716 402 681 459 640 496Z"
      />
      <path
        className="bankei-west-snow"
        d="M700 496 C715 389 744 283 805 205 C829 177 852 183 868 215 C888 274 891 387 882 496Z"
      />

      {courses.map((course) => (
        <path
          className="bankei-course-corridor"
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      {courses.map((course) => (
        <path
          className="bankei-course"
          d={course.d}
          key={course.id}
          style={{ "--bankei-course": course.color }}
        >
          <title>{`${course.name}：${course.level}，${course.stats}`}</title>
        </path>
      ))}
      {lifts.map(([id, x1, y1, x2, y2]) => (
        <ChairLift
          id={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          color="#f1a018"
          chairs={5}
          key={id}
        />
      ))}

      {courses.map((course) => {
        const width = trailLabelWidth(course.id, 9, 14, 26);
        return (
          <g
            className="bankei-route-label"
            transform={`translate(${course.label[0]} ${course.label[1]})`}
            key={`label-${course.id}`}
          >
            <rect
              x={-width / 2}
              y="-10"
              width={width}
              height="20"
              rx="7"
              style={{ stroke: course.color }}
            />
            <text y="4" textAnchor="middle">
              {course.id}
            </text>
          </g>
        );
      })}
      <g className="bankei-area-label" transform="translate(118 200)">
        <rect width="92" height="32" rx="10" />
        <text x="46" y="21" textAnchor="middle">
          EAST
        </text>
      </g>
      <g className="bankei-area-label" transform="translate(444 167)">
        <rect width="105" height="32" rx="10" />
        <text x="52" y="21" textAnchor="middle">
          CENTER
        </text>
      </g>
      <g className="bankei-area-label" transform="translate(790 205)">
        <rect width="88" height="32" rx="10" />
        <text x="44" y="21" textAnchor="middle">
          WEST
        </text>
      </g>
      <g className="bankei-base" transform="translate(430 474)">
        <path d="M0 30V8L28-9 57 8v22M64 30V12L88-2l25 14v18M120 30V10l26-15 27 15v20" />
        <text x="86" y="48" textAnchor="middle">
          CENTER LODGE · RENTAL · RESTAURANT
        </text>
      </g>
      <g className="bankei-base" transform="translate(742 475)">
        <path d="M0 28V8L27-8 55 8v20" />
        <text x="28" y="45" textAnchor="middle">
          WEST HOUSE
        </text>
      </g>
      <g className="bankei-snowland" transform="translate(354 449)">
        <path d="M-41 20 C-19-8 18-11 43 14 L37 29H-35Z" />
        <text y="14" textAnchor="middle">
          SNOW LAND
        </text>
      </g>

      <g className="bankei-title" transform="translate(20 20)">
        <rect width="315" height="78" rx="17" />
        <text x="18" y="30">
          札幌盤溪滑雪場
        </text>
        <text className="bankei-title-sub" x="18" y="55">
          17 COURSES · 4 LIFTS · 3 AREAS
        </text>
      </g>
      <g className="bankei-legend" transform="translate(690 20)">
        <rect width="188" height="116" rx="15" />
        <g transform="translate(15 23)">
          <line className="beginner" x2="27" />
          <text x="37" y="4">
            初級 0°–15°
          </text>
        </g>
        <g transform="translate(15 52)">
          <line className="intermediate" x2="27" />
          <text x="37" y="4">
            中級 15°–20°
          </text>
        </g>
        <g transform="translate(15 81)">
          <line className="advanced" x2="27" />
          <text x="37" y="4">
            上級 27° 以上
          </text>
        </g>
      </g>
      <g className="bankei-guide" transform="translate(20 535)">
        <rect width="860" height="96" rx="15" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${16 + (index % 6) * 142} ${20 + Math.floor(index / 6) * 28})`}
            key={`guide-${course.id}`}
          >
            <circle r="7" style={{ fill: course.color }} />
            <text x="11" y="-2">
              {course.id} · {course.name}
            </text>
            <text className="bankei-guide-stat" x="11" y="10">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function KokusaiTrailMap({ resort }) {
  const courses = [
    {
      id: 1,
      name: "林間 Course",
      level: "初級",
      stats: "1.2km · 最大12° · 平均8°",
      color: "#18a653",
      d: "M520 77 C592 82 666 102 739 137 C771 153 792 174 803 198",
      label: [665, 105],
    },
    {
      id: 2,
      name: "Marchen",
      level: "初級",
      stats: "2.4km · 最大12° · 平均8°",
      color: "#18a653",
      d: "M803 198 C833 238 842 287 826 324 C808 356 774 367 737 374 C778 381 813 399 815 429 C816 463 781 491 728 505 C634 525 522 526 405 516",
      label: [799, 342],
    },
    {
      id: 3,
      name: "Woody",
      level: "中級",
      stats: "1.2km · 最大16° · 平均11°",
      color: "#df2530",
      d: "M528 83 C603 115 673 157 732 210 C767 243 787 282 778 319 C769 346 742 365 706 379",
      label: [682, 168],
    },
    {
      id: 4,
      name: "Swing",
      level: "中級",
      stats: "2.0km · 最大28° · 平均10°",
      color: "#df2530",
      d: "M526 84 C571 130 604 182 615 235 C622 279 603 316 567 346 C530 378 496 414 468 462",
      label: [571, 291],
    },
    {
      id: 5,
      name: "Family",
      level: "中級",
      stats: "1.6km · 最大20° · 平均11°",
      color: "#df2530",
      d: "M706 379 C630 388 557 408 490 440 C426 471 364 493 298 508",
      label: [545, 421],
    },
    {
      id: 6,
      name: "Echo",
      level: "上級",
      stats: "1.0km · 最大22° · 平均12°",
      color: "#26292b",
      d: "M522 81 C550 126 572 174 574 224 C575 258 566 286 548 310",
      label: [568, 183],
    },
    {
      id: 7,
      name: "Downhill",
      level: "上級",
      stats: "2.2km · 最大30° · 平均15°",
      color: "#26292b",
      d: "M494 79 C433 119 381 174 351 239 C323 301 291 367 257 427 C237 462 235 489 263 511",
      label: [329, 315],
    },
  ];
  const lifts = [
    { name: "Sky Cabin 8 · 2,000m", d: "M276 511 L495 76", label: [356, 305] },
    { name: "Echo Quad · 1,005m", d: "M548 337 L524 82", label: [550, 224] },
    { name: "Woody Pair · 810m", d: "M782 177 L542 77", label: [699, 119] },
    {
      name: "Marchen Quad · 1,300m",
      d: "M405 516 L760 358",
      label: [581, 443],
    },
  ];
  return (
    <svg
      className="cartoon-trail-map kokusai-trail-map"
      viewBox="0 0 900 620"
      role="img"
      aria-label={`${resort}依官方配置重繪：七條雪道、四座主要 Lift、山頂 1,100m 與山麓 630m`}
    >
      <defs>
        <linearGradient id="kokusai-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a4d7e9" />
          <stop offset="1" stopColor="#edf8fc" />
        </linearGradient>
        <linearGradient id="kokusai-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="kokusai-trees"
          width="21"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 1 3 16h5l-5 7h15l-5-7h6Z"
            fill="#527e70"
            stroke="#356258"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="620" fill="url(#kokusai-sky)" />
      <path
        className="kokusai-back-ridge"
        d="M0 223 94 171 183 194 282 139 377 164 471 105 574 143 676 98 778 139 900 111V620H0Z"
      />
      <path
        className="kokusai-forest"
        d="M62 535 C133 371 208 236 338 131 C406 76 471 55 527 65 C649 87 757 177 833 318 C852 393 846 467 813 535Z"
      />
      <path
        className="kokusai-snowfield"
        d="M195 519 C240 401 286 283 366 177 C424 105 477 69 520 68 C576 84 621 118 663 166 C717 213 754 276 761 338 C720 383 662 410 595 431 C512 466 430 498 341 519Z"
      />
      <path
        className="kokusai-right-field"
        d="M520 70 C624 79 731 123 801 188 C841 238 856 298 836 348 C819 372 791 382 755 386 C824 400 850 431 826 472 C787 521 689 541 563 538 L383 523 C477 487 559 452 634 413 C693 384 737 345 754 300 C739 203 644 111 520 70Z"
      />
      <path
        className="kokusai-prohibited"
        d="M458 132 C497 113 531 116 556 142 C542 190 538 244 548 300 C514 333 479 340 443 320 C430 255 436 188 458 132Z"
      />

      {courses.map((course) => (
        <path
          className="kokusai-course-corridor"
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      {courses.map((course) => (
        <path
          className="kokusai-course"
          d={course.d}
          key={course.id}
          style={{ "--kokusai-course": course.color }}
        >
          <title>{`${course.name}｜${course.level}｜${course.stats}`}</title>
        </path>
      ))}
      {lifts.map((lift) => (
        <g className="kokusai-lift" key={lift.name}>
          <path d={lift.d} />
          <text
            x={lift.label[0]}
            y={lift.label[1]}
            transform={`rotate(-25 ${lift.label[0]} ${lift.label[1]})`}
          >
            {lift.name}
          </text>
        </g>
      ))}

      {courses.map((course, index) => {
        const points = [
          [565, 112],
          [784, 315],
          [703, 185],
          [574, 284],
          [533, 413],
          [554, 165],
          [311, 304],
        ];
        const [x, y] = points[index];
        const width = trailLabelWidth(course.name, 9, 18, 38);
        return (
          <g
            className="kokusai-route-label"
            transform={`translate(${x} ${y})`}
            key={`label-${course.id}`}
          >
            <circle r="11" style={{ fill: course.color }} />
            <text y="4" textAnchor="middle">
              {course.id}
            </text>
            <rect
              x="16"
              y="-11"
              width={width}
              height="22"
              rx="7"
              style={{ stroke: course.color }}
            />
            <text className="route-name" x="25" y="4">
              {course.name}
            </text>
          </g>
        );
      })}

      <g className="kokusai-summit" transform="translate(501 45)">
        <path d="M0 25 14-4 29 25Z" />
        <text x="15" y="43" textAnchor="middle">
          山頂 1,100m · Café
        </text>
      </g>
      <g className="kokusai-base" transform="translate(214 494)">
        <path d="M0 30V8L28-9 57 8v22M62 30V13L84 0l23 13v17M112 30V9l24-14 25 14v21" />
        <text x="81" y="47" textAnchor="middle">
          Ski Center · Lounge · Parking
        </text>
      </g>
      <g className="kokusai-snowplay" transform="translate(160 479)">
        <path d="M-40 18 C-18-6 18-8 43 13 L36 30H-36Z" />
        <text y="13" textAnchor="middle">
          Snow Playground
        </text>
      </g>

      <g className="kokusai-title" transform="translate(20 20)">
        <rect width="298" height="80" rx="17" />
        <text x="18" y="30">
          札幌國際滑雪場
        </text>
        <text className="kokusai-title-sub" x="18" y="55">
          7 COURSES · 4 LIFTS · 3.6km LONG RUN
        </text>
      </g>
      <g className="kokusai-legend" transform="translate(700 20)">
        <rect width="178" height="104" rx="15" />
        <g transform="translate(15 22)">
          <line className="beginner" x2="26" />
          <text x="35" y="4">
            初級
          </text>
        </g>
        <g transform="translate(15 50)">
          <line className="intermediate" x2="26" />
          <text x="35" y="4">
            中級
          </text>
        </g>
        <g transform="translate(15 78)">
          <line className="advanced" x2="26" />
          <text x="35" y="4">
            上級
          </text>
        </g>
      </g>
      <g className="kokusai-guide" transform="translate(20 535)">
        <rect width="860" height="76" rx="14" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${18 + (index % 4) * 211} ${19 + Math.floor(index / 4) * 34})`}
            key={`guide-${course.id}`}
          >
            <circle r="8" style={{ fill: course.color }} />
            <text x="12" y="-3">
              {course.name} · {course.level}
            </text>
            <text className="kokusai-guide-stat" x="12" y="11">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function TeineTrailMap({ resort }) {
  const courses = [
    {
      id: "HZ1",
      name: "City View Cruise",
      level: "中級",
      stats: "1,200m · 21° / 13°",
      color: "#df2830",
      d: "M492 72 C414 101 326 139 242 181 C179 212 119 236 70 247",
    },
    {
      id: "HZ2",
      name: "City View Panorama",
      level: "中級",
      stats: "1,200m · 30° / 13°",
      color: "#df2830",
      d: "M500 77 C447 116 393 161 345 203 C314 229 287 247 258 260",
    },
    {
      id: "HZ3",
      name: "女子大回轉",
      level: "上級",
      stats: "2,000m · 34° / 16°",
      color: "#26292b",
      d: "M508 77 C470 118 430 157 398 190 C380 211 390 236 421 260 C449 282 479 305 503 331",
    },
    {
      id: "HZ4",
      name: "北壁",
      level: "最上級",
      stats: "1,500m · 36° / 20°",
      color: "#623786",
      d: "M521 79 C539 130 557 182 573 231 C589 270 603 303 620 331",
    },
    {
      id: "HZ5",
      name: "Natural",
      level: "初級",
      stats: "4,000m · 12° / 8°",
      color: "#36a84f",
      d: "M465 85 C420 97 375 109 368 127 C361 145 391 151 375 170 C357 191 316 187 302 207 C288 228 321 241 308 262 C295 282 270 291 286 313 C316 350 421 361 565 367",
    },
    {
      id: "HZ6",
      name: "男女回轉",
      level: "上級",
      stats: "700m · 34° / 21°",
      color: "#26292b",
      d: "M388 286 C414 300 445 318 483 345",
    },
    {
      id: "HZ7",
      name: "Paradise",
      level: "初級",
      stats: "600m · 24° / 12°",
      color: "#36a84f",
      d: "M442 185 C470 202 501 222 533 244 C554 260 558 283 566 312 C570 329 576 347 586 361",
    },
    {
      id: "OZ1",
      name: "Rainbow",
      level: "初級",
      stats: "1,700m · 11° / 5°",
      color: "#36a84f",
      d: "M570 367 C503 385 437 403 370 421 C299 439 228 455 178 474 C137 489 121 514 148 536",
    },
    {
      id: "OZ2",
      name: "白樺 Sunshine",
      level: "初級",
      stats: "520m · 20° / 13°",
      color: "#36a84f",
      d: "M284 451 C252 477 222 508 198 548",
    },
    {
      id: "OZ3",
      name: "白樺 Sun Trap",
      level: "初級",
      stats: "520m · 21° / 13°",
      color: "#36a84f",
      d: "M392 445 C374 478 354 512 330 548",
    },
    {
      id: "OZ4",
      name: "白樺 Sunrise",
      level: "中級",
      stats: "300m · 20° / 14°",
      color: "#df2830",
      d: "M523 450 C493 482 461 516 425 549",
    },
    {
      id: "OZ5",
      name: "白樺 Sundance",
      level: "初級",
      stats: "350m · 15° / 9°",
      color: "#36a84f",
      d: "M624 469 C589 493 553 521 516 552",
    },
    {
      id: "OZ6",
      name: "Ocean Dive",
      level: "上級",
      stats: "520m · 38° / 20°",
      color: "#26292b",
      d: "M675 454 C693 480 713 514 741 555",
    },
    {
      id: "OZ7",
      name: "Ocean Cruise",
      level: "中級",
      stats: "520m · 23° / 20°",
      color: "#df2830",
      d: "M699 448 C721 478 745 514 770 554",
    },
    {
      id: "OZ8",
      name: "Ocean Stream",
      level: "初級",
      stats: "800m · 15° / 9°",
      color: "#36a84f",
      d: "M719 442 C766 449 797 470 798 492 C799 512 776 524 778 540 C780 553 790 564 800 576",
    },
  ];
  const lifts = [
    ["Panorama 1", 92, 226, 487, 68, "#416990"],
    ["Panorama 2", 279, 247, 496, 72, "#416990"],
    ["Summit Express", 559, 351, 511, 75, "#416990"],
    ["Paradise", 571, 350, 446, 185, "#416990"],
    ["Eight Gondola", 205, 454, 553, 362, "#318b88"],
    ["Shirakaba 1", 307, 554, 385, 447, "#416990"],
    ["Shirakaba 2", 430, 554, 516, 450, "#416990"],
    ["Shirakaba 3", 530, 554, 617, 469, "#416990"],
    ["Seikadai", 800, 576, 696, 445, "#416990"],
  ];
  return (
    <svg
      className="cartoon-trail-map teine-trail-map"
      viewBox="0 0 900 710"
      role="img"
      aria-label={`${resort}依官方 PDF 重繪：Highland 七條、Olympia 八條，共十五條雪道與九座 Lift/Gondola`}
    >
      <defs>
        <linearGradient id="teine-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#85cce7" />
          <stop offset="1" stopColor="#edf8fc" />
        </linearGradient>
        <linearGradient id="teine-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="teine-trees"
          width="21"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M10 1 3 16h5l-5 7h15l-5-7h6Z"
            fill="#4f8c6e"
            stroke="#326b53"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="710" fill="url(#teine-sky)" />
      <path
        className="teine-back-ridge"
        d="M0 229 84 172 169 198 251 137 335 166 426 112 517 151 609 105 700 154 790 119 900 151V680H0Z"
      />
      <path
        className="teine-forest"
        d="M35 585 C84 405 139 254 267 145 C364 61 458 37 535 65 C620 98 669 180 693 282 C766 332 830 414 875 585Z"
      />
      <path
        className="teine-highland"
        d="M55 271 C158 216 267 155 458 68 C487 54 515 55 534 70 C575 127 615 210 643 318 C621 343 598 361 568 375 C452 358 351 325 255 285 C178 276 112 279 55 271Z"
      />
      <path
        className="teine-olympia"
        d="M107 567 C111 504 145 464 205 442 C311 412 431 414 548 438 C651 424 769 420 829 451 C867 484 875 536 850 579Z"
      />
      <path
        className="teine-connector"
        d="M552 346 C489 374 418 396 346 417 C286 434 229 447 176 470 L194 492 C310 457 430 431 568 391Z"
      />
      <path
        className="teine-north-wall"
        d="M508 74 C553 104 586 155 607 216 C625 261 635 300 640 330 C617 328 596 317 580 297 C559 228 538 151 508 74Z"
      />

      {courses.map((course) => (
        <path
          className="teine-course-corridor"
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      {courses.map((course) => (
        <path
          className="teine-course"
          d={course.d}
          key={course.id}
          style={{ "--teine-course": course.color }}
        >
          <title>{`${course.id} ${course.name}｜${course.level}｜${course.stats}`}</title>
        </path>
      ))}
      {lifts.map(([id, x1, y1, x2, y2, color]) => (
        <ChairLift
          id={id}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          color={color}
          chairs={3}
          key={id}
        />
      ))}

      {courses.map((course, index) => {
        const points = [
          [225, 177],
          [329, 217],
          [429, 207],
          [573, 166],
          [290, 251],
          [438, 307],
          [541, 249],
          [310, 421],
          [236, 492],
          [362, 492],
          [474, 492],
          [575, 505],
          [681, 483],
          [733, 504],
          [790, 483],
        ];
        const [x, y] = points[index];
        const labelWidth = trailLabelWidth(course.id, 9, 14, 30);
        return (
          <g
            className="teine-route-label"
            transform={`translate(${x} ${y})`}
            key={`label-${course.id}`}
          >
            <rect
              x={-labelWidth / 2}
              y="-11"
              width={labelWidth}
              height="22"
              rx="7"
              style={{ stroke: course.color }}
            />
            <text y="4" textAnchor="middle">
              {course.id}
            </text>
          </g>
        );
      })}

      <g className="teine-summit" transform="translate(480 40)">
        <path d="M0 25 14-5 29 25Z" />
        <text x="15" y="43" textAnchor="middle">
          手稻山 1,023m
        </text>
      </g>
      <g className="teine-zone-label" transform="translate(70 295)">
        <rect width="146" height="45" rx="12" />
        <text x="73" y="20" textAnchor="middle">
          HIGHLAND ZONE
        </text>
        <text className="teine-zone-sub" x="73" y="36" textAnchor="middle">
          7 COURSES
        </text>
      </g>
      <g className="teine-zone-label" transform="translate(72 397)">
        <rect width="150" height="45" rx="12" />
        <text x="75" y="20" textAnchor="middle">
          OLYMPIA ZONE
        </text>
        <text className="teine-zone-sub" x="75" y="36" textAnchor="middle">
          8 COURSES · NIGHT SKI
        </text>
      </g>
      <g className="teine-base" transform="translate(544 347)">
        <path d="M0 27V8L24-7 49 8v19" />
        <text x="25" y="43" textAnchor="middle">
          Highland Center
        </text>
      </g>
      <g className="teine-base" transform="translate(122 537)">
        <path d="M0 27V8L28-8 57 8v19" />
        <text x="29" y="43" textAnchor="middle">
          Olympia Center
        </text>
      </g>
      <g className="teine-base" transform="translate(407 537)">
        <path d="M0 27V8L24-7 49 8v19" />
        <text x="25" y="43" textAnchor="middle">
          Snow Land
        </text>
      </g>
      <g className="teine-base" transform="translate(741 550)">
        <path d="M0 27V8L24-7 49 8v19" />
        <text x="25" y="43" textAnchor="middle">
          Seikadai
        </text>
      </g>

      <g className="teine-title" transform="translate(20 20)">
        <rect width="285" height="78" rx="17" />
        <text x="18" y="29">
          札幌手稻滑雪場
        </text>
        <text className="teine-title-sub" x="18" y="54">
          15 COURSES · 9 LIFTS · 2 ZONES
        </text>
      </g>
      <g className="teine-legend" transform="translate(698 20)">
        <rect width="180" height="122" rx="15" />
        <g transform="translate(15 21)">
          <line className="beginner" x2="26" />
          <text x="35" y="4">
            初級 35%
          </text>
        </g>
        <g transform="translate(15 48)">
          <line className="intermediate" x2="26" />
          <text x="35" y="4">
            中級 40%
          </text>
        </g>
        <g transform="translate(15 75)">
          <line className="advanced" x2="26" />
          <text x="35" y="4">
            上級
          </text>
        </g>
        <g transform="translate(15 101)">
          <line className="expert" x2="26" />
          <text x="35" y="4">
            最上級 25%
          </text>
        </g>
      </g>
      <g className="teine-guide" transform="translate(20 590)">
        <rect width="860" height="103" rx="15" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${17 + (index % 5) * 169} ${21 + Math.floor(index / 5) * 29})`}
            key={`guide-${course.id}`}
          >
            <circle r="8" style={{ fill: course.color }} />
            <text x="12" y="-2">
              {course.id} · {course.name}
            </text>
            <text className="teine-guide-stat" x="12" y="11">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function TenguyamaTrailMap({ resort }) {
  const courses = [
    {
      id: "A",
      name: "Family",
      level: "初級",
      stats: "400m · 最大16° · 平均11°",
      color: "#f4ae18",
      d: "M470 83 C480 108 489 132 499 157",
      label: [505, 105],
    },
    {
      id: "B",
      name: "Long Line",
      level: "中級",
      stats: "1,247m · 最大23° · 平均13°",
      color: "#08a34f",
      d: "M558 130 C645 153 735 181 781 215 C805 235 799 258 774 277 C739 301 690 310 648 336 C603 363 586 405 558 440 C531 470 491 486 443 490",
      label: [665, 165],
    },
    {
      id: "C",
      name: "Bambi",
      level: "中級",
      stats: "270m · 最大22° · 平均19°",
      color: "#08a34f",
      d: "M355 300 C343 348 330 403 315 465",
      label: [347, 353],
    },
    {
      id: "D",
      name: "Old",
      level: "上級",
      stats: "947m · 最大38° · 平均17°",
      color: "#ef382d",
      d: "M514 164 C507 214 501 266 494 326",
      label: [530, 215],
    },
    {
      id: "E",
      name: "New",
      level: "上級・非壓雪",
      stats: "963m · 最大40° · 平均19°",
      color: "#ef382d",
      d: "M407 172 C397 230 385 302 370 380",
      label: [386, 269],
    },
  ];
  return (
    <svg
      className="cartoon-trail-map tengu-trail-map"
      viewBox="0 0 900 570"
      role="img"
      aria-label={`${resort}依官方空拍配置重繪：A 至 E 五條雪道、Ropeway、Pair Lift 與山麓初學者區`}
    >
      <defs>
        <linearGradient id="tengu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ecfea" />
          <stop offset="1" stopColor="#edf8fc" />
        </linearGradient>
        <linearGradient id="tengu-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dceaf2" />
        </linearGradient>
        <pattern
          id="tengu-trees"
          width="22"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 18h6l-5 7h15l-5-7h6Z"
            fill="#517f70"
            stroke="#356357"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="570" fill="url(#tengu-sky)" />
      <path
        className="tengu-far-mountain"
        d="M0 190 76 146 139 168 211 119 287 151 365 104 447 144 527 92 609 139 692 78 775 131 850 94 900 121V570H0Z"
      />
      <path className="tengu-yotei" d="M696 112 735 42 779 112Z" />
      <path
        className="tengu-yotei-snow"
        d="m715 78 20-36 23 38-14-8-9 12-8-11z"
      />
      <path
        className="tengu-forest"
        d="M123 505 C176 353 231 217 343 118 C402 68 468 57 531 82 C628 130 711 229 795 505Z"
      />
      <path
        className="tengu-snowfield"
        d="M257 492 C286 373 327 241 395 127 C428 80 471 67 514 82 C558 117 588 160 605 207 C639 245 651 297 633 342 C606 387 570 435 521 491Z"
      />
      <path
        className="tengu-longline-field"
        d="M512 91 C594 116 684 157 767 201 C807 224 815 253 789 280 C754 311 700 319 656 348 C612 382 595 432 557 470 C527 497 488 510 438 502 C486 456 514 407 532 354 C558 310 584 274 593 229 C583 174 553 126 512 91Z"
      />
      <path
        className="tengu-new-unpacked"
        d="M357 150 C395 127 429 122 456 139 C444 221 426 305 397 394 C371 406 347 402 328 383 C344 303 355 223 357 150Z"
      />

      {courses.map((course) => (
        <path
          className="tengu-course-corridor"
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      {courses.map((course) => (
        <path
          className="tengu-course"
          d={course.d}
          key={course.id}
          style={{ "--tengu-course": course.color }}
        >
          <title>{`${course.id} ${course.name}｜${course.level}｜${course.stats}`}</title>
        </path>
      ))}

      <g className="tengu-ropeway" aria-label="Tenguyama Ropeway">
        <line x1="439" y1="488" x2="434" y2="92" />
        {[0.28, 0.55, 0.8].map((p) => (
          <g
            transform={`translate(${439 + (434 - 439) * p} ${488 + (92 - 488) * p})`}
            key={p}
          >
            <line y1="-8" y2="-17" />
            <path d="M-13-8H13L10 10H-10Z" />
          </g>
        ))}
        <circle cx="434" cy="92" r="8" />
        <circle cx="439" cy="488" r="8" />
      </g>
      <ChairLift
        id="Pair Lift"
        x1={270}
        y1={486}
        x2={383}
        y2={151}
        color="#986322"
        chairs={6}
      />

      {courses.map((course) => {
        const width = trailLabelWidth(course.name, 10, 18, 34);
        return (
          <g
            className="tengu-route-label"
            transform={`translate(${course.label[0]} ${course.label[1]})`}
            key={`label-${course.id}`}
          >
            <circle r="21" style={{ fill: course.color }} />
            <text y="8" textAnchor="middle">
              {course.id}
            </text>
            <rect
              x="25"
              y="-12"
              width={width}
              height="24"
              rx="8"
              style={{ stroke: course.color }}
            />
            <text className="tengu-route-name" x="34" y="4">
              {course.name}
            </text>
          </g>
        );
      })}

      <g className="tengu-top-station" transform="translate(398 92)">
        <path d="M0 28V8L26-8 53 8v20" />
        <rect x="17" y="12" width="19" height="16" />
        <text x="27" y="46" textAnchor="middle">
          山頂站 · Café · AED
        </text>
      </g>
      <g className="tengu-base" transform="translate(330 470)">
        <path d="M0 30V8L28-9 57 8v22M63 30V13L85 0l23 13v17M114 30V9l25-14 26 14v21" />
        <text x="83" y="47" textAnchor="middle">
          山麓站 · Rental · Parking · Bus
        </text>
      </g>
      <g className="tengu-beginner" transform="translate(229 458)">
        <path d="M-48 16 C-23-7 19-8 49 13 L42 32H-43Z" />
        <text y="13" textAnchor="middle">
          初學者區
        </text>
      </g>
      <g className="tengu-snowpark" transform="translate(520 449)">
        <path d="M-44 22 C-18-9 20-12 49 13 L40 32H-39Z" />
        <text y="15" textAnchor="middle">
          Snow Park
        </text>
      </g>

      <g className="tengu-title" transform="translate(20 20)">
        <rect width="300" height="80" rx="17" />
        <text x="18" y="30">
          小樽天狗山滑雪場
        </text>
        <text className="tengu-title-sub" x="18" y="55">
          5 COURSES · ROPEWAY · PAIR LIFT
        </text>
      </g>
      <g className="tengu-legend" transform="translate(700 20)">
        <rect width="178" height="104" rx="15" />
        <g transform="translate(15 22)">
          <line className="beginner" x2="26" />
          <text x="35" y="4">
            初級
          </text>
        </g>
        <g transform="translate(15 50)">
          <line className="intermediate" x2="26" />
          <text x="35" y="4">
            中級
          </text>
        </g>
        <g transform="translate(15 78)">
          <line className="advanced" x2="26" />
          <text x="35" y="4">
            上級
          </text>
        </g>
      </g>
      <g className="tengu-guide" transform="translate(20 516)">
        <rect width="860" height="40" rx="13" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${18 + index * 169} 20)`}
            key={`guide-${course.id}`}
          >
            <circle r="8" style={{ fill: course.color }} />
            <text x="12" y="-2">
              {course.id} · {course.name}
            </text>
            <text className="tengu-guide-stat" x="12" y="11">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function AsariTrailMap({ resort }) {
  const courses = [
    {
      name: "紫色道",
      level: "中級",
      stats: "1,100m · 最大24° · 平均15°",
      color: "#df2029",
      d: "M178 78 C211 126 251 178 302 234",
      label: [234, 145],
    },
    {
      name: "綠色B道",
      level: "初級",
      stats: "1,100m · 最大24° · 平均15°",
      color: "#159e58",
      d: "M348 275 C286 299 224 311 164 329 C132 339 123 362 150 375 C243 392 352 387 470 389 C552 390 635 403 710 432",
      label: [250, 321],
    },
    {
      name: "綠色A道",
      level: "進階",
      stats: "官方未公布",
      color: "#262326",
      d: "M348 275 C397 287 433 305 455 333",
      label: [409, 297],
    },
    {
      name: "藍色道",
      level: "進階",
      stats: "1,500m · 最大29° · 平均17°",
      color: "#262326",
      d: "M150 375 C112 401 106 430 152 438 C218 443 253 472 294 492 C350 516 411 509 454 495",
      label: [257, 459],
    },
    {
      name: "紅色A道",
      level: "中級",
      stats: "800m · 最大23° · 平均17°",
      color: "#df2029",
      d: "M486 365 C458 390 454 420 478 444 C511 469 538 489 557 512",
      label: [490, 431],
    },
    {
      name: "紅色B道",
      level: "進階・非壓雪",
      stats: "官方未公布",
      color: "#262326",
      d: "M506 363 C525 408 548 456 577 505",
      label: [548, 424],
    },
    {
      name: "黃色A道",
      level: "中級",
      stats: "500m · 最大19° · 平均15°",
      color: "#df2029",
      d: "M710 432 C688 448 670 470 651 511",
      label: [681, 466],
    },
    {
      name: "黃色B道",
      level: "初級",
      stats: "500m · 最大19° · 平均15°",
      color: "#159e58",
      d: "M724 412 C772 405 805 420 794 448 C786 466 765 475 750 480 C771 492 789 503 802 515",
      label: [775, 442],
    },
    {
      name: "橙色道",
      level: "進階・非壓雪",
      stats: "最大35°",
      color: "#262326",
      d: "M693 390 C719 405 733 426 721 451 C709 472 696 488 686 503",
      label: [717, 420],
    },
  ];
  return (
    <svg
      className="cartoon-trail-map asari-trail-map"
      viewBox="0 0 900 630"
      role="img"
      aria-label={`${resort}依官方配置重繪：九條雪道、四座纜車、兩處林間非壓雪區與初學者區`}
    >
      <defs>
        <linearGradient id="asari-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ed4ef" />
          <stop offset="1" stopColor="#edf9fc" />
        </linearGradient>
        <linearGradient id="asari-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="asari-trees"
          width="22"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 17h6l-5 7h15l-5-7h6Z"
            fill="#4a9b69"
            stroke="#317a53"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="asari-hatch"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <rect width="5" height="12" fill="#79cbe1" />
        </pattern>
      </defs>
      <rect width="900" height="590" fill="url(#asari-sky)" />
      <path
        className="asari-back-ridge"
        d="M0 217 94 157 169 178 260 110 356 168 445 129 531 177 622 134 716 184 807 143 900 185V590H0Z"
      />
      <path
        className="asari-mountain"
        d="M72 520 C77 377 97 219 173 73 C237 144 290 205 342 270 C429 285 519 311 608 338 C694 363 772 391 834 433 L842 520Z"
      />
      <path
        className="asari-upper-snow"
        d="M149 80 C164 65 183 64 197 80 C234 132 263 185 307 232 C328 254 325 273 303 285 C274 293 241 284 226 262 C209 241 185 239 171 220 C158 198 172 180 165 158 C158 134 136 102 149 80Z"
      />
      <path
        className="asari-mid-snow"
        d="M125 359 C164 323 230 302 307 281 C344 269 381 276 418 298 C463 320 515 329 570 337 C634 344 697 365 744 399 C701 429 638 444 572 439 C489 428 409 407 323 397 C248 389 173 397 125 359Z"
      />
      <path
        className="asari-lower-snow"
        d="M110 432 C208 405 306 400 394 423 C470 443 526 466 581 511 C638 465 704 419 786 406 C839 431 851 479 823 526 L120 526Z"
      />
      <path
        className="asari-tree-run"
        d="M121 141 C153 125 180 129 196 151 C184 180 179 214 185 248 C166 267 140 270 119 255 C113 215 114 176 121 141Z"
      />
      <path
        className="asari-tree-run"
        d="M575 356 C610 348 647 356 670 378 C655 410 643 437 630 464 C598 466 572 453 559 430 C566 404 571 381 575 356Z"
      />
      <path
        className="asari-unpacked"
        d="M377 286 C420 286 465 300 500 324 L466 357 C429 334 396 319 362 315Z"
      />
      <path
        className="asari-unpacked"
        d="M526 352 C563 347 599 352 624 374 L591 437 C565 418 545 394 526 352Z"
      />

      {courses.map((course) => (
        <path
          className="asari-course"
          d={course.d}
          key={course.name}
          style={{ "--asari-course": course.color }}
        >
          <title>{`${course.name}｜${course.level}｜${course.stats}`}</title>
        </path>
      ))}
      <ChairLift
        id="紫色 Lift"
        x1={331}
        y1={285}
        x2={173}
        y2={73}
        color="#a71689"
        chairs={5}
      />
      <ChairLift
        id="綠色 Lift"
        x1={636}
        y1={357}
        x2={352}
        y2={277}
        color="#397b31"
        chairs={6}
      />
      <ChairLift
        id="紅色 Lift"
        x1={574}
        y1={516}
        x2={487}
        y2={365}
        color="#d7192d"
        chairs={5}
      />
      <ChairLift
        id="黃色 Lift"
        x1={651}
        y1={516}
        x2={716}
        y2={407}
        color="#f4cc12"
        chairs={4}
      />

      {courses.map((course) => {
        const width = trailLabelWidth(course.name, 9, 20, 40);
        return (
          <g
            className="asari-route-label"
            transform={`translate(${course.label[0]} ${course.label[1]})`}
            key={`label-${course.name}`}
          >
            <rect
              x={-width / 2}
              y="-12"
              width={width}
              height="24"
              rx="8"
              style={{ stroke: course.color }}
            />
            <text y="4" textAnchor="middle">
              {course.name}
            </text>
          </g>
        );
      })}
      <g className="asari-tree-label" transform="translate(136 197)">
        <rect x="-45" y="-22" width="90" height="44" rx="10" />
        <text y="-3" textAnchor="middle">
          林間雪道
        </text>
        <text y="13" textAnchor="middle">
          非壓雪
        </text>
      </g>
      <g className="asari-tree-label" transform="translate(613 399)">
        <rect x="-45" y="-22" width="90" height="44" rx="10" />
        <text y="-3" textAnchor="middle">
          林間雪道
        </text>
        <text y="13" textAnchor="middle">
          非壓雪
        </text>
      </g>
      <g className="asari-beginner" transform="translate(752 489)">
        <path d="M-54 18 C-36-10 18-13 55 7 L46 31H-51Z" />
        <text y="12" textAnchor="middle">
          初學者區
        </text>
      </g>
      <g className="asari-base" transform="translate(486 510)">
        <path d="M0 28V8L25-8 51 8v20M56 28V12L76 0l21 12v16M102 28V9l22-13 23 13v19" />
        <text x="74" y="45" textAnchor="middle">
          滑雪服務中心 · Rental · Café · Wi-Fi · AED
        </text>
      </g>
      <g className="asari-peak" transform="translate(158 49)">
        <path d="M0 25 14-4 28 25Z" />
        <text x="14" y="43" textAnchor="middle">
          山頂 660m
        </text>
      </g>

      <g className="asari-title" transform="translate(22 20)">
        <rect width="280" height="78" rx="17" />
        <text x="17" y="29">
          朝里川溫泉滑雪場
        </text>
        <text className="asari-title-sub" x="17" y="54">
          9 COURSES · 4 LIFTS · 小樽市
        </text>
      </g>
      <g className="asari-legend" transform="translate(690 20)">
        <rect width="188" height="126" rx="15" />
        <g transform="translate(15 20)">
          <line className="advanced" x2="26" />
          <text x="35" y="4">
            進階
          </text>
        </g>
        <g transform="translate(15 44)">
          <line className="intermediate" x2="26" />
          <text x="35" y="4">
            中級
          </text>
        </g>
        <g transform="translate(15 68)">
          <line className="beginner" x2="26" />
          <text x="35" y="4">
            初級
          </text>
        </g>
        <g transform="translate(15 92)">
          <line className="unpacked" x2="26" />
          <text x="35" y="4">
            非壓雪
          </text>
        </g>
      </g>
      <g className="asari-specs" transform="translate(20 542)">
        <rect width="860" height="72" rx="12" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${18 + (index % 3) * 282} ${20 + Math.floor(index / 3) * 21})`}
            key={`spec-${course.name}`}
          >
            <circle cy="0" r="7" style={{ fill: course.color }} />
            <text x="13" y="0" dominantBaseline="middle">
              {course.name} · {course.level}
            </text>
            <text
              className="asari-spec-stat"
              x="124"
              y="0"
              dominantBaseline="middle"
            >
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function OnzeTrailMap({ resort }) {
  const courses = [
    {
      id: 1,
      name: "Deer",
      level: "初・中級",
      stats: "200m · 15° / 8° / 11°",
      color: "#df2029",
      d: "M238 82 C272 99 299 122 328 157",
      label: [323, 117],
    },
    {
      id: 2,
      name: "Panorama",
      level: "初・中級",
      stats: "500m · 24° / 8° / 15°",
      color: "#70b62c",
      d: "M240 83 C310 139 390 214 476 278 C520 310 550 335 560 355 C554 376 527 386 489 389 C440 392 394 397 353 406",
      label: [490, 263],
    },
    {
      id: 3,
      name: "Forest",
      level: "初級",
      stats: "150m · 20° / 8° / 15°",
      color: "#70b62c",
      d: "M489 389 C443 383 398 387 353 401",
      label: [532, 370],
    },
    {
      id: 4,
      name: "Family",
      level: "初級",
      stats: "500m · 10° / 8° / 9°",
      color: "#70b62c",
      d: "M353 406 C374 428 394 452 414 478",
      label: [334, 454],
    },
    {
      id: 5,
      name: "Twins",
      level: "中級",
      stats: "300m · 20° / 15° / 18°",
      color: "#df2029",
      d: "M370 250 C366 278 350 305 326 327",
      label: [380, 298],
    },
    {
      id: 6,
      name: "Sunshine",
      level: "中級",
      stats: "500m · 24° / 8° / 15°",
      color: "#df2029",
      d: "M592 344 C599 389 611 435 626 481",
      label: [627, 405],
    },
    {
      id: 7,
      name: "Owl",
      level: "中級",
      stats: "140m · 10° / 8° / 9°",
      color: "#df2029",
      d: "M592 344 C638 354 665 343 671 316 C675 282 659 255 625 244 C607 238 594 249 592 266",
      label: [675, 300],
    },
    {
      id: 8,
      name: "Downhill",
      level: "上級",
      stats: "700m · 30° / 10° / 18°",
      color: "#20282d",
      d: "M236 82 C188 130 174 190 184 245 C196 292 228 328 273 354",
      label: [133, 233],
    },
    {
      id: 9,
      name: "Diving",
      level: "上級",
      stats: "300m · 30° / 27° / 28°",
      color: "#20282d",
      d: "M356 166 C340 188 323 214 301 242",
      label: [352, 211],
    },
    {
      id: 10,
      name: "EZ6",
      level: "初級",
      stats: "60m · 6°",
      color: "#9dca55",
      d: "M322 470 C344 476 367 480 392 481",
      label: [302, 473],
    },
  ];
  return (
    <svg
      className="cartoon-trail-map onze-trail-map"
      viewBox="0 0 900 560"
      role="img"
      aria-label={`${resort}依官方配置重繪，包含十條雪道、兩座纜車及各雪道坡度`}
    >
      <defs>
        <linearGradient id="onze-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd5ee" />
          <stop offset="1" stopColor="#eef9fc" />
        </linearGradient>
        <linearGradient id="onze-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#e0eff4" />
        </linearGradient>
        <pattern
          id="onze-trees"
          width="22"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 17h6l-5 7h15l-5-7h6Z"
            fill="#45a16f"
            stroke="#2f8058"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="560" fill="url(#onze-sky)" />
      <path
        className="onze-sea"
        d="M0 93 C127 81 222 94 338 85 C473 74 606 90 900 67V0H0Z"
      />
      <path
        className="onze-back-ridge"
        d="M0 220 84 175 167 187 257 130 350 161 448 118 557 148 676 111 780 153 900 128V560H0Z"
      />
      <path
        className="onze-forest"
        d="M42 475 84 184 168 115 238 72 342 105 445 151 558 172 654 194 752 239 823 475Z"
      />
      <path
        className="onze-snowfield"
        d="M210 64 C285 94 373 177 474 258 C522 296 553 319 579 337 C587 285 600 248 621 221 C659 230 685 263 687 305 C691 357 669 414 644 487 L405 487 C379 454 357 430 337 414 C291 400 235 391 183 370 C143 333 143 255 163 181 C175 132 192 91 210 64Z"
      />

      {courses.map((course) => (
        <path
          className={`onze-course-corridor corridor-${course.id}`}
          d={course.d}
          key={`corridor-${course.id}`}
        />
      ))}
      <path
        className="onze-course-corridor corridor-transition"
        d="M273 354 C293 367 307 386 316 409"
      />

      {courses.map((course) => (
        <path
          className="onze-course"
          d={course.d}
          key={course.id}
          style={{ "--onze-course": course.color }}
        >
          <title>{`${course.id}. ${course.name}｜${course.level}｜${course.stats}`}</title>
        </path>
      ))}
      <path
        className="onze-downhill-transition"
        d="M273 354 C293 367 307 386 316 409"
      />
      <ChairLift
        id="Panorama Quad Lift"
        x1={450}
        y1={482}
        x2={244}
        y2={90}
        color="#31586b"
        chairs={7}
      />
      <ChairLift
        id="Sunshine Pair Lift"
        x1={675}
        y1={484}
        x2={625}
        y2={246}
        color="#31586b"
        chairs={5}
      />

      {courses.map((course) => {
        const width = trailLabelWidth(course.name, 9, 42, 54);
        const left = -width / 2;
        return (
          <g
            className="onze-route-label"
            transform={`translate(${course.label[0]} ${course.label[1]})`}
            key={`label-${course.id}`}
          >
            <rect
              x={left}
              y="-12"
              width={width}
              height="24"
              rx="8"
              style={{ stroke: course.color }}
            />
            <circle cx={left + 10} r="8" style={{ fill: course.color }} />
            <text x={left + 10} y="3" textAnchor="middle">
              {course.id}
            </text>
            <text x={left + 22} y="3">
              {course.name}
            </text>
          </g>
        );
      })}

      <g className="onze-peak" transform="translate(225 53)">
        <path d="M0 25 13-3 27 25Z" />
        <text x="14" y="42" textAnchor="middle">
          山頂 308m
        </text>
      </g>
      <g className="onze-lift-label" transform="translate(409 356) rotate(-63)">
        <rect x="-58" y="-12" width="116" height="24" rx="9" />
        <text y="4" textAnchor="middle">
          PANORAMA QUAD LIFT
        </text>
      </g>
      <g className="onze-lift-label" transform="translate(667 369) rotate(-78)">
        <rect x="-55" y="-12" width="110" height="24" rx="9" />
        <text y="4" textAnchor="middle">
          SUNSHINE PAIR LIFT
        </text>
      </g>
      <g className="onze-base" transform="translate(407 455)">
        <path d="M0 28V8L24-8 49 8v20M53 28V12L72 0l20 12v16M98 28V9l21-13 22 13v19" />
        <text x="71" y="44" textAnchor="middle">
          CENTER HOUSE · RENTAL · AED
        </text>
      </g>

      <g className="onze-title" transform="translate(14 15)">
        <rect width="218" height="75" rx="17" />
        <text x="15" y="28">
          SNOW CRUISE ONZE
        </text>
        <text className="onze-title-sub" x="15" y="52">
          10 COURSES · 2 LIFTS · 小樽市
        </text>
      </g>
      <g className="onze-legend" transform="translate(686 20)">
        <rect width="192" height="101" rx="15" />
        <g transform="translate(16 22)">
          <line className="beginner" x2="26" />
          <text x="35" y="4">
            初級 45%
          </text>
        </g>
        <g transform="translate(16 50)">
          <line className="intermediate" x2="26" />
          <text x="35" y="4">
            中級 35%
          </text>
        </g>
        <g transform="translate(16 78)">
          <line className="advanced" x2="26" />
          <text x="35" y="4">
            上級 20%
          </text>
        </g>
      </g>
      <g className="onze-specs" transform="translate(24 472)">
        <rect width="852" height="70" rx="15" />
        {courses.map((course, index) => (
          <g
            transform={`translate(${14 + (index % 5) * 168} ${20 + Math.floor(index / 5) * 27})`}
            key={`spec-${course.id}`}
          >
            <circle r="8" style={{ fill: course.color }} />
            <text className="onze-spec-name" x="12" y="-2">
              {course.id}. {course.name}
            </text>
            <text className="onze-spec-stat" x="12" y="10">
              {course.stats}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function CanmoreTrailMap({ resort }) {
  const courses = [
    {
      id: "rocky",
      name: "Rocky",
      level: "中級",
      length: "1,570m",
      slope: "最大18°／平均9°",
      color: "#e43b39",
      d: "M507 72 C426 114 323 132 223 177 C157 207 127 245 143 287 C166 347 231 385 335 408",
    },
    {
      id: "buffalo",
      name: "Buffalo",
      level: "中級・未壓雪",
      length: "310m",
      slope: "最大17°／平均13°",
      color: "#e43b39",
      d: "M272 245 C270 286 296 320 347 337",
    },
    {
      id: "canyon",
      name: "Canyon",
      level: "上級・未壓雪",
      length: "240m",
      slope: "最大29°／平均16°",
      color: "#77369b",
      d: "M412 133 C416 177 429 223 458 264",
    },
    {
      id: "caribou",
      name: "Caribou",
      level: "中級・未壓雪",
      length: "280m",
      slope: "最大18°／平均16°",
      color: "#e43b39",
      d: "M494 103 C547 151 582 208 618 293",
    },
    {
      id: "marmot",
      name: "Marmot",
      level: "中級",
      length: "1,200m",
      slope: "最大17°／平均12°",
      color: "#e43b39",
      d: "M582 91 C584 148 583 207 582 265",
    },
    {
      id: "maple",
      name: "Maple",
      level: "初級",
      length: "1,280m",
      slope: "最大15°／平均10°",
      color: "#198d56",
      d: "M573 65 C657 70 703 93 710 147 C722 234 731 327 711 405",
    },
    {
      id: "rabbit-b",
      name: "Rabbit B",
      level: "初級",
      length: "700m",
      slope: "最大12°／平均8°",
      color: "#198d56",
      d: "M350 278 C371 320 390 365 413 410",
    },
    {
      id: "rabbit-a",
      name: "Rabbit A",
      level: "初級",
      length: "700m",
      slope: "最大12°／平均8°",
      color: "#198d56",
      d: "M474 268 C489 317 505 369 520 421",
    },
  ];
  const labels = [
    [176, 245, "ROCKY"],
    [293, 283, "BUFFALO"],
    [430, 192, "CANYON"],
    [544, 164, "CARIBOU"],
    [600, 177, "MARMOT"],
    [695, 226, "MAPLE"],
    [377, 344, "RABBIT B"],
    [494, 344, "RABBIT A"],
  ];

  return (
    <svg
      className="cartoon-trail-map canmore-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}依官網配置重繪：八條雪道、兩座纜車、夜間照明與越野滑雪區`}
    >
      <defs>
        <linearGradient id="canmore-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ed4e7" />
          <stop offset="1" stopColor="#edf7fa" />
        </linearGradient>
        <linearGradient id="canmore-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="canmore-trees"
          width="23"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 17h6l-5 8h15l-5-8h6Z"
            fill="#477d6a"
            stroke="#315f51"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#canmore-sky)" />
      <path
        className="canmore-back-ridge"
        d="M0 238 96 184 184 207 282 150 379 172 495 89 598 112 697 83 795 126 900 112V520H0Z"
      />
      <path
        className="canmore-forest"
        d="M75 421 117 238 226 174 350 129 501 69 594 61 710 82 789 182 809 421Z"
      />
      <path
        className="canmore-snowfield"
        d="M128 413 C146 328 151 233 225 180 C307 136 403 111 504 69 C568 50 652 58 704 88 C760 170 773 289 743 421Z"
      />
      <path
        className="canmore-tree-island"
        d="M239 387 C224 321 229 245 276 183 C318 152 363 133 410 118 C382 177 373 234 386 283 C346 297 326 333 335 408Z"
      />
      <path
        className="canmore-tree-island"
        d="M451 267 C442 217 449 158 493 91 L548 72 C528 134 528 198 548 251 C510 245 481 250 451 267Z"
      />
      <path
        className="canmore-tree-island"
        d="M596 271 C608 207 606 137 579 72 C626 71 670 80 700 98 C720 158 728 225 727 287 C683 260 642 255 596 271Z"
      />

      {courses.map((course) => (
        <path
          className={`canmore-course is-${course.id}`}
          d={course.d}
          key={course.id}
          style={{ "--canmore-course": course.color }}
        >
          <title>{`${course.name}｜${course.level}｜${course.length}｜${course.slope}`}</title>
        </path>
      ))}
      <path
        className="canmore-death-base"
        d="M281 146 C276 171 272 198 270 226"
      />
      <path
        className="canmore-death-stripe"
        d="M281 146 C276 171 272 198 270 226"
      >
        <title>Death Valley｜超上級・未壓雪｜103m｜最大31°／平均27.5°</title>
      </path>

      <g className="canmore-lift is-pair" aria-label="雙人纜車">
        <path d="M447 442 C431 365 415 292 399 265" />
        {[0.18, 0.38, 0.58, 0.78].map((p) => (
          <circle
            cx={447 + (399 - 447) * p}
            cy={442 + (265 - 442) * p}
            r="5"
            key={p}
          />
        ))}
        <text x="391" y="355">
          2 人 Lift
        </text>
      </g>
      <g className="canmore-lift is-quad" aria-label="四人纜車">
        <path d="M604 439 C591 330 574 190 548 70" />
        {[0.13, 0.29, 0.45, 0.61, 0.77, 0.9].map((p) => (
          <circle
            cx={604 + (548 - 604) * p}
            cy={439 + (70 - 439) * p}
            r="5"
            key={p}
          />
        ))}
        <text x="566" y="332">
          4 人 Lift
        </text>
      </g>

      {labels.map(([x, y, label]) => {
        const width = trailLabelWidth(label, 9, 18, 34);
        return (
          <g
            className="canmore-route-label"
            transform={`translate(${x} ${y})`}
            key={label}
          >
            <rect x={-width / 2} y="-10" width={width} height="20" rx="7" />
            <text y="4" textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })}
      {(() => {
        const label = "DEATH VALLEY";
        const width = trailLabelWidth(label, 9, 18, 34);
        return (
          <g
            className="canmore-route-label is-death"
            transform="translate(277 183)"
          >
            <rect x={-width / 2} y="-10" width={width} height="20" rx="7" />
            <text y="4" textAnchor="middle">
              {label}
            </text>
          </g>
        );
      })()}

      <path
        className="canmore-cross-country"
        d="M36 359 C77 320 133 309 177 341 C218 370 280 365 323 409 C251 424 165 432 89 415 C53 406 29 385 36 359Z"
      />
      <text className="canmore-cross-label" x="173" y="381" textAnchor="middle">
        FIS／SAJ 認證越野滑雪區
      </text>

      {[
        { x: 722, y: 130 },
        { x: 733, y: 187 },
        { x: 740, y: 246 },
        { x: 743, y: 305 },
        { x: 735, y: 363 },
      ].map((light, index) => (
        <g
          className="canmore-light"
          transform={`translate(${light.x} ${light.y})`}
          key={index}
        >
          <circle r="8" />
          <path d="M-12-7-19-12M-14 0h-9M-12 7l-7 6" />
        </g>
      ))}
      <g className="canmore-base" transform="translate(620 386)">
        <path d="M0 33V9l30-17 31 17v24M66 33V15L90 1l25 14v18M120 33V12l27-16 29 16v21" />
        <text x="87" y="49" textAnchor="middle">
          CENTER HOUSE · RENTAL · SCHOOL
        </text>
      </g>
      <g className="canmore-kids" transform="translate(480 402)">
        <path d="M0 27c25-15 49-15 75 0" />
        <text x="38" y="43" textAnchor="middle">
          兒童廣場
        </text>
      </g>

      <g className="canmore-title" transform="translate(18 18)">
        <rect width="286" height="74" rx="17" />
        <text x="18" y="29">
          CANMORE SKI VILLAGE
        </text>
        <text className="canmore-title-sub" x="18" y="53">
          8 COURSES · NIGHT SKIING · 東川町
        </text>
      </g>
      <g className="canmore-guide" transform="translate(18 432)">
        <rect width="864" height="72" rx="16" />
        {[
          ["Rabbit", "700m · 12°/8°", "#198d56"],
          ["Maple", "1,280m · 15°/10°", "#198d56"],
          ["Rocky", "1,570m · 18°/9°", "#e43b39"],
          ["Caribou", "280m · 18°/16°", "#e43b39"],
          ["Marmot", "1,200m · 17°/12°", "#e43b39"],
          ["Buffalo", "310m · 17°/13°", "#e43b39"],
          ["Canyon", "240m · 29°/16°", "#77369b"],
          ["Death Valley", "103m · 31°/27.5°", "#292c2d"],
        ].map((item, index) => (
          <g
            transform={`translate(${16 + (index % 4) * 212} ${23 + Math.floor(index / 4) * 29})`}
            key={item[0]}
          >
            <line x2="24" style={{ stroke: item[2] }} />
            <text x="32" y="4">
              {item[0]}
            </text>
            <text className="canmore-guide-stat" x="102" y="4">
              {item[1]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function AsahidakeTrailMap({ resort }) {
  const routes = [
    {
      id: "A",
      level: "上級",
      length: "1,400m",
      slopes: "30°／16°／20°",
      color: "#e53935",
      d: "M348 137 C392 105 442 105 479 132 C516 160 548 198 568 238",
    },
    {
      id: "B",
      level: "上級",
      length: "1,000m",
      slopes: "23°／13°／18°",
      color: "#37a852",
      d: "M348 137 C330 174 349 208 390 221 C435 235 474 254 505 282 C526 262 545 247 568 238",
    },
    {
      id: "C",
      level: "中級",
      length: "2,500m",
      slopes: "20°／7°／13°",
      color: "#37a852",
      d: "M568 238 C615 214 663 220 691 254 C722 292 724 349 696 430",
    },
    {
      id: "D",
      level: "上級",
      length: "1,800m",
      slopes: "28°／12°／16°",
      color: "#2866b1",
      d: "M505 282 C545 294 557 323 562 351 C568 384 613 393 650 414 C667 424 681 430 696 430",
    },
  ];

  return (
    <svg
      className="cartoon-trail-map asahidake-trail-map"
      viewBox="0 0 900 540"
      role="img"
      aria-label={`${resort}專屬路線圖：旭岳四條非初級路線與一座箱型纜車`}
    >
      <defs>
        <linearGradient id="asahidake-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#72c5e9" />
          <stop offset="1" stopColor="#eef9fc" />
        </linearGradient>
        <linearGradient id="asahidake-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#d4e8f1" />
        </linearGradient>
        <pattern
          id="asahidake-trees"
          width="23"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 17h6l-5 8h15l-5-8h6Z"
            fill="#457b70"
            stroke="#305e55"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="540" fill="url(#asahidake-sky)" />
      <path
        className="asahidake-back-ridge"
        d="M0 245 103 198 193 218 291 174 379 194 490 96 591 163 687 132 777 177 900 143V540H0Z"
      />
      <path
        className="asahidake-mountain"
        d="M91 456 C151 330 214 193 386 97 L469 31 549 110 C626 187 705 312 773 456Z"
      />
      <path
        className="asahidake-snow-face"
        d="M194 449 C247 314 304 188 410 96 L469 42 527 111 C585 187 648 314 700 449Z"
      />
      <path
        className="asahidake-forest"
        d="M115 451 C169 354 229 273 319 206 C300 284 307 363 343 444 C397 355 456 316 509 283 C540 346 579 403 627 447 C659 356 697 315 737 285 C758 337 776 392 789 451Z"
      />
      <path
        className="asahidake-open-slope"
        d="M311 441 C321 353 334 255 348 137 C384 108 427 105 478 128 C532 162 573 203 606 232 C662 211 715 241 733 298 C746 347 728 397 696 433 C570 457 438 456 311 441Z"
      />

      {routes.map((route) => (
        <path
          className={`asahidake-route route-${route.id.toLowerCase()}`}
          d={route.d}
          key={route.id}
          style={{ "--asahidake-route": route.color }}
        >
          <title>{`${route.id} Course｜${route.level}｜${route.length}｜最大／最低／平均 ${route.slopes}`}</title>
        </path>
      ))}

      <g className="asahidake-ropeway" aria-label="旭岳 Ropeway">
        <line x1="696" y1="430" x2="348" y2="137" />
        {[0.24, 0.5, 0.76].map((p) => {
          const x = 696 + (348 - 696) * p;
          const y = 430 + (137 - 430) * p;
          return (
            <g
              className="asahidake-cabin"
              transform={`translate(${x} ${y})`}
              key={p}
            >
              <line y1="-9" y2="-17" />
              <path d="M-13-9H13L10 10H-10Z" />
              <path d="M-7-5H7" />
            </g>
          );
        })}
      </g>

      <g className="asahidake-station is-top" transform="translate(327 123)">
        <path d="M0 24V7L21-7 43 7v17" />
        <rect x="13" y="11" width="17" height="13" />
        <text x="22" y="42" textAnchor="middle">
          姿見站 1,600m
        </text>
      </g>
      <g className="asahidake-station is-base" transform="translate(674 418)">
        <path d="M0 25V7L23-8 47 7v18" />
        <rect x="14" y="11" width="19" height="14" />
        <text x="24" y="43" textAnchor="middle">
          山麓站 1,100m
        </text>
      </g>
      <g className="asahidake-summit" transform="translate(469 31)">
        <path d="M0 18 11-3 22 18Z" />
        <text x="11" y="35" textAnchor="middle">
          旭岳 2,291m
        </text>
      </g>

      {[
        [470, 145, "A", "1,400m · 上級", "#e53935"],
        [377, 214, "B", "1,000m · 上級", "#37a852"],
        [699, 300, "C", "2,500m · 中級", "#37a852"],
        [579, 360, "D", "1,800m · 上級", "#2866b1"],
      ].map(([x, y, id, detail, color]) => (
        <g
          className="asahidake-route-tag"
          transform={`translate(${x} ${y})`}
          key={id}
        >
          <circle r="14" style={{ fill: color }} />
          <text className="tag-id" y="5" textAnchor="middle">
            {id}
          </text>
          <rect x="19" y="-14" width="104" height="28" rx="9" />
          <text x="28" y="5">
            {detail}
          </text>
        </g>
      ))}

      {[
        { x: 459, y: 143 },
        { x: 403, y: 219 },
        { x: 520, y: 289 },
        { x: 639, y: 332 },
        { x: 675, y: 395 },
      ].map((camera, index) => (
        <g
          className="asahidake-camera"
          transform={`translate(${camera.x} ${camera.y})`}
          key={index}
        >
          <rect x="-9" y="-6" width="18" height="13" rx="2" />
          <circle r="4" />
          <path d="M-4-6-1-10H4L7-6" />
        </g>
      ))}

      <g className="asahidake-warning" transform="translate(757 22)">
        <path d="M0 64 34 0 68 64Z" />
        <text x="34" y="51" textAnchor="middle">
          !
        </text>
        <text className="warning-label" x="34" y="82" textAnchor="middle">
          雪崩注意
        </text>
      </g>
      <g className="asahidake-title" transform="translate(18 18)">
        <rect width="292" height="78" rx="17" />
        <text x="18" y="29">
          ASAHIDAKE ROPEWAY
        </text>
        <text className="asahidake-title-sub" x="18" y="54">
          4 ROUTES · GONDOLA 1 · 無初級雪道
        </text>
      </g>
      <g className="asahidake-guide" transform="translate(18 463)">
        <rect width="864" height="61" rx="16" />
        {routes.map((route, index) => (
          <g transform={`translate(${18 + index * 210} 24)`} key={route.id}>
            <line x2="28" style={{ stroke: route.color }} />
            <text className="guide-name" x="38" y="4">
              {route.id} · {route.length}
            </text>
            <text className="guide-slope" x="38" y="23">
              最大／最低／平均 {route.slopes}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function FuranoTrailMap({ resort }) {
  const levelColor = {
    beginner: "#19954f",
    intermediate: "#2874b7",
    advanced: "#282f33",
  };
  const courses = [
    {
      id: "E2",
      level: "intermediate",
      d: "M282 72 C300 89 317 108 333 132",
      label: [311, 96],
    },
    {
      id: "E1",
      level: "advanced",
      d: "M282 72 C307 96 336 122 352 153",
      label: [337, 123],
    },
    {
      id: "A1",
      level: "intermediate",
      d: "M333 132 C327 167 334 201 350 230",
      label: [329, 183],
    },
    {
      id: "D1",
      level: "beginner",
      d: "M352 153 C350 188 356 220 371 250",
      label: [358, 208],
    },
    {
      id: "D2",
      level: "beginner",
      d: "M352 153 C383 168 401 194 405 226",
      label: [389, 183],
    },
    {
      id: "D3",
      level: "intermediate",
      d: "M405 226 C423 244 432 266 429 289",
      label: [425, 255],
    },
    {
      id: "A4",
      level: "advanced",
      d: "M371 250 C352 270 343 291 346 315",
      label: [351, 280],
    },
    {
      id: "A3",
      level: "advanced",
      d: "M429 289 C405 323 388 367 382 423",
      label: [398, 351],
    },
    {
      id: "B1",
      level: "beginner",
      d: "M350 230 C306 271 274 326 247 389 C234 418 214 440 190 454",
      label: [270, 332],
    },
    {
      id: "A2",
      level: "intermediate",
      d: "M346 315 C322 344 302 387 289 440",
      label: [305, 382],
    },
    {
      id: "B2",
      level: "beginner",
      d: "M190 454 C165 433 139 434 123 456 C140 475 168 482 199 474",
      label: [157, 456],
    },
    {
      id: "C1",
      level: "beginner",
      d: "M199 474 C214 450 230 449 244 474",
      label: [218, 458],
    },
    {
      id: "C2",
      level: "intermediate",
      d: "M244 474 C260 449 278 450 290 476",
      label: [269, 459],
    },
    {
      id: "H1",
      level: "intermediate",
      d: "M429 289 C492 272 548 278 612 309 C637 320 660 318 683 300",
      label: [538, 285],
    },
    {
      id: "K1",
      level: "intermediate",
      d: "M718 82 C733 123 747 170 755 226",
      label: [738, 147],
    },
    {
      id: "K3",
      level: "advanced",
      d: "M755 126 C773 150 784 175 781 200",
      label: [776, 164],
    },
    {
      id: "K2",
      level: "advanced",
      d: "M755 226 C738 246 728 269 730 292",
      label: [735, 258],
    },
    {
      id: "K4",
      level: "advanced",
      d: "M781 244 C801 262 809 282 807 306",
      label: [804, 274],
    },
    {
      id: "G1",
      level: "beginner",
      d: "M807 306 C819 341 827 374 830 407",
      label: [821, 351],
    },
    {
      id: "G2",
      level: "intermediate",
      d: "M823 299 C842 333 851 369 853 407",
      label: [846, 348],
    },
    {
      id: "G3",
      level: "intermediate",
      d: "M840 276 C870 311 882 351 882 401",
      label: [872, 327],
    },
    {
      id: "F1",
      level: "beginner",
      d: "M683 300 C659 340 657 388 690 440",
      label: [663, 365],
    },
    {
      id: "F2",
      level: "intermediate",
      d: "M750 313 C742 353 746 395 760 442",
      label: [749, 368],
    },
    {
      id: "F3",
      level: "intermediate",
      d: "M794 354 C796 389 806 420 824 449",
      label: [803, 395],
    },
    {
      id: "F4",
      level: "beginner",
      d: "M824 360 C829 394 840 422 856 448",
      label: [837, 397],
    },
    {
      id: "F5",
      level: "beginner",
      d: "M848 349 C857 384 867 416 879 447",
      label: [865, 390],
    },
    {
      id: "F6",
      level: "beginner",
      d: "M875 333 C887 370 895 407 899 445",
      label: [894, 374],
    },
    {
      id: "F7",
      level: "beginner",
      d: "M899 330 C921 362 929 400 924 442",
      label: [922, 370],
    },
  ];

  return (
    <svg
      className="cartoon-trail-map furano-trail-map"
      viewBox="0 0 1000 560"
      role="img"
      aria-label={`${resort}依官方配置重繪：富良野與北之峰雙區域、二十八條雪道與十一座運輸設備`}
    >
      <defs>
        <linearGradient id="furano-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#75cceb" />
          <stop offset="1" stopColor="#eef9fc" />
        </linearGradient>
        <linearGradient id="furano-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#d9ebf2" />
        </linearGradient>
        <pattern
          id="furano-trees"
          width="22"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 16h6l-5 8h15l-5-8h6Z"
            fill="#477f72"
            stroke="#315f55"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="furano-premium"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(25)"
        >
          <rect width="4" height="8" fill="#9bc9dc" />
        </pattern>
      </defs>
      <rect width="1000" height="560" fill="url(#furano-sky)" />
      <path
        className="furano-back-ridge"
        d="M0 230 105 178 201 198 300 131 401 175 501 141 601 177 711 119 812 153 901 124 1000 166V560H0Z"
      />
      <path
        className="furano-forest"
        d="M58 480 91 329 167 246 224 144 282 63 348 125 430 215 480 350 522 335 586 249 650 176 718 74 790 145 856 248 942 480Z"
      />
      <path
        className="furano-zone-snow"
        d="M76 472 C103 386 132 306 192 245 C225 182 246 111 282 67 C328 106 357 161 379 221 C423 276 449 358 456 466Z"
      />
      <path
        className="kitanomine-zone-snow"
        d="M548 470 C575 389 606 313 657 247 C671 177 692 113 718 77 C771 119 801 183 818 248 C876 305 910 386 928 468Z"
      />
      <path
        className="furano-tree-island"
        d="M290 448 C281 364 294 281 337 206 C379 242 401 305 410 373 C369 361 336 386 322 448Z"
      />
      <path
        className="furano-tree-island"
        d="M675 449 C657 372 666 303 710 245 C742 277 758 319 760 366 C722 365 697 392 690 449Z"
      />
      <path
        className="furano-premium-zone"
        d="M675 96 C704 78 738 78 763 99 C772 151 770 201 751 239 C724 222 699 217 677 224 C690 171 689 128 675 96Z"
      />

      {courses.map((course) => (
        <path
          className={`furano-course is-${course.level}`}
          d={course.d}
          key={course.id}
          style={{ "--furano-course": levelColor[course.level] }}
        >
          <title>{`${course.id} Course｜${course.level}`}</title>
        </path>
      ))}
      {courses.map((course) => {
        const width = trailLabelWidth(course.id, 9, 12, 24);
        return (
          <g
            className={`furano-course-label is-${course.level}`}
            transform={`translate(${course.label[0]} ${course.label[1]})`}
            key={`label-${course.id}`}
          >
            <rect x={-width / 2} y="-10" width={width} height="20" rx="7" />
            <text y="4" textAnchor="middle">
              {course.id}
            </text>
          </g>
        );
      })}

      <ChairLift
        id="A 富良野 Ropeway 2,330m"
        x1={174}
        y1={468}
        x2={282}
        y2={72}
        color="#d83b35"
        chairs={6}
      />
      <ChairLift
        id="B 富良野 Downhill 1 Lift 1,944m"
        x1={285}
        y1={468}
        x2={350}
        y2={230}
        color="#d83b35"
        chairs={4}
      />
      <ChairLift
        id="C Prince Romance Lift 601m"
        x1={200}
        y1={477}
        x2={244}
        y2={448}
        color="#d83b35"
        chairs={2}
      />
      <ChairLift
        id="D Downhill 2 Lift 786m"
        x1={350}
        y1={251}
        x2={352}
        y2={153}
        color="#d83b35"
        chairs={3}
      />
      <ChairLift
        id="E Downhill 3 Lift 567m"
        x1={352}
        y1={153}
        x2={282}
        y2={72}
        color="#d83b35"
        chairs={3}
      />
      <ChairLift
        id="H 連絡 Lift 931m"
        x1={433}
        y1={289}
        x2={683}
        y2={300}
        color="#d83b35"
        chairs={5}
      />
      <ChairLift
        id="K 北之峰 Gondola 2,958m"
        x1={904}
        y1={466}
        x2={718}
        y2={80}
        color="#d83b35"
        chairs={6}
      />
      <ChairLift
        id="F 北之峰 1 Lift 1,058m"
        x1={881}
        y1={450}
        x2={807}
        y2={306}
        color="#d83b35"
        chairs={3}
      />
      <ChairLift
        id="G 北之峰 2 Lift 720m"
        x1={852}
        y1={407}
        x2={781}
        y2={244}
        color="#d83b35"
        chairs={3}
      />

      <g className="furano-zone-title" transform="translate(92 173)">
        <rect width="142" height="35" rx="13" />
        <text x="71" y="23" textAnchor="middle">
          富良野 ZONE
        </text>
      </g>
      <g
        className="furano-zone-title is-kitanomine"
        transform="translate(782 183)"
      >
        <rect width="152" height="35" rx="13" />
        <text x="76" y="23" textAnchor="middle">
          北之峰 ZONE
        </text>
      </g>
      <g className="furano-peak" transform="translate(282 65)">
        <path d="M0 17 10-3 20 17Z" />
        <text x="10" y="32" textAnchor="middle">
          1,074m
        </text>
      </g>
      <g className="furano-peak" transform="translate(718 76)">
        <path d="M0 17 10-3 20 17Z" />
        <text x="10" y="32" textAnchor="middle">
          943m
        </text>
      </g>
      <g className="furano-base" transform="translate(120 466)">
        <path d="M0 25V6L23-8 47 6v19M52 25V10L70 0l19 10v15" />
        <text x="44" y="41" textAnchor="middle">
          NEW FURANO PRINCE HOTEL
        </text>
      </g>
      <g className="furano-base" transform="translate(805 461)">
        <path d="M0 25V6L24-8 49 6v19M54 25V10L73 0l20 10v15" />
        <text x="47" y="41" textAnchor="middle">
          KITANOMINE TERMINAL
        </text>
      </g>

      <g className="furano-title" transform="translate(18 18)">
        <rect width="315" height="78" rx="17" />
        <text x="18" y="29">
          FURANO SKI RESORT
        </text>
        <text className="furano-title-sub" x="18" y="53">
          28 COURSES · 11 LIFTS · MAX 34° · DROP 839m
        </text>
      </g>
      <g className="furano-legend" transform="translate(748 20)">
        <rect width="234" height="76" rx="16" />
        <line x1="16" y1="22" x2="42" y2="22" className="beginner" />
        <text x="50" y="26">
          初級
        </text>
        <line x1="91" y1="22" x2="117" y2="22" className="intermediate" />
        <text x="125" y="26">
          中級
        </text>
        <line x1="166" y1="22" x2="192" y2="22" className="advanced" />
        <text x="200" y="26">
          上級
        </text>
        <text className="furano-legend-note" x="16" y="55">
          H1／連絡 Lift 串接兩區 · 最長連滑 4,000m
        </text>
      </g>
    </svg>
  );
}

function ShokanbetsuTrailMap({ resort }) {
  // 左半部林帶手動調整區：x/y 移動、scaleX/scaleY 縮放、rotate 旋轉角度。
  const leftForestControls = {
    challengeLift: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
    challengeDynamic: { x: 30, y: 30, scaleX: 1, scaleY: 0.5, rotate: 0 },
  };
  const forestTransform = ({ x, y, scaleX, scaleY, rotate }) =>
    `translate(${x} ${y}) rotate(${rotate}) scale(${scaleX} ${scaleY})`;

  const courses = [
    {
      id: "signal",
      name: "Signal",
      length: "1,000m",
      slope: "最大 24°",
      color: "#ad3c78",
      d: "M703 104 C710 111 624 164 620 190 C560 254 539 335 495 426",
    },
    {
      id: "giant",
      name: "Giant",
      length: "1,400m",
      slope: "最大 28°",
      color: "#18a9d7",
      d: "M287 92 C342 94 386 121 414 136 C510 226 491 298 478 337 C449 386 440 381 380 401",
    },
    {
      id: "dynamic",
      name: "Dynamic",
      length: "1,200m",
      slope: "最大 30°",
      color: "#43a25d",
      d: "M302 104 C354 121 389 157 403 205 C417 252 410 320 380 370 C389 359 362 390 320 400",
    },
    {
      id: "challenge",
      name: "Challenge",
      length: "1,100m",
      slope: "最大 30°",
      color: "#66549b",
      d: "M277 102 C312 126 331 172 344 220 C358 270 363 322 342 350 C326 370 306 379 289 373",
    },
    {
      id: "snowboard",
      name: "Snowboard",
      length: "480m",
      slope: "最大 20°",
      color: "#a7743f",
      d: "M693 200 C699 280 670 360 641 380 C630 390 612 411 583 430",
    },
    {
      id: "connection",
      name: "連絡",
      length: "700m",
      slope: "最大 25°",
      color: "#ef4c3f",
      d: "M703 104 C646 111 614 171 589 199 C535 236 480 266 426 300 C385 326 353 354 347 382 C343 403 355 418 380 426",
    },
  ];

  return (
    <svg
      className="cartoon-trail-map shokanbetsu-trail-map"
      viewBox="0 -24 900 544"
      role="img"
      aria-label={`${resort}依增毛町官方圖重繪：六條雪道、兩座雙人纜椅與北歐風 Lodge`}
    >
      <defs>
        <linearGradient id="shokanbetsu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a7d7e5" />
          <stop offset="1" stopColor="#edf8fb" />
        </linearGradient>
        <linearGradient id="shokanbetsu-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#d9ebf2" />
        </linearGradient>
        <pattern
          id="shokanbetsu-trees"
          width="23"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 17h6l-5 8h15l-5-8h6Z"
            fill="#4d956d"
            stroke="#327253"
            strokeWidth="1"
          />
        </pattern>
        <pattern
          id="shokanbetsu-small-trees"
          width="15"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M7.5 1 2 11h4l-3 6h9l-3-6h4Z"
            fill="#4d956d"
            stroke="#327253"
            strokeWidth=".75"
          />
        </pattern>
        <marker
          id="shokanbetsu-connection-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 10 5 0 10Z" fill="#ef4c3f" />
        </marker>
        <marker
          id="shokanbetsu-challenge-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0 0 10 5 0 10Z" fill="#66549b" />
        </marker>
      </defs>
      <rect y="-24" width="900" height="544" fill="url(#shokanbetsu-sky)" />
      <path
        className="shokanbetsu-back-ridge"
        d="M0 242 114 184 210 205 319 141 410 177 530 121 625 159 739 107 900 177V520H0Z"
      />
      <path
        className="shokanbetsu-forest"
        d="M36 437 91 225 187 146 281 78 392 116 486 188 596 169 725 83 800 107 950 447Z"
      />
      <path
        className="shokanbetsu-left-slope"
        transform="translate(195 -65) scale(.78)"
        d="M320 440 C181 328 105 56 295 75 C340 80 383 93 419 129 C500 203 504 295 485 348 C460 370 404 440 374 432Z"
      />
      <path
        className="shokanbetsu-right-slope"
        d="M479 432 C509 340 548 234 627 135 C649 108 677 96 704 101 C755 163 762 250 720 319 C690 369 629 409 559 432Z"
      />
      <path
        className="shokanbetsu-challenge-clearing"
        transform="translate(222 -55) scale(.7)"
        d="M277 102 C312 126 331 172 344 220 C358 270 363 322 342 350 C326 370 306 379 289 373"
      />
      <path
        className="shokanbetsu-connection-clearing"
        d="M703 112 C665 137 630 171 589 199 C535 236 480 266 426 300 C385 326 353 354 347 382 C343 403 355 418 380 426"
      />
      <path
        className="shokanbetsu-tree-island shokanbetsu-left-forest-strip shokanbetsu-challenge-lift-forest"
        d="M404 30 C424 53 425 91 452 162 C452 168 465 155 430 180 C408 134 418 143 408 121 C399 79 380 49 374 30Z"
        transform={forestTransform(leftForestControls.challengeLift)}
      />
      <path
        className="shokanbetsu-tree-island shokanbetsu-left-forest-strip shokanbetsu-challenge-dynamic-forest"
        d="M423 24 C443 43 462 74 473 108 C483 139 478 170 454 194 C459 164 451 132 441 100 C433 70 426 43 423 24Z"
        transform={forestTransform(leftForestControls.challengeDynamic)}
      />
      {courses.map((course) => (
        <path
          className={`shokanbetsu-course${course.id === "connection" ? " shokanbetsu-connection-course" : ""}`}
          d={course.d}
          key={course.id}
          style={{ "--shokanbetsu-course": course.color }}
          transform={
            ["giant", "dynamic", "challenge"].includes(course.id)
              ? "translate(222 -55) scale(.7)"
              : undefined
          }
          markerEnd={
            course.id === "connection"
              ? "url(#shokanbetsu-connection-arrow)"
              : course.id === "challenge"
                ? "url(#shokanbetsu-challenge-arrow)"
                : undefined
          }
        >
          <title>{`${course.name}｜${course.length}｜${course.slope}`}</title>
        </path>
      ))}
      <ChairLift
        id="第 2 Pair Lift 568m"
        x1={424}
        y1={206}
        x2={366}
        y2={20}
        color="#343f43"
        chairs={5}
      />
      <ChairLift
        id="第 1 Pair Lift 857m"
        x1={516}
        y1={424}
        x2={703}
        y2={104}
        color="#343f43"
        chairs={6}
      />

      {[
        [654, 138, "Signal", "#ad3c78"],
        [515, 47, "Giant", "#18a9d7"],
        [490, 85, "Dynamic", "#43a25d"],
        [458, 105, "Challenge", "#66549b"],
        [642, 320, "Snowboard", "#a7743f"],
        [535, 238, "連絡", "#ef4c3f"],
      ].map(([x, y, name, color]) => {
        const width = trailLabelWidth(name, 9, 30, 68);
        const left = -width / 2;
        return (
          <g
            className="shokanbetsu-route-label"
            transform={`translate(${x} ${y})`}
            key={name}
          >
            <rect
              x={left}
              y="-9"
              width={width}
              height="22"
              rx="9"
              style={{ stroke: color }}
            />
            <line x1={left + 9} x2={left + 24} style={{ stroke: color }} />
            <text x={left + 30} y="4">
              {name}
            </text>
          </g>
        );
      })}

      <g className="shokanbetsu-lodge" transform="translate(413 418)">
        <path d="M0 32V8L28-10 57 8v24" />
        <path d="M-4 8 28-15 61 8" />
        <rect x="20" y="14" width="15" height="18" />
        <text x="29" y="49" textAnchor="middle">
          北歐風 LODGE
        </text>
      </g>
      <g className="shokanbetsu-parking" transform="translate(724 380)">
        <path className="parking-ground" d="M0 8 148 0 154 58 5 62Z" />
        <rect
          className="parking-sign"
          x="12"
          y="17"
          width="34"
          height="34"
          rx="7"
        />
        <text className="parking-p" x="29" y="41" textAnchor="middle">
          P
        </text>
        <g className="parking-car" transform="translate(61 18)">
          <path d="M5 13 12 2h31l8 11 7 3v15H0V16Z" />
          <circle cx="13" cy="31" r="5" />
          <circle cx="45" cy="31" r="5" />
        </g>
      </g>
      <g className="shokanbetsu-peak" transform="translate(744 67)">
        <path d="M0 25 15-4 30 25Z" />
        <text x="15" y="42" textAnchor="middle">
          暑寒別岳 1,491m
        </text>
      </g>

      <g className="shokanbetsu-title" transform="translate(18 18)">
        <rect width="220" height="79" rx="17" />
        <text x="18" y="29">
          暑寒別岳滑雪場
        </text>
        <text className="shokanbetsu-title-sub" x="18" y="54">
          6 COURSES · PAIR LIFT × 2 · 增毛町
        </text>
      </g>
      <g className="shokanbetsu-guide" transform="translate(18 451)">
        <rect width="864" height="54" rx="15" />
        {courses.map((course, index) => (
          <g transform={`translate(${16 + index * 140} 23)`} key={course.id}>
            <line x2="22" style={{ stroke: course.color }} />
            <text x="29" y="4">
              {course.name}
            </text>
            <text className="guide-stat" x="29" y="21">
              {course.length} · 最大斜度 {course.slope.replace("最大 ", "")}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function HorotachiTrailMap({ resort }) {
  const chairs = [0.16, 0.31, 0.46, 0.61, 0.76, 0.9];
  const courses = [
    {
      id: "D",
      name: "白樺",
      info: "720m · 最大 26° · 中高級",
      color: "#d85646",
      d: "M365 112 C303 164 268 235 267 306 C265 369 292 414 343 451",
      label: [278, 294],
    },
    {
      id: "C",
      name: "幌立",
      info: "700m · 最大 44° · 高級",
      color: "#343f46",
      d: "M475 112 C491 176 493 244 480 311 C469 369 455 414 431 451",
      label: [486, 276],
    },
    {
      id: "B",
      name: "落葉松",
      info: "800m · 最大 26° · 中級",
      color: "#3785b5",
      d: "M520 118 C552 181 565 248 557 311 C550 372 521 419 475 452",
      label: [560, 296],
    },
    {
      id: "A",
      name: "林間",
      info: "1,100m · 最大 15° · 初級",
      color: "#5b9d62",
      d: "M555 122 C650 175 698 245 699 310 C698 379 630 427 520 454",
      label: [688, 289],
    },
  ];
  return (
    <svg
      className="cartoon-trail-map tohma-trail-map horotachi-cartoon-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}手繪雪道圖：由左至右為 D、纜車、C、B、A`}
    >
      <defs>
        <linearGradient id="horotachi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94d1e8" />
          <stop offset="1" stopColor="#edf8fc" />
        </linearGradient>
        <linearGradient id="horotachi-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="horotachi-trees"
          width="25"
          height="29"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 3 18h6l-5 9h17l-5-9h6Z"
            fill="#4e9270"
            stroke="#337155"
            strokeWidth="1.1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#horotachi-sky)" />
      <path
        className="tohma-back-hill"
        d="M0 260 110 205 214 225 320 163 423 194 525 139 644 178 754 153 900 224V520H0Z"
      />
      <path
        className="horotachi-forest"
        d="M73 458 119 245 230 151 369 93 520 86 682 138 792 238 838 458Z"
      />
      <path
        className="horotachi-slope"
        d="M176 448 C204 334 253 211 375 111 C424 82 513 80 574 108 C684 202 736 331 739 448Z"
      />
      <path
        className="horotachi-tree-island"
        d="M338 445 C337 335 366 219 409 111 L434 103 C412 222 411 333 421 445Z"
      />
      <path
        className="horotachi-tree-island"
        d="M496 445 C519 333 516 216 485 105 L513 105 C558 221 570 335 552 445Z"
      />
      {courses.map((course) => (
        <path
          className="horotachi-course"
          d={course.d}
          style={{ "--course-color": course.color }}
          key={course.id}
        />
      ))}
      <g className="horotachi-chairlift" aria-label="纜車一座">
        <line x1="397" y1="452" x2="438" y2="106" />
        {chairs.map((point) => (
          <g
            key={point}
            transform={`translate(${397 + 41 * point} ${452 - 346 * point})`}
          >
            <line y2="12" />
            <path d="M-8 12h16v6H-8z" />
          </g>
        ))}
        <circle cx="397" cy="452" r="7" />
        <circle cx="438" cy="106" r="7" />
      </g>
      {courses.map((course) => (
        <g
          className="horotachi-course-tag"
          transform={`translate(${course.label[0]} ${course.label[1]})`}
          key={course.id}
        >
          <circle r="17" style={{ fill: course.color }} />
          <text y="6" textAnchor="middle">
            {course.id}
          </text>
        </g>
      ))}
      <g className="tohma-lodge" transform="translate(365 430)">
        <path d="M0 32V9L31-11 64 9v23M64 32V17L88 2l25 15v15" />
        <rect x="22" y="15" width="17" height="17" />
        <text x="56" y="49" textAnchor="middle">
          山腳纜車站
        </text>
      </g>
      <g className="horotachi-summit" transform="translate(426 91)">
        <path d="M0 16 10-4 20 16Z" />
        <text x="10" y="31" textAnchor="middle">
          山頂
        </text>
      </g>
      <g className="tohma-title horotachi-title" transform="translate(20 20)">
        <rect width="285" height="72" rx="17" />
        <text x="18" y="29">
          幌立滑雪場
        </text>
        <text className="tohma-title-sub" x="18" y="54">
          HOROTACHI SKI AREA · 4 COURSES
        </text>
      </g>
      <g className="horotachi-info" transform="translate(20 108)">
        <rect width="244" height="174" rx="16" />
        {courses
          .slice()
          .reverse()
          .map((course, index) => (
            <g transform={`translate(14 ${32 + index * 39})`} key={course.id}>
              <circle cx="11" cy="0" r="12" style={{ fill: course.color }} />
              <text className="course-id" x="11" y="5" textAnchor="middle">
                {course.id}
              </text>
              <text className="course-name" x="34" y="-3">
                {course.name}
              </text>
              <text className="course-info" x="34" y="12">
                {course.info}
              </text>
            </g>
          ))}
      </g>
      <g className="horotachi-warning" transform="translate(751 349)">
        <path d="M0 27 15-3 30 27Z" />
        <text x="15" y="20" textAnchor="middle">
          !
        </text>
        <text x="15" y="43" textAnchor="middle">
          雪道外禁止進入
        </text>
      </g>
    </svg>
  );
}

function TohmaTrailMap({ resort }) {
  const handles = [0.12, 0.25, 0.38, 0.51, 0.64, 0.77, 0.9];
  return (
    <svg
      className="cartoon-trail-map tohma-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}依當麻町官方資訊重繪：初心者緩坡、免費 Rope Lift 一座與雪橇專用道`}
    >
      <defs>
        <linearGradient id="tohma-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94d1e8" />
          <stop offset="1" stopColor="#edf8fc" />
        </linearGradient>
        <linearGradient id="tohma-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
        <pattern
          id="tohma-trees"
          width="25"
          height="29"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 3 18h6l-5 9h17l-5-9h6Z"
            fill="#4e9270"
            stroke="#337155"
            strokeWidth="1.1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#tohma-sky)" />
      <path
        className="tohma-back-hill"
        d="M0 255 112 207 208 220 309 168 405 197 516 148 630 183 742 156 900 228V520H0Z"
      />
      <path
        className="tohma-forest"
        d="M80 455 121 244 227 153 364 101 518 92 677 139 784 235 829 455Z"
      />
      <path
        className="tohma-main-slope"
        d="M197 444 C218 342 249 225 367 120 C414 92 504 87 565 111 C661 211 700 334 710 444Z"
      />
      <path
        className="tohma-tree-island"
        d="M198 440 C222 332 256 225 363 126 L395 115 C344 216 339 329 351 438Z"
      />
      <path
        className="tohma-sled-zone"
        d="M607 132 C665 205 691 301 692 405 C670 423 647 426 625 412 C632 310 619 219 578 144Z"
      />

      <path
        className="tohma-gentle-course"
        d="M470 118 C481 201 492 288 498 374 C501 401 513 421 536 440"
      />
      <g className="tohma-rope-tow" aria-label="免費 Rope Lift 一座">
        <line x1="410" y1="440" x2="416" y2="114" />
        {handles.map((progress) => {
          const x = 410 + (416 - 410) * progress;
          const y = 440 + (114 - 440) * progress;
          return (
            <g transform={`translate(${x} ${y})`} key={progress}>
              <line x2="15" y2="6" />
              <path d="M15 6v14m-6 0h12" />
            </g>
          );
        })}
        <circle cx="410" cy="440" r="7" />
        <circle cx="416" cy="114" r="7" />
      </g>

      <g className="tohma-course-label" transform="translate(530 274)">
        <rect x="-74" y="-28" width="148" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          初心者／家庭緩坡
        </text>
        <text className="tohma-label-sub" y="17" textAnchor="middle">
          寬闊、平緩、自然雪景
        </text>
      </g>
      <g className="tohma-course-label is-sled" transform="translate(659 273)">
        <rect x="-55" y="-27" width="110" height="54" rx="14" />
        <text y="-3" textAnchor="middle">
          雪橇專用道
        </text>
        <text className="tohma-label-sub" y="17" textAnchor="middle">
          BOBSLEIGH
        </text>
      </g>
      <g className="tohma-rope-label" transform="translate(415 197)">
        <rect x="-48" y="-14" width="96" height="28" rx="10" />
        <text y="4" textAnchor="middle">
          FREE ROPE LIFT
        </text>
      </g>

      <g className="tohma-lodge" transform="translate(330 423)">
        <path d="M0 35V9L34-12 70 9v26M70 35V17L94 2l26 15v18" />
        <rect x="25" y="16" width="18" height="19" />
        <text x="59" y="52" textAnchor="middle">
          LODGE · FREE Wi‑Fi · AED
        </text>
      </g>
      <g className="tohma-title" transform="translate(20 20)">
        <rect width="304" height="82" rx="17" />
        <text x="18" y="30">
          TOHMA-YAMA SKI AREA
        </text>
        <text className="tohma-title-sub" x="18" y="56">
          當麻山滑雪場 · FAMILY & BEGINNER
        </text>
      </g>
      <g className="tohma-info" transform="translate(20 119)">
        <rect width="276" height="129" rx="16" />
        <text className="tohma-info-title" x="18" y="28">
          OFFICIAL INFORMATION
        </text>
        <text x="18" y="55">
          Rope Lift
        </text>
        <text x="257" y="55" textAnchor="end">
          1 座 · 免費
        </text>
        <text x="18" y="80">
          營業時間
        </text>
        <text x="257" y="80" textAnchor="end">
          10:00–16:00
        </text>
        <text x="18" y="105">
          營業期間
        </text>
        <text x="257" y="105" textAnchor="end">
          12 月下旬–3 月上旬
        </text>
      </g>
    </svg>
  );
}

function InosawaTrailMap({ resort }) {
  return (
    <svg
      className="cartoon-trail-map inosawa-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}真實配置卡通重繪圖：全長250公尺，rope tow一座`}
    >
      <defs>
        <linearGradient id="inosawa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ed3ed" />
          <stop offset="1" stopColor="#f8fcff" />
        </linearGradient>
        <linearGradient id="inosawa-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf4" />
        </linearGradient>
        <pattern
          id="inosawa-trees"
          width="26"
          height="30"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M13 1 3 20h7l-5 8h16l-5-8h7Z"
            fill="#4d9472"
            stroke="#337454"
            strokeWidth="1.2"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#inosawa-sky)" />
      <path
        className="inosawa-back-hill"
        d="M0 255 112 203 205 222 305 174 399 205 512 170 615 208 736 183 900 249V520H0Z"
      />
      <path
        className="inosawa-forest"
        d="M65 439 119 190 267 97 453 75 661 103 794 196 841 439Z"
      />
      <path
        className="inosawa-slope"
        d="M160 430 C176 331 190 227 274 117 C355 92 513 91 629 118 C703 220 728 329 744 430Z"
      />
      <path
        className="inosawa-left-zone"
        d="M176 425 C191 332 211 225 284 127 C319 113 359 105 399 104 L409 425Z"
      />
      <path
        className="inosawa-right-zone"
        d="M430 425 438 104 C505 104 576 109 622 128 C691 231 713 333 728 425Z"
      />
      <path
        className="inosawa-course-edge"
        d="M174 427 C187 326 211 219 279 121 M742 427 C727 326 703 219 629 121"
      />

      <g className="inosawa-rope-tow">
        <line x1="420" y1="430" x2="420" y2="102" />
        {[0.13, 0.27, 0.41, 0.55, 0.69, 0.83].map((progress) => {
          const y = 430 + (102 - 430) * progress;
          return (
            <g key={progress} transform={`translate(420 ${y})`}>
              <line x2="14" y2="7" />
              <path d="M14 7v14m-5 0h10" />
            </g>
          );
        })}
        <circle cx="420" cy="102" r="8" />
        <circle cx="420" cy="430" r="8" />
      </g>

      <g className="inosawa-zone-label" transform="translate(288 239)">
        <rect x="-78" y="-28" width="156" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          基礎練習／檢定區
        </text>
        <text className="zone-slope" y="17" textAnchor="middle">
          較有坡度 · 最大 15°
        </text>
      </g>
      <g className="inosawa-zone-label" transform="translate(573 257)">
        <rect x="-83" y="-28" width="166" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          兒童／家庭緩坡區
        </text>
        <text className="zone-slope" y="17" textAnchor="middle">
          寬闊緩坡 · 最低 7°
        </text>
      </g>
      <g className="inosawa-rope-label" transform="translate(420 180)">
        <rect x="-48" y="-14" width="96" height="28" rx="12" />
        <text y="4" textAnchor="middle">
          ROPE TOW
        </text>
      </g>

      <g className="inosawa-lodge" transform="translate(385 423)">
        <path d="M0 37V9L39-13 78 9v28M78 37V18l25-15 27 15v19" />
        <rect x="29" y="18" width="20" height="19" />
        <text x="65" y="54" textAnchor="middle">
          LODGE／乘車處
        </text>
      </g>
      <g className="inosawa-city" transform="translate(560 454)">
        {[0, 28, 61, 95, 131, 168].map((x, index) => (
          <rect
            x={x}
            y={16 - (index % 3) * 6}
            width="20"
            height={24 + (index % 3) * 6}
            key={x}
          />
        ))}
        <text x="94" y="58" textAnchor="middle">
          旭川市街景觀
        </text>
      </g>

      <g className="inosawa-title" transform="translate(24 22)">
        <rect width="284" height="92" rx="18" />
        <text x="18" y="30">
          伊ノ沢市民スキー場
        </text>
        <text className="inosawa-stats" x="18" y="55">
          全長 250m · 標高差 87m · Rope Tow 1座
        </text>
        <text className="inosawa-stats" x="18" y="77">
          最大 15° · 平均 10° · 最低 7°
        </text>
      </g>
      <g className="real-map-north" transform="translate(842 65)">
        <path d="M0 24 11-11 22 24 11 18Z" />
        <text x="11" y="41" textAnchor="middle">
          N
        </text>
      </g>
    </svg>
  );
}

const layoutBias = {
  wide: { spread: 1, lean: 0, ridge: 0 },
  vertical: { spread: 0.55, lean: 0, ridge: -12 },
  fan: { spread: 0.78, lean: 0, ridge: 4 },
  dual: { spread: 0.9, lean: 0, ridge: 10 },
  triple: { spread: 1, lean: 0, ridge: 15 },
  "multi-base": { spread: 1, lean: 0, ridge: 20 },
  compact: { spread: 0.48, lean: 0, ridge: 2 },
  single: { spread: 0.2, lean: 0, ridge: 0 },
  gentle: { spread: 0.7, lean: 0, ridge: 32 },
  alpine: { spread: 0.72, lean: 0, ridge: -28 },
  "ridge-left": { spread: 0.72, lean: -95, ridge: 0 },
  "ridge-right": { spread: 0.72, lean: 95, ridge: 0 },
  "steep-left": { spread: 0.46, lean: -90, ridge: -20 },
};

function ProfiledTrailMap({ resort, profile }) {
  const bias = layoutBias[profile.layout] ?? layoutBias.fan;
  const peakX = 450 + bias.lean;
  const peakY = 75 + bias.ridge;
  const visibleCourses = Math.min(profile.courses, 20);
  const visibleLifts = Math.min(profile.lifts, 10);
  const zoneCount = Math.max(profile.zones ?? 1, 1);
  const courses = Array.from({ length: visibleCourses }, (_, index) => {
    const zone = index % zoneCount;
    const zoneOffset = (zone - (zoneCount - 1) / 2) * 95;
    const normalized =
      visibleCourses === 1 ? 0.5 : index / (visibleCourses - 1);
    const endX = 105 + normalized * 690 * bias.spread + (1 - bias.spread) * 345;
    const startX = peakX + zoneOffset * 0.34 + ((index % 3) - 1) * 10;
    const bendX = startX * 0.42 + endX * 0.58 + (index % 2 ? 34 : -34);
    const endY = 442 - (index % 3) * 9;
    return {
      d: `M ${startX} ${peakY + 30 + zone * 8} C ${startX + zoneOffset * 0.18} ${175 + (index % 4) * 18}, ${bendX} ${300 + (index % 3) * 22}, ${endX} ${endY}`,
      color: palette[index % palette.length],
      width: index % 3 === 2 ? 5 : 7,
    };
  });
  const lifts = Array.from({ length: visibleLifts }, (_, index) => {
    const normalized = visibleLifts === 1 ? 0.5 : index / (visibleLifts - 1);
    const baseX = 145 + normalized * 610;
    const zone = index % zoneCount;
    return {
      baseX,
      topX: peakX + (zone - (zoneCount - 1) / 2) * 88,
      topY: peakY + 40 + zone * 14,
    };
  });
  const zonePeaks = Array.from(
    { length: zoneCount },
    (_, index) => peakX + (index - (zoneCount - 1) / 2) * 120,
  );

  return (
    <svg
      className="cartoon-trail-map profiled-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort}專屬雪道與纜車配置卡通圖`}
    >
      <defs>
        <linearGradient
          id={`snow-${resort.replace(/\W/g, "")}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf3" />
        </linearGradient>
      </defs>
      <rect width="900" height="520" fill="#cbeaf5" />
      <path
        className="trail-skyline"
        d={`M20 452 120 246 ${zonePeaks.map((x, index) => `${x - 65} ${175 + index * 12} ${x} ${peakY + index * 14} ${x + 76} ${190 + index * 10}`).join(" ")} 790 238 880 452Z`}
        fill={`url(#snow-${resort.replace(/\W/g, "")})`}
      />
      {zonePeaks.map((x, index) => (
        <path
          className="trail-ridge"
          d={`M${x} ${peakY + index * 14} ${x - 45} ${peakY + 78 + index * 12} ${x + 4} ${peakY + 58 + index * 8} ${x + 54} ${peakY + 100 + index * 10}`}
          key={x}
        />
      ))}
      {courses.map((course, index) => (
        <path
          className="cartoon-course"
          d={course.d}
          key={index}
          style={{
            "--course-color": course.color,
            "--course-width": course.width,
          }}
        />
      ))}
      {lifts.map((lift, index) => (
        <ChairLift
          key={index}
          id={`Lift ${index + 1}`}
          x1={lift.baseX}
          y1={445}
          x2={lift.topX}
          y2={lift.topY}
          color="#e96b3d"
          chairs={4}
        />
      ))}
      {zonePeaks.map((x, index) => (
        <g
          className="trail-summit"
          transform={`translate(${x} ${peakY - 2 + index * 14})`}
          key={x}
        >
          <line y2="-22" />
          <path d="M1-22 25-15 1-8Z" />
        </g>
      ))}
      {Array.from({ length: Math.min(zoneCount, 3) }, (_, index) => (
        <g
          className="trail-base"
          transform={`translate(${620 + index * 72} ${423 - index * 6})`}
          key={index}
        >
          <path d="M0 18V2l16-12L32 2v16M7 18V8h7v10M20 4h6" />
          <text x="16" y="33" textAnchor="middle">
            BASE {index + 1}
          </text>
        </g>
      ))}
      <g className="profile-map-title" transform="translate(25 24)">
        <rect width="305" height="76" rx="17" />
        <text x="18" y="31">
          {resort}
        </text>
        <text className="profile-map-stats" x="18" y="57">
          雪道 {profile.courses} · 纜車／運輸設備 {profile.lifts} · {zoneCount}{" "}
          區域
        </text>
      </g>
      <g className="trail-legend" transform="translate(675 28)">
        <circle cx="6" cy="6" r="6" fill="#67a96b" />
        <text x="18" y="10">
          初級
        </text>
        <circle cx="72" cy="6" r="6" fill="#3f91c2" />
        <text x="84" y="10">
          中級
        </text>
        <circle cx="138" cy="6" r="6" fill="#e56b4a" />
        <text x="150" y="10">
          進階
        </text>
      </g>
    </svg>
  );
}

function KamoiTrailMap({ resort }) {
  const courses = [
    {
      id: "1",
      name: "バンビコース",
      color: "#43a76e",
      d: "M465 392 C450 333 455 274 450 224",
    },
    {
      id: "2",
      name: "第1ゲレンデ",
      color: "#e65343",
      d: "M395 78 C421 124 432 177 405 225",
    },
    {
      id: "2",
      name: "第1ゲレンデ",
      color: "#43a76e",
      d: "M376 393 C371 331 383 273 405 225",
    },
    {
      id: "3",
      name: "大会コース",
      color: "#e65343",
      d: "M362 393 C358 325 367 263 356 202 C347 148 333 111 317 74",
    },
    {
      id: "4",
      name: "トレーニングバーン",
      color: "#e65343",
      d: "M304 394 C288 330 302 271 293 214 C284 151 275 106 253 63",
    },
    {
      id: "5",
      name: "第2ゲレンデ",
      color: "#43a76e",
      d: "M239 394 C217 335 227 275 214 220",
    },
    {
      id: "5",
      name: "第2ゲレンデ",
      color: "#e65343",
      d: "M214 220 C201 158 204 105 225 61",
    },
  ];
  const courseDetails = [
    ["1", "バンビ", "600m · 12–18°"],
    ["2", "第1ゲレンデ", "1400m · 最大27°"],
    ["3", "大会コース", "1200m · 17–29°"],
    ["4", "トレーニング", "坡度：官方未提供"],
    ["5", "第2ゲレンデ", "坡度：官方未提供"],
  ];

  return (
    <svg
      className="cartoon-trail-map kamoi-trail-map"
      viewBox="0 0 900 560"
      role="img"
      aria-label={`${resort}官方配置重繪：5 條雪道、2 座 Pair Lift、山頂 467m`}
    >
      <defs>
        <linearGradient id="kamoi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dff5f7" />
          <stop offset="1" stopColor="#f7fcfd" />
        </linearGradient>
        <linearGradient id="kamoi-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dfeaf2" />
        </linearGradient>
        <pattern
          id="kamoi-trees"
          width="34"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M17 2 7 20h7l-6 11h18l-6-11h7Z"
            fill="#aac6dc"
            opacity=".75"
          />
        </pattern>
      </defs>
      <rect width="900" height="560" fill="url(#kamoi-sky)" />
      <path
        className="kamoi-ridge"
        d="M20 110 177 42 324 66 457 82 620 97 878 150"
      />
      <path
        className="kamoi-forest"
        d="M48 92 186 53 371 85 579 101 830 153 890 510H32Z"
      />
      <path
        className="kamoi-slope"
        d="M213 54 C292 43 386 59 454 119 L491 413 C433 433 296 432 226 409 C197 320 192 226 198 150 C199 104 203 72 213 54Z"
      />
      {courses.map((course, index) => (
        <path
          className="kamoi-course"
          d={course.d}
          style={{ "--kamoi-course": course.color }}
          key={`${course.id}-${index}`}
        >
          <title>{course.name}</title>
        </path>
      ))}
      <ChairLift
        id="第1ペアリフト 1002m"
        x1={300}
        y1={420}
        x2={254}
        y2={70}
        color="#e6b62f"
        chairs={7}
      />
      <ChairLift
        id="第2ペアリフト 584m"
        x1={500}
        y1={420}
        x2={470}
        y2={204}
        color="#e96b3d"
        chairs={4}
      />
      {courseDetails.map((course, index) => (
        <g
          className="kamoi-course-label"
          transform={`translate(${[470, 421, 352, 294, 219][index]} ${[381, 183, 286, 222, 140][index]})`}
          key={course[0]}
        >
          <circle
            r="13"
            style={{ fill: course[0] === "1" ? "#43a76e" : "#e65343" }}
          />
          <text y="5" textAnchor="middle">
            {course[0]}
          </text>
        </g>
      ))}
      <g
        className="kamoi-lift-label"
        transform="translate(271 271) rotate(-96)"
      >
        <rect x="-62" y="-13" width="124" height="26" rx="10" />
        <text y="5" textAnchor="middle">
          第1ペアリフト · 1002m
        </text>
      </g>
      <g
        className="kamoi-lift-label"
        transform="translate(492 315) rotate(-98)"
      >
        <rect x="-60" y="-13" width="120" height="26" rx="10" />
        <text y="5" textAnchor="middle">
          第2ペアリフト · 584m
        </text>
      </g>
      <g className="kamoi-base" transform="translate(256 410)">
        <path d="M0 28V8L24-8 48 8v20M52 28V13l19-12 20 12v15M96 28V9l20-13 22 13v19" />
        <text x="70" y="45" textAnchor="middle">
          CENTER HOUSE · LIFT TICKET · RENTAL
        </text>
      </g>
      <g className="kamoi-title" transform="translate(25 20)">
        <rect width="278" height="84" rx="17" />
        <text x="17" y="31">
          MT. KAMOI
        </text>
        <text className="kamoi-title-sub" x="17" y="57">
          5 COURSES · 2 PAIR LIFTS · 歌志內市
        </text>
      </g>
      <g className="kamoi-legend" transform="translate(648 26)">
        <rect width="220" height="74" rx="16" />
        <circle cx="20" cy="25" r="7" fill="#43a76e" />
        <text x="35" y="30">
          初級 · 綠色區段
        </text>
        <circle cx="20" cy="53" r="7" fill="#e65343" />
        <text x="35" y="58">
          中級 · 紅色區段
        </text>
      </g>
      <g className="kamoi-peak" transform="translate(230 41)">
        <path d="M0 23 12-5 25 23Z" />
        <text x="12" y="40" textAnchor="middle">
          山頂 467m
        </text>
      </g>
      <g className="kamoi-specs" transform="translate(20 452)">
        <rect width="860" height="90" rx="15" />
        {courseDetails.map((course, index) => (
          <g transform={`translate(${86 + index * 169} 40)`} key={course[0]}>
            <circle
              cx="-69"
              cy="-6"
              r="9"
              style={{ fill: course[0] === "1" ? "#43a76e" : "#e65343" }}
            />
            <text className="kamoi-spec-name" y="-3" textAnchor="middle">
              {course[0]}. {course[1]}
            </text>
            <text className="kamoi-spec-stat" y="21" textAnchor="middle">
              {course[2]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function NisekoUnitedOfficialMap({ focus = "hirafu" }) {
  const officialMapUrl =
    "https://www.niseko.ne.jp/en/wp-content/uploads/2026/02/2025-2026_WEBMAP_EG-1-scaled.jpg";
  const isVillage = focus === "village";
  const isAnnupuri = focus === "annupuri";
  const isHanazono = focus === "hanazono";
  const focusPath = isHanazono
    ? "M472 79 532 79 672 159 900 246 900 539 700 539 670 433 632 287 614 231 570 197Z"
    : isAnnupuri
      ? "M386 79 425 80 359 210 275 385 174 558 20 575 2 575 5 446 0 440 13 352 52 283 175 205 304 126Z"
      : isVillage
        ? "M404 78 449 76 C470 146 457 240 434 332 L434 622 47 627 48 574 96 573 C171 464 247 363 304 260 L382 160Z"
        : "M456 73 500 68 C539 120 602 187 642 245 L644 567 470 567 470 277 446 169Z";
  return (
    <a
      className="niseko-official-map-link"
      href={officialMapUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Open the official Niseko United trail map in a new tab"
    >
      <svg
        className="cartoon-trail-map niseko-official-trail-map"
        viewBox="0 0 900 640"
        role="img"
        aria-label={`Official Niseko United trail map with ${isHanazono ? "Niseko Hanazono" : isAnnupuri ? "Niseko Annupuri" : isVillage ? "Niseko Village" : "Grand Hirafu"} highlighted`}
      >
        <defs>
          <clipPath id="niseko-resort-focus">
            <path d={focusPath} />
          </clipPath>
          <clipPath id="niseko-route-guide-focus">
            <rect x="676" y="116" width="215" height="62" />
          </clipPath>
          <clipPath id="niseko-hirafu-footer-focus">
            <rect x="510" y="565" width="340" height="35" />
          </clipPath>
        </defs>
        <rect width="900" height="640" fill="#e5f3f8" />
        <image
          href={officialMapUrl}
          width="900"
          height="640"
          preserveAspectRatio="none"
        />
        <rect className="niseko-official-dimmer" width="900" height="640" />
        <image
          href={officialMapUrl}
          width="900"
          height="640"
          preserveAspectRatio="none"
          clipPath="url(#niseko-resort-focus)"
        />
        <image
          href={officialMapUrl}
          width="900"
          height="640"
          preserveAspectRatio="none"
          clipPath="url(#niseko-route-guide-focus)"
        />
        {!isVillage && !isAnnupuri && !isHanazono && (
          <image
            href={officialMapUrl}
            width="900"
            height="640"
            preserveAspectRatio="none"
            clipPath="url(#niseko-hirafu-footer-focus)"
          />
        )}
      </svg>
    </a>
  );
}

function NisekoUnitedTrailMap() {
  const runs = [
    ["#1c9d65", "M369 106 C335 171 295 245 264 430"],
    ["#d9413d", "M386 110 C366 192 349 289 334 430"],
    ["#283b44", "M404 116 C409 206 395 296 385 430"],
    ["#1c9d65", "M433 111 C420 191 421 293 434 430"],
    ["#d9413d", "M450 112 C465 198 470 296 480 430"],
    ["#283b44", "M462 124 C494 206 510 296 523 430"],
    ["#1c9d65", "M500 108 C515 190 531 292 544 430"],
    ["#d9413d", "M518 112 C554 199 574 296 586 430"],
    ["#283b44", "M532 124 C585 205 618 298 630 430"],
    ["#1c9d65", "M567 114 C615 197 661 291 685 430"],
    ["#d9413d", "M583 120 C644 199 700 286 725 430"],
    ["#283b44", "M596 130 C684 207 748 296 770 430"],
  ];
  const zones = [
    [
      "ANNUPURI",
      "M112 430 C146 303 231 178 372 95 C390 95 402 104 408 119 L409 430Z",
      248,
      "Niseko Annupuri",
    ],
    [
      "NISEKO VILLAGE",
      "M347 430 C359 284 394 160 426 96 C450 100 480 145 506 218 C528 286 536 358 536 430Z",
      442,
      "Niseko Village",
    ],
    [
      "GRAND HIRAFU",
      "M500 430 C503 300 518 174 498 96 C550 105 618 167 660 253 C684 312 689 374 684 430Z",
      592,
      "Grand Hirafu",
    ],
    [
      "HANAZONO",
      "M652 430 C665 306 711 210 783 156 C814 143 836 176 844 226 C856 300 848 375 830 430Z",
      758,
      "Hanazono",
    ],
  ];
  return (
    <svg
      className="cartoon-trail-map niseko-united-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label="Niseko United four resort trail overview"
    >
      <defs>
        <linearGradient id="niseko-united-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#80c9e7" />
          <stop offset="1" stopColor="#eff8fb" />
        </linearGradient>
        <linearGradient id="niseko-united-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9edf4" />
        </linearGradient>
        <pattern
          id="niseko-united-trees"
          width="22"
          height="27"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M11 1 3 18h5l-5 8h16l-5-8h5Z"
            fill="#4d8a69"
            stroke="#376d55"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#niseko-united-sky)" />
      <path
        className="niseko-united-ridge"
        d="M0 245 88 194 174 215 267 157 359 193 451 65 539 167 631 135 731 188 821 148 900 211V520H0Z"
      />
      <path
        className="niseko-united-forest"
        d="M70 432 C111 294 193 174 351 101 C389 82 422 67 453 69 C609 89 777 179 850 347V432Z"
      />
      {zones.map(([name, d, x, base], index) => (
        <g
          className={`niseko-united-zone-group ${index === 2 ? "is-focus" : "is-muted"}`}
          key={name}
        >
          <path className="niseko-united-zone" d={d} />
          <path
            className="niseko-united-tree-island"
            d={
              index === 0
                ? "M185 430C199 317 250 208 333 130L347 137C309 242 309 342 318 430Z"
                : index === 3
                  ? "M759 430C760 309 782 221 812 174L827 199C818 290 821 370 814 430Z"
                  : `M${x - 21} 430C${x - 16} 306 ${x - 10} 189 ${x + 7} 113L${x + 22} 123C${x + 8} 229 ${x + 10} 348 ${x + 18} 430Z`
            }
          />
          <g
            className="niseko-united-zone-label"
            transform={`translate(${x} ${index === 0 ? 284 : index === 3 ? 283 : 266})`}
          >
            <rect x="-61" y="-16" width="122" height="32" rx="10" />
            <text y="4" textAnchor="middle">
              {name}
            </text>
          </g>
          <text
            className="niseko-united-base"
            x={x}
            y="462"
            textAnchor="middle"
          >
            {base}
          </text>
        </g>
      ))}
      {runs.map(([color, d], index) => (
        <path
          key={index}
          className={`niseko-united-run ${index >= 6 && index <= 8 ? "is-focus" : "is-muted"}`}
          d={d}
          style={{ "--niseko-run": color }}
        />
      ))}
      <g className="niseko-united-lift">
        <line className="is-muted" x1="270" y1="430" x2="383" y2="113" />
        <line className="is-muted" x1="478" y1="430" x2="449" y2="110" />
        <line className="is-focus" x1="590" y1="430" x2="514" y2="109" />
        <line className="is-muted" x1="724" y1="430" x2="583" y2="122" />
      </g>
      <g className="niseko-united-peak" transform="translate(441 64)">
        <path d="M0 17 10-4 20 17Z" />
        <text x="10" y="32" textAnchor="middle">
          MT. NISEKO ANNUPURI · 1,308m
        </text>
      </g>
      <g className="niseko-united-title" transform="translate(20 20)">
        <rect width="278" height="78" rx="16" />
        <text x="18" y="30">
          GRAND HIRAFU
        </text>
        <text x="18" y="55">
          NISEKO UNITED · FOUR RESORTS
        </text>
      </g>
      <g className="niseko-united-legend" transform="translate(20 116)">
        <rect width="250" height="99" rx="15" />
        <text x="16" y="23">
          TRAIL DIFFICULTY
        </text>
        <line x1="18" y1="44" x2="48" y2="44" className="is-green" />
        <text x="60" y="48">
          BEGINNER
        </text>
        <line x1="18" y1="66" x2="48" y2="66" className="is-red" />
        <text x="60" y="70">
          MORE DIFFICULT
        </text>
        <line x1="18" y1="88" x2="48" y2="88" className="is-black" />
        <text x="60" y="92">
          MOST DIFFICULT
        </text>
      </g>
      <text className="niseko-united-note" x="450" y="500" textAnchor="middle">
        OFFICIAL 2025–26 MAP INSPIRED OVERVIEW · ALL FOUR RESORTS CONNECTED
      </text>
    </svg>
  );
}

function NisekoVillageTrailMap({ resort }) {
  const villageRuns = [
    ["#1c9d65", "M422 112 C399 171 392 231 400 297 C407 359 385 410 350 459"],
    ["#1c9d65", "M448 109 C436 165 435 226 446 291 C455 352 442 407 417 458"],
    ["#e87835", "M474 112 C489 174 501 228 494 292 C488 352 498 404 512 458"],
    ["#e87835", "M492 118 C524 181 543 236 540 305 C537 363 554 412 571 458"],
    ["#d9413d", "M407 132 C375 195 362 258 369 318 C375 367 359 414 329 459"],
    ["#d9413d", "M516 126 C553 183 575 251 577 316 C579 373 600 413 621 458"],
    ["#2d3f48", "M460 111 C464 177 464 238 459 308 C455 370 462 416 472 459"],
  ];
  const mutedRuns = [
    "M120 205 C147 264 164 331 154 398 C148 425 136 444 124 460",
    "M160 188 C191 251 212 313 206 379 C200 416 189 442 180 461",
    "M252 171 C267 237 271 310 258 382 C251 418 248 440 242 459",
    "M638 177 C659 245 668 315 660 385 C656 419 665 443 677 460",
    "M694 183 C729 247 747 311 744 377 C743 417 751 442 759 460",
    "M758 204 C794 263 811 324 809 382 C808 419 804 441 799 460",
  ];
  return (
    <svg
      className="cartoon-trail-map niseko-village-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort} focused hand-drawn trail map`}
    >
      <defs>
        <linearGradient id="niseko-village-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8dcce6" />
          <stop offset="1" stopColor="#f7fbfc" />
        </linearGradient>
        <linearGradient id="niseko-village-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#dcecf1" />
        </linearGradient>
        <pattern
          id="niseko-village-trees"
          width="24"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 4 17h5l-5 9h16l-5-9h5Z"
            fill="#568d70"
            stroke="#397059"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#niseko-village-sky)" />
      <path
        className="niseko-back-ridge"
        d="M0 252 102 193 190 217 295 150 377 191 461 71 548 168 638 134 731 189 824 150 900 204V520H0Z"
      />
      <g className="niseko-muted-area">
        <path
          className="niseko-forest"
          d="M48 458 C87 318 154 216 283 147 C343 115 387 89 454 85 C594 95 758 184 845 357V458Z"
        />
        <path
          className="niseko-slope niseko-annupuri"
          d="M72 460 C90 355 142 245 256 166 C292 139 323 135 350 149 C333 254 331 352 342 460Z"
        />
        <path
          className="niseko-slope niseko-hirafu"
          d="M579 460 C602 336 649 235 727 174 C760 146 791 160 815 204 C840 275 846 366 830 460Z"
        />
        {mutedRuns.map((d, index) => (
          <path className="niseko-muted-run" d={d} key={index} />
        ))}
        <g className="niseko-muted-lift">
          <line x1="125" y1="460" x2="253" y2="178" />
          <line x1="754" y1="460" x2="695" y2="181" />
        </g>
        <g className="niseko-muted-label" transform="translate(168 285)">
          <rect x="-72" y="-22" width="144" height="44" rx="12" />
          <text y="-2" textAnchor="middle">
            ANNUPURI
          </text>
          <text y="14" textAnchor="middle">
            MUTED AREA
          </text>
        </g>
        <g className="niseko-muted-label" transform="translate(738 286)">
          <rect x="-88" y="-22" width="176" height="44" rx="12" />
          <text y="-2" textAnchor="middle">
            HIRAFU · HANAZONO
          </text>
          <text y="14" textAnchor="middle">
            MUTED AREA
          </text>
        </g>
      </g>
      <path
        className="niseko-village-slope"
        d="M309 461 C327 334 360 204 453 82 C483 90 517 125 550 181 C590 251 616 360 632 461Z"
      />
      <path
        className="niseko-village-forest"
        d="M294 461 C321 337 364 218 448 90 C430 211 438 331 462 461ZM504 461 C510 327 497 211 472 93 C542 156 592 273 620 461Z"
      />
      <path
        className="niseko-village-boundary"
        d="M309 461 C327 334 360 204 453 82 C483 90 517 125 550 181 C590 251 616 360 632 461"
      />
      {villageRuns.map(([color, d], index) => (
        <path
          className="niseko-village-run"
          d={d}
          style={{ "--niseko-run": color }}
          key={index}
        />
      ))}
      <g className="niseko-village-lift">
        <line x1="393" y1="458" x2="455" y2="99" />
        {[0.18, 0.36, 0.54, 0.72].map((point) => (
          <g
            key={point}
            transform={`translate(${393 + 62 * point} ${458 - 359 * point})`}
          >
            <line y2="12" />
            <path d="M-7 12h14v5H-7Z" />
          </g>
        ))}
      </g>
      <g className="niseko-village-gondola">
        <line x1="549" y1="458" x2="482" y2="123" />
        {[0.24, 0.5, 0.76].map((point) => (
          <rect
            key={point}
            x={549 - 67 * point - 7}
            y={458 - 335 * point - 8}
            width="14"
            height="16"
            rx="3"
          />
        ))}
      </g>
      <g className="niseko-village-label" transform="translate(472 248)">
        <rect x="-93" y="-32" width="186" height="64" rx="15" />
        <text y="-6" textAnchor="middle">
          NISEKO VILLAGE
        </text>
        <text y="15" textAnchor="middle">
          PRIMARY SKI AREA
        </text>
      </g>
      <g className="niseko-village-base" transform="translate(408 430)">
        <path d="M0 31V9L27-9 56 9v22M56 31V16l24-15 27 15v15" />
        <rect x="18" y="15" width="13" height="16" />
        <text x="55" y="48" textAnchor="middle">
          NISEKO VILLAGE · HILTON
        </text>
      </g>
      <g className="niseko-village-peak" transform="translate(452 72)">
        <path d="M0 16 10-4 20 16Z" />
        <text x="10" y="32" textAnchor="middle">
          MT. ANNUPURI
        </text>
      </g>
      <g className="niseko-village-title" transform="translate(20 20)">
        <rect width="302" height="82" rx="17" />
        <text x="18" y="31">
          NISEKO UNITED
        </text>
        <text x="18" y="56">
          NISEKO VILLAGE FOCUS
        </text>
      </g>
      <g className="niseko-village-legend" transform="translate(20 122)">
        <rect width="246" height="106" rx="15" />
        <text x="16" y="25">
          TRAIL DIFFICULTY
        </text>
        <line x1="18" y1="47" x2="49" y2="47" className="is-green" />
        <text x="60" y="51">
          BEGINNER
        </text>
        <line x1="18" y1="70" x2="49" y2="70" className="is-orange" />
        <text x="60" y="74">
          INTERMEDIATE
        </text>
        <line x1="18" y1="93" x2="49" y2="93" className="is-red" />
        <text x="60" y="97">
          ADVANCED · EXPERT
        </text>
      </g>
      <text className="niseko-village-note" x="688" y="491">
        OTHER NISEKO RESORTS SHOWN MUTED
      </text>
    </svg>
  );
}

function GrandHirafuTrailMap({ resort }) {
  const liftChairs = [0.18, 0.34, 0.5, 0.66, 0.82];
  const liveStatusUrl =
    "https://www.niseko.ne.jp/en/niseko-lift-status/#tag_g_hirafu";
  const liftStatuses = [
    ["ACE FAM", 116, 399, "Ace Family Quad Lift"],
    ["ACE GON", 145, 334, "Ace Gondola"],
    ["ACE #3", 211, 218, "Ace Pair Lift #3"],
    ["ACE #4", 307, 154, "Ace Pair Lift #4"],
    ["KING G", 462, 408, "King Gondola"],
    ["HOLIDAY", 534, 345, "King Holiday Pair Lift"],
    ["KING #3", 625, 215, "King Sixpack Lift #3"],
    ["KING #4", 638, 158, "King Single Lift #4"],
    ["MONKEY", 757, 391, "Swinging Monkey"],
  ];
  const courses = [
    // Grand Hirafu lower and family runs
    ["#5ea86a", "M456 105 C415 151 382 209 350 281 C324 339 287 401 220 445"],
    ["#5ea86a", "M452 107 C423 166 407 222 394 286 C379 354 348 402 308 446"],
    ["#377eb8", "M444 116 C411 175 380 245 361 316 C347 365 329 406 285 447"],
    ["#377eb8", "M426 138 C380 191 347 253 322 329 C302 385 271 422 184 447"],
    ["#dc6854", "M413 151 C377 221 358 290 356 352 C355 393 341 423 333 447"],
    ["#38444a", "M396 175 C368 243 352 315 365 371 C373 404 384 427 398 446"],
    // King Bell and upper Hirafu runs
    ["#5ea86a", "M498 94 C497 151 500 204 502 258 C503 336 479 401 451 445"],
    ["#5ea86a", "M506 100 C526 159 540 222 535 286 C530 353 514 404 495 445"],
    ["#377eb8", "M512 104 C553 163 574 222 575 280 C577 345 555 395 538 445"],
    ["#377eb8", "M519 110 C570 166 598 220 606 279 C615 344 594 404 581 445"],
    ["#dc6854", "M524 116 C590 169 625 226 632 287 C638 344 630 394 624 445"],
    ["#dc6854", "M530 124 C610 182 641 234 650 292 C663 352 677 405 694 445"],
    ["#38444a", "M506 104 C482 168 469 235 472 296 C474 353 453 402 423 445"],
    ["#38444a", "M520 112 C561 173 582 244 584 310 C585 361 568 402 560 445"],
    // Hanazono long cruisers
    ["#5ea86a", "M695 179 C677 232 667 288 675 341 C681 387 700 420 723 447"],
    ["#5ea86a", "M717 174 C702 236 701 291 713 344 C726 393 750 422 770 447"],
    ["#377eb8", "M738 177 C741 233 754 285 770 333 C787 383 800 414 808 447"],
    ["#377eb8", "M760 181 C779 230 796 279 801 328 C806 379 810 412 817 447"],
    ["#dc6854", "M787 190 C811 250 821 299 818 349 C816 393 809 421 796 447"],
    ["#dc6854", "M801 201 C831 253 841 310 837 361 C834 399 826 425 820 447"],
    ["#38444a", "M716 181 C730 238 732 298 728 352 C724 394 713 421 704 447"],
    ["#38444a", "M781 188 C795 242 801 299 794 350 C789 393 781 421 776 447"],
  ];
  return (
    <svg
      className="cartoon-trail-map hirafu-trail-map"
      viewBox="0 0 900 520"
      role="img"
      aria-label={`${resort} hand-drawn trail map`}
    >
      <defs>
        <linearGradient id="hirafu-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92d2e8" />
          <stop offset="1" stopColor="#eff9fc" />
        </linearGradient>
        <linearGradient id="hirafu-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8edf4" />
        </linearGradient>
        <pattern
          id="hirafu-trees"
          width="25"
          height="29"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M12 1 3 18h6l-5 9h17l-5-9h6Z"
            fill="#4e9270"
            stroke="#337155"
            strokeWidth="1.1"
          />
        </pattern>
      </defs>
      <rect width="900" height="520" fill="url(#hirafu-sky)" />
      <path
        className="hirafu-back-ridge"
        d="M0 260 97 203 190 226 290 168 392 206 498 118 592 177 700 147 802 197 900 168V520H0Z"
      />
      <path
        className="hirafu-forest"
        d="M55 458 C97 326 178 209 300 143 C385 96 453 68 515 80 C635 94 754 178 845 332 L865 458Z"
      />
      <path
        className="hirafu-slope hirafu-slope--west"
        d="M133 450 C164 337 229 221 349 132 C393 96 435 88 465 96 C436 201 426 328 436 450Z"
      />
      <path
        className="hirafu-slope hirafu-slope--center"
        d="M431 450 C425 310 443 182 497 91 C557 118 620 190 652 286 C660 348 632 407 598 450Z"
      />
      <path
        className="hirafu-slope hirafu-slope--east"
        d="M592 450 C621 339 656 245 725 180 C757 154 787 163 809 197 C839 270 845 364 827 450Z"
      />
      <path
        className="hirafu-tree-island"
        d="M355 445 C361 319 385 197 452 111 L478 94 C453 205 452 331 475 445Z"
      />
      {courses.map(([color, d], index) => (
        <path
          className="hirafu-course"
          d={d}
          style={{ "--hirafu-course": color }}
          key={`hirafu-course-${index}`}
        />
      ))}
      <image
        className="hirafu-illustrated-base"
        href="/assets/grand-hirafu-handdrawn-map-v2.png"
        x="0"
        y="0"
        width="900"
        height="520"
        preserveAspectRatio="xMidYMid meet"
      />
      <g className="hirafu-lift">
        <line x1="160" y1="446" x2="455" y2="105" />
        {liftChairs.map((point) => (
          <g
            key={point}
            transform={`translate(${160 + 295 * point} ${446 - 341 * point})`}
          >
            <line x2="15" y2="7" />
            <path d="M15 7v14m-6 0h12" />
          </g>
        ))}
      </g>
      <g className="hirafu-lift hirafu-lift--gondola">
        <line x1="584" y1="445" x2="507" y2="99" />
        {[0.25, 0.5, 0.75].map((point) => (
          <rect
            key={point}
            x={584 - 77 * point - 7}
            y={445 - 346 * point - 7}
            width="14"
            height="14"
            rx="3"
          />
        ))}
      </g>
      <g className="hirafu-live-status-key" transform="translate(665 27)">
        <rect width="208" height="37" rx="12" />
        <circle cx="16" cy="18" r="5" />
        <text x="29" y="22">
          LIFT STATUS · CHECK LIVE ↗
        </text>
      </g>
      {liftStatuses.map(([shortName, x, y, fullName]) => (
        <a
          className="hirafu-lift-status-marker"
          href={liveStatusUrl}
          target="_blank"
          rel="noreferrer"
          key={fullName}
          aria-label={`查看 ${fullName} 官方即時狀態`}
        >
          <g transform={`translate(${x} ${y})`}>
            <title>{`${fullName} · open official live status`}</title>
            <circle r="7" />
            <rect x="10" y="-11" width="52" height="22" rx="8" />
            <text x="36" y="4" textAnchor="middle">
              {shortName}
            </text>
          </g>
        </a>
      ))}
      <g className="hirafu-zone-label" transform="translate(244 273)">
        <rect x="-72" y="-28" width="144" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          FAMILY ZONE
        </text>
        <text className="hirafu-label-sub" y="17" textAnchor="middle">
          BEGINNER · CRUISER
        </text>
      </g>
      <g className="hirafu-zone-label" transform="translate(559 258)">
        <rect x="-69" y="-28" width="138" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          KING BELL
        </text>
        <text className="hirafu-label-sub" y="17" textAnchor="middle">
          MID MOUNTAIN
        </text>
      </g>
      <g
        className="hirafu-zone-label is-hanazono"
        transform="translate(748 291)"
      >
        <rect x="-64" y="-28" width="128" height="56" rx="14" />
        <text y="-4" textAnchor="middle">
          HANAZONO
        </text>
        <text className="hirafu-label-sub" y="17" textAnchor="middle">
          LONG CRUISE
        </text>
      </g>
      <g className="hirafu-lodge" transform="translate(378 419)">
        <path d="M0 35V9L34-12 70 9v26M70 35V17L94 2l26 15v18" />
        <rect x="25" y="16" width="18" height="19" />
        <text x="59" y="52" textAnchor="middle">
          BASE · LODGE · RENTAL
        </text>
      </g>
      <g className="hirafu-title" transform="translate(20 20)">
        <rect width="325" height="82" rx="17" />
        <text x="18" y="30">
          GRAND HIRAFU
        </text>
        <text className="hirafu-title-sub" x="18" y="56">
          NISEKO · HIRAFU · HANAZONO
        </text>
      </g>
      <a
        className="hirafu-official-link"
        href="https://www.grand-hirafu.jp/datas/files/2026/06/12/9b2faed2f77b587ad6b631f8c874fd8d65d87722.pdf"
        target="_blank"
        rel="noreferrer"
      >
        <g transform="translate(653 472)">
          <rect width="224" height="30" rx="12" />
          <text x="112" y="20" textAnchor="middle">
            OPEN OFFICIAL COURSE GUIDE ↗
          </text>
        </g>
      </a>
    </svg>
  );
}

function CartoonTrailMap({ resort }) {
  if (resort === "藏王猿倉滑雪場")
    return <ZaoSarukuraTrailMap resort={resort} />;
  if (resort === "幌立滑雪場") return <HorotachiTrailMap resort={resort} />;
  if (resort === "かもい岳国際スキー場")
    return <KamoiTrailMap resort={resort} />;
  if (resort === "Niseko Tokyu Grand HIRAFU")
    return <NisekoUnitedOfficialMap />;
  if (resort === "Niseko Village")
    return <NisekoUnitedOfficialMap focus="village" />;
  if (resort === "Niseko Annupuri")
    return <NisekoUnitedOfficialMap focus="annupuri" />;
  if (resort === "Niseko Hanazono")
    return <NisekoUnitedOfficialMap focus="hanazono" />;
  if (resort === "Niseko Moiwa") return <NisekoMoiwaTrailMap resort={resort} />;
  if (resort === "Santa Present Park")
    return <SantaPresentTrailMap resort={resort} />;
  if (resort === "Fu's Snow Area") return <FusTrailMap resort={resort} />;
  if (resort === "大雪山層雲峽黑岳滑雪場")
    return <KurodakeTrailMap resort={resort} />;
  if (resort === "町營中山滑雪場") return <NakayamaTrailMap resort={resort} />;
  if (resort === "Canmore Ski Village")
    return <CanmoreTrailMap resort={resort} />;
  if (resort === "旭岳 Ropeway 滑雪路線")
    return <AsahidakeTrailMap resort={resort} />;
  if (resort === "富良野滑雪場") return <FuranoTrailMap resort={resort} />;
  if (resort === "暑寒別岳滑雪場")
    return <ShokanbetsuTrailMap resort={resort} />;
  if (resort === "當麻山滑雪場") return <TohmaTrailMap resort={resort} />;
  if (resort === "Kamui Ski Links") return <KamuiTrailMap resort={resort} />;
  if (resort === "Snow Cruise Onze") return <OnzeTrailMap resort={resort} />;
  if (resort === "朝里川溫泉滑雪場") return <AsariTrailMap resort={resort} />;
  if (resort === "小樽天狗山滑雪場")
    return <TenguyamaTrailMap resort={resort} />;
  if (resort === "札幌手稻滑雪場") return <TeineTrailMap resort={resort} />;
  if (resort === "札幌國際滑雪場") return <KokusaiTrailMap resort={resort} />;
  if (resort === "札幌盤溪滑雪場") return <BankeiTrailMap resort={resort} />;
  if (resort === "札幌藻岩山滑雪場") return <MoiwaTrailMap resort={resort} />;
  if (resort === "伊ノ沢市民スキー場") return <InosawaTrailMap resort={resort} />;
  const profile = trailMapProfiles[resort];
  return <ProfiledTrailMap resort={resort} profile={profile} />;
}

export default CartoonTrailMap;
