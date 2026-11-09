import SnowScene, { SnowScenePiece } from "./SnowScene";

// The snow scene behind 住宿資訊, drawn in the same style as the home map's
// icons (flat colours, round dark outlines): snowy hills and pines with deer
// on the left, a lodge with a smoking chimney on the right. The deer flick
// their ears and wag their tails (see _hotel.scss); SnowScene adds the
// snowfall. Each piece is 840 x 560 picture units.

// A snowy pine, `s` times its 60 x 82 drawing, standing with its trunk's foot
// at (x, y).
function Pine({ x, y, s = 1 }) {
  return (
    <g className="hotel-pine" transform={`translate(${x - 30 * s} ${y - 82 * s}) scale(${s})`}>
      <path className="hotel-pine-trunk" d="M26 66h8v16h-8z" />
      <path className="hotel-pine-green" d="M30 0 45 22h-7l15 22h-8l14 24H1l14-24H7l15-22h-7z" />
      <path className="hotel-pine-snow" d="M30 0 40 15c-3 3-7 0-10 3-3-3-7 0-10-3zM15 22h30l3 4c-4 3-8 0-11 3-4-3-8 0-12-3-4 3-8 0-12-1zM7 44h46l3 4c-5 3-9 0-13 3-4-3-9 0-13-3-4 3-9 0-13-3-4 2-7 1-10-1z" />
    </g>
  );
}

// A snowy hill: its ridge line, filled down to the bottom of the picture.
function Hill({ className, ridge }) {
  return (
    <>
      <path className={`${className} hotel-hill-fill`} d={`${ridge}V580H-20z`} />
      <path className="hotel-hill-ridge" d={ridge} />
    </>
  );
}

// A deer facing right, `s` times its drawing, hooves at (x, y). The stag has
// antlers, the fawns spots; `flip` turns it to face left.
function Deer({ x, y, s = 1, stag = false, flip = false, className = "" }) {
  const t = `translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(-62 -116)`;
  return (
    <g className={`hotel-deer ${className}`} transform={t}>
      <g className="hotel-deer-tail">
        <path className="hotel-deer-light" d="M24 52c-8-6-14-4-13 3 1 6 7 7 14 4z" />
      </g>
      <path className="hotel-deer-coat" d="M29 74h9l-2 38h-7zM42 75h8l-1 37h-7zM78 74h8l-1 38h-7zM90 72h8l-2 40h-7z" />
      <path className="hotel-deer-hoof" d="M29 108h7v5h-7zM42 108h7v5h-7zM78 108h7v5h-7zM89 108h7v5h-7z" />
      <path className="hotel-deer-coat" d="M20 60c0-14 15-19 35-18 20 1 33 3 38 13l8-30c2-8 6-12 11-12l6 12-12 41c-2 10-12 17-36 17-30 0-50-4-50-23z" />
      <path className="hotel-deer-belly" d="M32 74c12 4 36 5 54-1-2 4-12 7-28 7-12 0-21-2-26-6z" />
      <g className="hotel-deer-ear">
        <path className="hotel-deer-coat" d="M107 15c-6-8-12-11-17-9 0 7 5 12 13 14z" />
        <path className="hotel-deer-inner" d="M104 15c-4-4-7-6-10-6 1 4 4 7 9 8z" />
      </g>
      <path className="hotel-deer-coat" d="M104 9c8-5 17-2 20 6 3 5 8 8 6 13-2 4-9 4-15 2-8-3-14-9-11-21z" />
      <circle className="hotel-deer-ink" cx="128" cy="26" r="3" />
      <circle className="hotel-deer-ink" cx="114" cy="16" r="2.2" />
      {stag ? (
        <path className="hotel-deer-antler" d="M110 7c-2-10-7-17-14-21m10 9c-5-1-9 1-11 5m21 4c3-10 8-15 15-18m-11 7c4 0 8 2 10 5" />
      ) : (
        <path className="hotel-deer-spots" d="M44 54h.1M56 50h.1M66 56h.1M50 62h.1M76 52h.1" />
      )}
    </g>
  );
}

function HotelScene() {
  return (
    <SnowScene>
      <SnowScenePiece corner="bottom-left" width={840}>
        <svg className="hotel-scene-art" viewBox="0 0 840 560" aria-hidden="true">
          <Hill className="hotel-hill-far" ridge="M-10 330c120-60 260-60 370-10 80 35 160 40 240 70 80 30 160 40 250 50" />
          <Pine x={70} y={350} s={1.9} />
          <Pine x={175} y={330} s={1.4} />
          <Pine x={430} y={360} s={1.1} />
          <Hill className="hotel-hill-near" ridge="M-10 430c110-35 240-35 340-5 100 30 230 45 370 55 60 4 110 10 150 20" />
          <Deer x={150} y={452} s={1.15} stag className="is-stag" />
          <Deer x={300} y={470} s={0.85} className="is-fawn-left" />
          <Pine x={560} y={492} s={0.9} />
        </svg>
      </SnowScenePiece>
      <SnowScenePiece corner="bottom-right" width={840}>
        <svg className="hotel-scene-art" viewBox="0 0 840 560" aria-hidden="true">
          <Hill className="hotel-hill-far" ridge="M-10 420c90-30 170-40 260-60 120-25 220-70 340-80 90-8 170 10 260 30" />
          <g className="hotel-lodge">
            <path className="hotel-lodge-chimney" d="M650 230h28v60h-28z" />
            <path className="hotel-lodge-wall" d="M520 300h220v120H520z" />
            <path className="hotel-lodge-roof" d="m500 310 130-90 130 90z" />
            <path className="hotel-lodge-snow" d="m500 310 130-90 130 90c-12 8-24-2-36 4-12-6-24 4-36-2-12 6-24-4-36 2-12-6-24 4-36-2-12 6-24-4-36 2-12-6-24 4-36-2-8 4-14 2-14-2zM646 228h36c2 6-4 10-10 8-6 4-14 2-16-2-6 2-12 0-10-6z" />
            <path className="hotel-lodge-window" d="M545 330h46v40h-46zM669 330h46v40h-46z" />
            <path className="hotel-lodge-frame" d="M568 330v40M545 350h46M692 330v40M669 350h46" />
            <path className="hotel-lodge-door" d="M606 344h48v76h-48z" />
            <circle className="hotel-deer-ink" cx="644" cy="384" r="3" />
          </g>
          <g className="hotel-smoke">
            <circle cx="664" cy="206" r="10" />
            <circle className="is-second" cx="664" cy="206" r="10" />
          </g>
          <Pine x={470} y={420} s={1.3} />
          <Pine x={790} y={410} s={1.5} />
          <Hill className="hotel-hill-near" ridge="M-10 470c120-25 250-35 380-30 140 5 260 25 380 20 40-2 70-6 100-10" />
          <Deer x={300} y={486} s={0.95} flip className="is-fawn-right" />
          <Pine x={120} y={480} s={1.0} />
        </svg>
      </SnowScenePiece>
    </SnowScene>
  );
}

export default HotelScene;
