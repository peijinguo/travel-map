import kitchen from "../assets/wishlist-bg-kitchen.webp";

// The kitchen picture behind 想吃清單, filling the screen under the header,
// with a little life added on top (see _wishlist.scss): snow falls outside
// the windows, the street lamps slowly brighten and dim, and steam drifts up
// from the food. Everything is placed in the picture's own pixels (1670 x 942).
const W = 1670;
const H = 942;
const pct = (value, total) => `${(value / total) * 100}%`;

// The glass of the big window and of the door, as polygons in picture pixels;
// the window stops above the tables standing in front of it.
const WINDOWS = [
  [[30, 110], [400, 182], [400, 515], [30, 620]],
  [[1372, 335], [1562, 330], [1562, 705], [1380, 618]],
];

// Street lamps outside: centre and glow radius.
const LAMPS = [
  { x: 128, y: 415, r: 66, delay: 0 },
  { x: 315, y: 435, r: 38, delay: -2.1 },
  { x: 393, y: 420, r: 30, delay: -4.3 },
];

// Where steam rises: the top of each hot dish.
const STEAM = [
  { x: 470, y: 508 },
  { x: 975, y: 475 },
  { x: 1065, y: 482 },
  { x: 940, y: 398 },
  { x: 1015, y: 388 },
  { x: 232, y: 628 },
];

// A fixed pseudo-random snowfall for each window, the same on every render.
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

function WindowSnow({ points, count, seed }) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const clip = points.map(([x, y]) => `${pct(x - x0, x1 - x0)} ${pct(y - y0, y1 - y0)}`).join(", ");
  return (
    <div
      className="wishlist-scene-window"
      style={{
        left: pct(x0, W),
        top: pct(y0, H),
        width: pct(x1 - x0, W),
        height: pct(y1 - y0, H),
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
      <div className="wishlist-scene-art">
        <img className="wishlist-scene-bg" src={kitchen} alt="" />
        {WINDOWS.map((points, index) => (
          <WindowSnow key={index} points={points} count={index ? 10 : 34} seed={index * 7} />
        ))}
        {LAMPS.map((lamp, index) => (
          <span
            key={index}
            className="wishlist-scene-lamp"
            style={{
              left: pct(lamp.x - lamp.r, W),
              top: pct(lamp.y - lamp.r, H),
              width: pct(lamp.r * 2, W),
              animationDelay: `${lamp.delay}s`,
            }}
          />
        ))}
        {STEAM.map((steam, index) => (
          <span
            key={index}
            className="wishlist-scene-steam"
            style={{ left: pct(steam.x, W), top: pct(steam.y, H), "--d": `${-index * 0.7}s` }}
          >
            <i />
            <i />
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}

export default WishlistScene;
