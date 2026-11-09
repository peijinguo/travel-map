import skyRight from "../assets/prep-bg-sky-right.webp";
import slopesLeft from "../assets/prep-bg-slopes-left.webp";
import slopesRight from "../assets/prep-bg-slopes-right.webp";
import gondola from "../assets/prep-gondola.webp";
import smoke from "../assets/prep-smoke.webp";
import snowflake from "../assets/prep-snowflake.webp";

// The faint pencil snow scene behind the 行前準備 card. The picture is cut
// into its four corners; the gondolas, the chimney smoke and the snowflakes
// were lifted out of it and are animated on top (see _prep.scss).

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

function PrepScene() {
  return (
    <div className="prep-scene" aria-hidden="true">
      <div className="prep-scene-piece is-sky-right">
        <img className="prep-scene-art" src={skyRight} alt="" />
        <div className="prep-gondola-track">
          <span className="prep-gondola-car">
            <img src={gondola} alt="" />
          </span>
          <span className="prep-gondola-car is-second">
            <img src={gondola} alt="" />
          </span>
        </div>
      </div>
      <div className="prep-scene-piece is-slopes-left">
        <img className="prep-scene-art" src={slopesLeft} alt="" />
      </div>
      <div className="prep-scene-piece is-slopes-right">
        <img className="prep-scene-art" src={slopesRight} alt="" />
        <img className="prep-smoke" src={smoke} alt="" />
        <img className="prep-smoke is-second" src={smoke} alt="" />
      </div>
      <div className="prep-snow">
        {FLAKES.map((flake, index) => (
          <span
            key={index}
            className="prep-flake"
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

export default PrepScene;
