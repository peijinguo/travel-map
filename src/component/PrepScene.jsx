import SnowScene, { SnowScenePiece } from "./SnowScene";
import skyRight from "../assets/prep-bg-sky-right.webp";
import slopesLeft from "../assets/prep-bg-slopes-left.webp";
import slopesRight from "../assets/prep-bg-slopes-right.webp";
import gondola from "../assets/prep-gondola.webp";
import smoke from "../assets/prep-smoke.webp";

// The snow scene behind the 行前準備 card: gondolas ride the cable and smoke
// rises from the chimney (see _prep.scss); SnowScene adds the snowfall.
function PrepScene() {
  return (
    <SnowScene>
      <SnowScenePiece corner="top-right" width={836} src={skyRight}>
        <div className="prep-gondola-track">
          <span className="prep-gondola-car">
            <img src={gondola} alt="" />
          </span>
          <span className="prep-gondola-car is-second">
            <img src={gondola} alt="" />
          </span>
        </div>
      </SnowScenePiece>
      <SnowScenePiece corner="bottom-left" width={836} src={slopesLeft} />
      <SnowScenePiece corner="bottom-right" width={836} src={slopesRight}>
        <img className="prep-smoke" src={smoke} alt="" />
        <img className="prep-smoke is-second" src={smoke} alt="" />
      </SnowScenePiece>
    </SnowScene>
  );
}

export default PrepScene;
