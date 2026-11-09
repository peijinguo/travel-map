import SnowScene, { SnowScenePiece } from "./SnowScene";
import hotelLeft from "../assets/hotel-bg-left.webp";
import hotelRight from "../assets/hotel-bg-right.webp";
import stag from "../assets/hotel-deer-stag.webp";
import fawnLeft from "../assets/hotel-deer-fawn-left.webp";
import fawnRight from "../assets/hotel-deer-fawn-right.webp";

// The snow scene behind 住宿資訊: the three deer were lifted out of the
// picture and move on their own (see _hotel.scss); SnowScene adds the snowfall.
function HotelScene() {
  return (
    <SnowScene>
      <SnowScenePiece corner="bottom-left" width={835} src={hotelLeft}>
        <img className="hotel-deer is-stag" src={stag} alt="" />
        <img className="hotel-deer is-fawn-left" src={fawnLeft} alt="" />
      </SnowScenePiece>
      <SnowScenePiece corner="bottom-right" width={836} src={hotelRight}>
        <span className="hotel-deer-walk">
          <img className="hotel-deer is-fawn-right" src={fawnRight} alt="" />
        </span>
      </SnowScenePiece>
    </SnowScene>
  );
}

export default HotelScene;
