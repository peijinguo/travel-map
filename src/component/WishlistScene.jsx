import wide from "../assets/wishlist-bg-wide.webp";
import tall from "../assets/wishlist-bg-tall.webp";

// The picture behind 想吃清單 (coffee and cakes on a table by the snowy sea),
// filling the screen under the header, with snow falling over the sky and the
// sea (see _wishlist.scss). A landscape screen gets the wide picture, a
// portrait one (a phone) the tall one.
//
// Each picture's snow area is a polygon in its own pixels: everything above
// the table, stepping around the latte glass that stands up into the view.
const SCENES = [
  {
    name: "wide",
    src: wide,
    w: 1999,
    h: 1125,
    snow: [[0, 0], [1999, 0], [1999, 903], [1080, 903], [1080, 722], [925, 722], [925, 903], [0, 903]],
    count: 140,
  },
  {
    name: "tall",
    src: tall,
    w: 633,
    h: 1125,
    snow: [[0, 0], [633, 0], [633, 842], [360, 842], [360, 752], [262, 752], [262, 842], [0, 842]],
    count: 90,
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
          <Snow points={scene.snow} w={scene.w} h={scene.h} count={scene.count} seed={index * 7} />
        </div>
      ))}
    </div>
  );
}

export default WishlistScene;
