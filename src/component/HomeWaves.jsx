import background from "../assets/home-bg-waves-pad.webp";
import WAVES from "./homeWaves.json";

// The sea behind the home map (see _home.scss). The wave picture is cut into
// narrow upright strips that rise and fall one after another, so its swells
// roll like real waves; the white crests and ripples were lifted out of the
// picture and ride the same swell, with light running along them. Boxes in
// homeWaves.json are [x0, y0, x1, y1] in the picture's pixels.
const SPRITES = import.meta.glob("../assets/home-wave-*.webp", {
  eager: true,
  import: "default",
});

const STRIPS = 48;
// Seconds for one rise and fall, and how many swells fit across the picture.
const SWELL_PERIOD = 6;
const SWELLS_ACROSS = 1.5;

const pct = (value, total) => `${(value / total) * 100}%`;
// A point x of the way across the picture (0-1) is this far into its swell,
// so the swell travels across the sea.
const swellDelay = (x) => `${-((x * SWELLS_ACROSS) % 1) * SWELL_PERIOD}s`;

function HomeWaves() {
  const { w, h, waves } = WAVES;
  return (
    <div className="home-waves" aria-hidden="true">
      <div className="home-waves-art">
        {Array.from({ length: STRIPS }, (_, index) => (
          <span
            key={index}
            className="home-sea-strip"
            style={{
              left: pct(index, STRIPS),
              backgroundImage: `url(${background})`,
              // Sized and placed against the whole picture (100cqw), so the
              // strips' 1px overlap does not stretch them.
              backgroundSize: "100cqw 100%",
              backgroundPosition: `calc(100cqw * ${-index / STRIPS}) 0`,
              animationDelay: swellDelay((index + 0.5) / STRIPS),
            }}
          />
        ))}
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
              // The light along each line starts at its own point; the line
              // rides the swell where its middle is.
              animationDelay: `${-((index * 1.7) % 6)}s, ${swellDelay((x0 + x1) / 2 / w)}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default HomeWaves;
