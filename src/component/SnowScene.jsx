import snowflake from "../assets/prep-snowflake.webp";
import "../assets/pages/_snow-scene.scss";

// A faint pencil snow scene fixed behind a page's content, with falling snow.
// Pages pass their picture pieces (and anything animated on them) as
// children: <SnowScenePiece corner="bottom-left" width={835}>…</SnowScenePiece>.

// A heavy snowfall, laid out by a fixed pseudo-random sequence so it looks the
// same on every render. left: % of the screen width, size: px, fall and
// delay: seconds; every third flake is a drawn snowflake, the rest are dots.
const FLAKE_COUNT = 60;
const FLAKES = Array.from({ length: FLAKE_COUNT }, (_, index) => {
  const r = (n) => (Math.sin((index + 1) * n) * 10000) % 1;
  const rand = (n) => Math.abs(r(n));
  const icon = index % 3 === 0;
  return {
    left: Math.round(rand(12.9898) * 1000) / 10,
    size: Math.round(icon ? 14 + rand(78.233) * 10 : 5 + rand(39.346) * 5),
    fall: Math.round((8 + rand(4.123) * 8) * 10) / 10,
    delay: Math.round(rand(93.989) * 160) / 10,
    icon,
  };
});

// One corner of the picture. `width` is the piece's width in the picture's own
// pixels, so overlays inside it can be placed with calc(var(--u) * px). A
// piece drawn as inline SVG passes it as children and no `src`.
export function SnowScenePiece({ corner, width, src, children }) {
  return (
    <div className={`snow-scene-piece is-${corner}`} style={{ "--piece-w": width }}>
      {src && <img className="snow-scene-art" src={src} alt="" />}
      {children}
    </div>
  );
}

function SnowScene({ children }) {
  return (
    <div className="snow-scene" aria-hidden="true">
      {children}
      <div className="snow-scene-snow">
        {FLAKES.map((flake, index) => (
          <span
            key={index}
            className="snow-scene-flake"
            style={{
              left: `${flake.left}%`,
              "--size": `${flake.size}px`,
              animationDuration: `${flake.fall}s`,
              // Negative delays start each flake part-way down, so the screen
              // is already snowing when the page opens.
              animationDelay: `${-flake.delay}s`,
            }}
          >
            {flake.icon ? <img src={snowflake} alt="" /> : <i />}
          </span>
        ))}
      </div>
    </div>
  );
}

export default SnowScene;
