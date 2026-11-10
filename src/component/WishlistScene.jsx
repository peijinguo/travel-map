import kitchen from "../assets/wishlist-bg-kitchen.webp";

// The picture behind 想吃清單 (a café window over a snowy lake), filling the
// screen under the header, with snow falling outside the window (see
// _wishlist.scss). The scene can also light street lamps and steam dishes;
// this picture has none. Everything is placed in the picture's own pixels
// (2000 x 874).
const W = 2000;
const H = 874;
const pct = (value, total) => `${(value / total) * 100}%`;

// The glass of the big window and of the door, as polygons in picture pixels;
// the window stops above the tables standing in front of it.
// The window glass, stepping around the drinks and postcard that stand in
// front of it on the sill.
const WINDOWS = [
  [[45, 0], [1955, 0], [1955, 585], [1375, 585], [1375, 555], [1140, 555], [1140, 415], [775, 415], [775, 585], [45, 585]],
];

// Street lamps outside: centre and glow radius.
const LAMPS = [];

// Where steam rises: the top of each hot dish.
const STEAM = [];

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
          <WindowSnow key={index} points={points} count={index ? 10 : 70} seed={index * 7} />
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
