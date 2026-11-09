import skyLeft from "../assets/prep-bg-sky-left.webp";
import skyRight from "../assets/prep-bg-sky-right.webp";
import slopesLeft from "../assets/prep-bg-slopes-left.webp";
import slopesRight from "../assets/prep-bg-slopes-right.webp";
import gondola from "../assets/prep-gondola.webp";
import smoke from "../assets/prep-smoke.webp";
import snowflake from "../assets/prep-snowflake.webp";

// The faint pencil snow scene behind the 行前準備 card. The picture is cut
// into its four corners; the gondolas, the chimney smoke and the snowflakes
// were lifted out of it and are animated on top (see _prep.scss).

// Fixed, hand-picked flakes so the snowfall looks the same on every render.
// left: % of the screen width, size: px, fall: seconds, delay: seconds.
const FLAKES = [
  { left: 3, size: 16, fall: 15, delay: 0, icon: true },
  { left: 9, size: 5, fall: 11, delay: 4 },
  { left: 14, size: 7, fall: 13, delay: 9 },
  { left: 19, size: 12, fall: 17, delay: 6, icon: true },
  { left: 24, size: 4, fall: 10, delay: 1 },
  { left: 29, size: 6, fall: 14, delay: 11 },
  { left: 34, size: 14, fall: 16, delay: 3, icon: true },
  { left: 39, size: 5, fall: 12, delay: 7 },
  { left: 45, size: 7, fall: 15, delay: 13 },
  { left: 50, size: 11, fall: 18, delay: 9, icon: true },
  { left: 55, size: 4, fall: 11, delay: 2 },
  { left: 60, size: 6, fall: 13, delay: 5 },
  { left: 65, size: 15, fall: 16, delay: 12, icon: true },
  { left: 70, size: 5, fall: 10, delay: 8 },
  { left: 75, size: 7, fall: 14, delay: 0 },
  { left: 80, size: 12, fall: 17, delay: 4, icon: true },
  { left: 85, size: 4, fall: 12, delay: 10 },
  { left: 90, size: 6, fall: 13, delay: 3 },
  { left: 95, size: 16, fall: 15, delay: 7, icon: true },
  { left: 7, size: 6, fall: 16, delay: 12 },
  { left: 43, size: 5, fall: 14, delay: 15 },
  { left: 72, size: 13, fall: 19, delay: 14, icon: true },
  { left: 88, size: 5, fall: 11, delay: 6 },
  { left: 27, size: 10, fall: 18, delay: 16, icon: true },
];

function PrepScene() {
  return (
    <div className="prep-scene" aria-hidden="true">
      <div className="prep-scene-piece is-sky-left">
        <img className="prep-scene-art" src={skyLeft} alt="" />
      </div>
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
