import wide from "../assets/wishlist-bg-wide.webp";
import tall from "../assets/wishlist-bg-tall.webp";

// The picture behind 想吃清單 (coffee and cakes on a table by the snowy sea),
// filling the screen under the header, with snow falling over the sky and the
// sea (see _wishlist.scss), and the sea itself rippling. A landscape screen gets the wide picture, a
// portrait one (a phone) the tall one.
//
// Each picture's snow area is a polygon in its own pixels: everything above
// the table, stepping around the latte glass that stands up into the view.
// The sea is the band of open water between the horizon and the railing,
// [top, bottom] in the picture's pixels, which ripples (see Sea below).
const SCENES = [
  {
    name: "wide",
    src: wide,
    w: 1999,
    h: 1125,
    snow: [[0, 0], [1999, 0], [1999, 903], [1080, 903], [1080, 722], [925, 722], [925, 903], [0, 903]],
    count: 140,
    sea: [598, 674],
  },
  {
    name: "tall",
    src: tall,
    w: 633,
    h: 1125,
    snow: [[0, 0], [633, 0], [633, 842], [360, 842], [360, 752], [262, 752], [262, 842], [0, 842]],
    count: 90,
    sea: [616, 668],
  },
];

const pct = (value, total) => `${(value / total) * 100}%`;

// A fixed pseudo-random snowfall, the same on every render.
const flakes = (count, seed) =>
  Array.from({ length: count }, (_, index) => {
    const rand = (n) => Math.abs((Math.sin((index + 1) * n + seed) * 10000) % 1);
    return {
      left: Math.round(rand(12.9898) * 1000) / 10,
      size: Math.round(3 + rand(39.346) * 4),
      fall: Math.round((6 + rand(4.123) * 6) * 10) / 10,
      delay: Math.round(rand(93.989) * 120) / 10,
    };
  });

function Snow({ points, w, h, count, seed }) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const clip = points.map(([x, y]) => `${pct(x - x0, x1 - x0)} ${pct(y - y0, y1 - y0)}`).join(", ");
  return (
    <div
      className="wishlist-scene-window"
      style={{
        left: pct(x0, w),
        top: pct(y0, h),
        width: pct(x1 - x0, w),
        height: pct(y1 - y0, h),
        clipPath: `polygon(${clip})`,
      }}
    >
      {flakes(count, seed).map((flake, index) => (
        <i
          key={index}
          style={{
            left: `${flake.left}%`,
            width: flake.size,
            height: flake.size,
            animationDuration: `${flake.fall}s, ${(flake.fall / 3).toFixed(1)}s`,
            animationDelay: `${-flake.delay}s, ${-flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// The sea band redrawn through a ripple pattern that sways slowly sideways and
// bobs up and down, like a gentle swell, instead of changing shape. The
// pattern is drawn wider and taller than the band so its edges never show.
const EASE = ".45 0 .55 1;.45 0 .55 1";
function Sea({ src, w, h, sea: [top, bottom], id }) {
  const pad = 120;
  const region = { x: -pad, y: top - pad / 2, width: w + pad * 2, height: bottom - top + pad };
  return (
    <svg className="wishlist-scene-sea" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <filter id={`${id}-ripple`} {...region} filterUnits="userSpaceOnUse">
          <feTurbulence {...region} type="fractalNoise" baseFrequency="0.0035 0.06" numOctaves="2" seed="3" result="noise" />
          <feOffset in="noise" result="swell">
            <animate attributeName="dx" dur="18s" repeatCount="indefinite" values="0;-90;0" calcMode="spline" keyTimes="0;.5;1" keySplines={EASE} />
            <animate attributeName="dy" dur="6s" repeatCount="indefinite" values="0;12;0" calcMode="spline" keyTimes="0;.5;1" keySplines={EASE} />
          </feOffset>
          <feDisplacementMap in="SourceGraphic" in2="swell" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <clipPath id={`${id}-band`}>
          <rect x="0" y={top} width={w} height={bottom - top} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-band)`}>
        <image href={src} width={w} height={h} filter={`url(#${id}-ripple)`} />
      </g>
    </svg>
  );
}

function WishlistScene() {
  return (
    <div className="wishlist-scene" aria-hidden="true">
      {SCENES.map((scene, index) => (
        <div
          key={scene.name}
          className={`wishlist-scene-art is-${scene.name}`}
          style={{ "--ratio": scene.w / scene.h }}
        >
          <img className="wishlist-scene-bg" src={scene.src} alt="" />
          <Sea src={scene.src} w={scene.w} h={scene.h} sea={scene.sea} id={`wishlist-sea-${scene.name}`} />
          <Snow points={scene.snow} w={scene.w} h={scene.h} count={scene.count} seed={index * 7} />
        </div>
      ))}
    </div>
  );
}

export default WishlistScene;
