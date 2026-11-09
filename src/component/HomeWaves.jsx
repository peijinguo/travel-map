import background from "../assets/home-bg-waves.webp";
import WAVES from "./homeWaves.json";

// The sea behind the home map: the wave picture with its white crests and
// ripples lifted out, so they can drift on their own (see _home.scss). Boxes in
// homeWaves.json are [x0, y0, x1, y1] in the picture's pixels.
const SPRITES = import.meta.glob("../assets/home-wave-*.webp", {
  eager: true,
  import: "default",
});

const pct = (value, total) => `${(value / total) * 100}%`;

function HomeWaves() {
  const { w, h, waves } = WAVES;
  return (
    <div className="home-waves" aria-hidden="true">
      <div className="home-waves-art">
        <img className="home-waves-bg" src={background} alt="" />
        {waves.map(({ file, kind, box: [x0, y0, x1] }, index) => (
          <img
            key={file}
            className={`home-wave is-${kind}`}
            src={SPRITES[`../assets/${file}.webp`]}
            alt=""
            style={{
              left: pct(x0, w),
              top: pct(y0, h),
              width: pct(x1 - x0, w),
              // Spread the waves out so they never move in step.
              animationDelay: `${-((index * 1.7) % 6)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default HomeWaves;
