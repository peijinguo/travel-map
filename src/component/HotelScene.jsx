import SnowScene, { SnowScenePiece } from "./SnowScene";
import hotelLeft from "../assets/hotel-bg-left.webp";
import hotelRight from "../assets/hotel-bg-right.webp";
import stag from "../assets/hotel-deer-stag.webp";
import stagBody from "../assets/hotel-deer-stag-body.webp";
import fawnLeft from "../assets/hotel-deer-fawn-left.webp";
import fawnLeftBody from "../assets/hotel-deer-fawn-left-body.webp";
import fawnRight from "../assets/hotel-deer-fawn-right.webp";
import fawnRightBody from "../assets/hotel-deer-fawn-right-body.webp";
import PARTS from "./hotelDeerParts.json";

// The snow scene behind 住宿資訊: the three deer were lifted out of the
// picture and walk about on their own (see _hotel.scss); SnowScene adds the
// snowfall.
//
// Each deer is its body (ears, tail and legs erased) over copies of the whole
// deer clipped to one part each, so a part can turn about its joint. The parts
// sit behind the body, which hides the seams at the joints. Boxes in
// hotelDeerParts.json are [x0, y0, x1, y1, pivotX, pivotY] in sprite pixels.
const SPRITES = {
  stag: { full: stag, body: stagBody },
  fawnLeft: { full: fawnLeft, body: fawnLeftBody },
  fawnRight: { full: fawnRight, body: fawnRightBody },
};

const pct = (value, total) => `${(value / total) * 100}%`;

function DeerPart({ src, deer, box, pivot, className }) {
  const [x0, y0, x1, y1] = box;
  const { w, h } = deer;
  return (
    <img
      className={`hotel-deer-part ${className}`}
      src={src}
      alt=""
      style={{
        clipPath: `inset(${pct(y0, h)} ${pct(w - x1, w)} ${pct(h - y1, h)} ${pct(x0, w)})`,
        transformOrigin: `${pct(pivot[0], w)} ${pct(pivot[1], h)}`,
      }}
    />
  );
}

// The deer is drawn twice, once mirrored; turning round crossfades the two
// while each narrows as if seen end-on, so it never thins to a paper edge.
function Deer({ name, className }) {
  return (
    <span className={`hotel-deer ${className}`}>
      <span className="hotel-deer-face is-front">
        <DeerFigure name={name} />
      </span>
      <span className="hotel-deer-face is-back">
        <DeerFigure name={name} />
      </span>
    </span>
  );
}

function DeerFigure({ name }) {
  const deer = PARTS[name];
  const { full, body } = SPRITES[name];
  return (
    <span className="hotel-deer-figure">
      {deer.legs.map(([x0, x1], index) => (
        <DeerPart
          key={`leg${index}`}
          src={full}
          deer={deer}
          box={[x0, deer.belly - 4, x1, deer.h]}
          pivot={[(x0 + x1) / 2, deer.belly]}
          className={`is-leg is-leg-${index + 1}`}
        />
      ))}
      <DeerPart
        src={full}
        deer={deer}
        box={deer.tail}
        pivot={deer.tail.slice(4)}
        className="is-tail"
      />
      {deer.ears.map((ear, index) => (
        <DeerPart
          key={`ear${index}`}
          src={full}
          deer={deer}
          box={ear}
          pivot={ear.slice(4)}
          className={`is-ear is-ear-${index + 1}`}
        />
      ))}
      <img className="hotel-deer-body" src={body} alt="" />
    </span>
  );
}

function HotelScene() {
  return (
    <SnowScene>
      <SnowScenePiece corner="bottom-left" width={835} src={hotelLeft}>
        <Deer name="stag" className="is-stag" />
        <Deer name="fawnLeft" className="is-fawn-left" />
      </SnowScenePiece>
      <SnowScenePiece corner="bottom-right" width={836} src={hotelRight}>
        <Deer name="fawnRight" className="is-fawn-right" />
      </SnowScenePiece>
    </SnowScene>
  );
}

export default HotelScene;
