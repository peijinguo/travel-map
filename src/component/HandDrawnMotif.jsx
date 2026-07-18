const motifColors = {
  mountain: "#78aeca", yotei: "#78aeca", lantern: "#e87543", clock: "#d9a24f", tvTower: "#d95743", apple: "#9ac65c", cherry: "#c54f72",
  watermelon: "#71a85d", bear: "#c99867", penguin: "#76abc8", camera: "#a97852", ropeway: "#dc6b45", kamikawaRopeway: "#55aaa6", glass: "#76c5d7",
  lavender: "#8f78ba", tree: "#72a269", birch: "#85ae77", rice: "#d2a548", koshihikari: "#d9aa43", onigiri: "#f4efe1", horse: "#b7835e", hakuba: "#78aeca",
  onsen: "#64a9c2", monkey: "#c38a60", castle: "#d76d4d", snowpeak: "#7daac4",
  cow: "#f2d5a6", juhyo: "#a9d9e9", skier: "#e9704f", sakura: "#ef8fa7", yakeishi: "#7cacc5",
};

const motifs = {
  mountain: <><path d="M5 38 19 14l6 11 5-8 13 21"/><path d="m14 23 5-4 5 7 5-5 5 7"/><path d="M9 39c8-2 21 2 31-1"/></>,
  yotei: <><path className="yotei-mountain" d="M2 41c8-7 13-19 20-32 1-3 3-3 5 0 7 13 12 25 19 32z"/><path className="yotei-snow" d="M14 26c3-6 6-12 8-17 1-3 3-3 5 0 3 5 5 11 8 17l-6-4-4 5-5-5z"/><path className="yotei-ridges" d="M14 38c3-7 5-12 8-16M34 38c-3-7-5-12-7-16"/><path className="yotei-forest" d="m5 41 4-8 4 8m21 0 4-9 5 9M15 41l3-6 3 6"/><path className="yotei-ground" d="M2 42c12-2 31 2 44-1"/></>,
  lantern: <><path d="M17 8h14M15 13h18l-2 26H17z"/><path d="M19 18h10M18 24h12M18 30h12M21 8c0-5 6-5 6 0"/><path d="M21 39h6"/></>,
  clock: <><path d="M12 40h24M15 40V15h18v25M12 15h24L24 6z"/><circle cx="24" cy="23" r="6"/><path d="M24 19v4l3 2M20 40V32h8v8"/></>,
  tvTower: <><path className="tv-tower-antenna" d="M24 2v12M20 7h8M21 11h6"/><circle className="tv-tower-tip" cx="24" cy="2.5" r="1.8"/><path className="tv-tower-deck" d="M15 14h18c2 0 3 1 3 3l2 5-4 6H14l-4-6 2-5c0-2 1-3 3-3z"/><path className="tv-tower-snow" d="M12 17c3-2 5 1 8-1 3-2 5 1 8-1 3-1 5 1 7 0"/><rect className="tv-tower-clock" x="19" y="18" width="10" height="7" rx="2"/><path className="tv-tower-clock-hands" d="M24 19.5v2.5l2 1"/><path className="tv-tower-frame" d="M18 28C17 34 14 40 11 45M30 28c1 6 4 12 7 17M15 35h18M12 42h24M18 29l14 13M30 29 16 42M8 45h32"/><path className="tv-tower-brace" d="M21 28h6M24 28v17"/><circle className="tv-tower-light" cx="14" cy="33" r="1.3"/><circle className="tv-tower-light" cx="34" cy="39" r="1.3"/></>,
  apple: <><path className="apple-fruit" d="M24 16c-9-7-17 1-15 11 2 12 11 15 15 11 4 4 13 1 15-11 2-10-6-18-15-11z"/><path className="apple-stem" d="M24 16c0-5 2-8 5-10"/><path className="apple-leaf" d="M25 11c4-4 9-2 11 1-5 2-8 1-11-1z"/><path className="apple-highlight" d="M14 24c1-3 3-5 6-6"/></>,
  cherry: <><path className="cherry-stems" d="M16 29C17 18 22 10 29 6M33 28C31 18 30 11 29 6"/><path className="cherry-leaf" d="M29 8c4-6 11-5 14-1-5 4-10 4-14 1z"/><circle className="cherry-fruit" cx="15" cy="33" r="9"/><circle className="cherry-fruit" cx="34" cy="32" r="9"/><path className="cherry-highlight" d="M11 29c1-2 2-3 4-3M30 28c1-2 2-3 4-3"/>
  </>,
  watermelon: <><circle className="watermelon-whole" cx="22" cy="23" r="17"/><path className="watermelon-stripe" d="M22 6c-5 5-6 28 0 34M13 9c-4 8-3 22 2 28M31 9c4 8 3 22-2 28"/><path className="watermelon-slice" d="m24 25 20 4-13 15z"/><path className="watermelon-rind" d="m24 25 20 4-2 3-18-4z"/><path className="watermelon-seeds" d="m31 31 1 2m5-1 1 2m-6 4 1 1"/></>,
  bear: <><circle cx="15" cy="15" r="5"/><circle cx="33" cy="15" r="5"/><path d="M13 29c0-11 5-17 11-17s11 6 11 17c0 9-5 13-11 13s-11-4-11-13z"/><circle cx="20" cy="25" r="1"/><circle cx="28" cy="25" r="1"/><path d="M21 31c2 2 4 2 6 0"/></>,
  penguin: <><path d="M14 28c0-12 4-21 10-21s10 9 10 21c0 10-4 15-10 15S14 38 14 28z"/><path className="penguin-belly" d="M18 29c0-8 2-13 6-13s6 5 6 13c0 7-2 10-6 10s-6-3-6-10z"/><path d="m15 23-6 8 7-2M33 23l6 8-7-2"/><circle className="penguin-eye" cx="20.5" cy="15" r="1.2"/><circle className="penguin-eye" cx="27.5" cy="15" r="1.2"/><path className="penguin-beak" d="m21 19 3-2 3 2-3 3z"/><path className="penguin-feet" d="m20 42-4 3h7M28 42l4 3h-7"/></>,
  camera: <><path className="camera-body" d="M8 17h8l3-5h10l3 5h7c2 0 3 2 3 4v16c0 3-1 4-4 4H10c-3 0-4-1-4-4V21c0-2 1-4 2-4z"/><path className="camera-leather" d="M7 22h34v13H7z"/><path className="camera-top" d="M11 17v-4h6v4M34 20h4"/><circle className="camera-lens" cx="24" cy="29" r="9"/><circle className="camera-lens-glow" cx="24" cy="29" r="6"/><circle className="camera-shutter" cx="35" cy="14" r="2"/></>,
  ropeway: <><path d="M5 11c12 3 26 2 38-2M22 13l-2 8M28 12l2 9"/><path d="M14 21h20l-2 15H16zM18 26h12M24 26v10"/><path d="M9 41 19 30l5 7 5-5 10 9"/></>,
  kamikawaRopeway: <><path className="kamikawa-mountains" d="M2 42 12 29l6 7 8-14 7 10 5-6 8 16z"/><path className="kamikawa-snow" d="m8 34 4-5 6 7 8-14 7 10 5-6 3 7-8 3-7-7-7 10-6-5z"/><path className="kamikawa-cable" d="M4 9c13 3 27 3 40-1"/><path className="kamikawa-hangers" d="M20 12v7M29 11v8"/><path className="kamikawa-cabin" d="M14 19h21c2 0 3 2 3 4l-2 13c0 3-2 4-5 4H18c-3 0-5-1-5-4l-2-13c0-2 1-4 3-4z"/><path className="kamikawa-cabin-snow" d="M13 22c4-3 7 1 11-1 4-2 7 1 11-1"/><path className="kamikawa-window" d="M17 25h6v7h-6zM26 25h6v7h-6z"/><circle className="kamikawa-lamp" cx="24.5" cy="36" r="1.5"/></>,
  glass: <><path className="glass-vase" d="M18 7h12l-2 8c7 6 9 17 5 25-5 4-13 4-18 0-4-8-2-19 5-25z"/><path className="glass-highlight" d="M21 11c-1 9-5 14-3 24M25 16c6 4 8 9 7 15"/><path className="glass-swirl" d="M15 30c5-6 12-7 19-2M16 36c6-4 12-3 17 1"/><path className="glass-sparkle" d="M8 11v8M4 15h8M39 7v6M36 10h6"/></>,
  lavender: <><path className="lavender-stem" d="M25 45c-1-8 0-15-1-22M23 34c-7-1-10-5-10-9 6 0 10 3 10 9zM26 38c7-1 10-5 10-9-6 0-10 3-10 9zM23 42c-5 0-8-2-9-5 5-1 8 1 9 5z"/><g className="lavender-blooms"><path d="M24 3c-4 2-4 6 0 8 4-2 4-6 0-8z"/><path d="M22 8c-5-1-8 2-6 6 4 2 7-1 6-6zM26 8c5-1 8 2 6 6-4 2-7-1-6-6z"/><path d="M22 13c-6-1-9 2-7 7 5 2 8-1 7-7zM26 13c6-1 9 2 7 7-5 2-8-1-7-7z"/><path d="M22 19c-5-1-8 2-6 6 4 2 7-1 6-6zM26 19c5-1 8 2 6 6-4 2-7-1-6-6z"/><path d="M24 23c-4 1-5 5-2 7 4 0 5-4 2-7z"/></g><path className="lavender-highlight" d="M21 10l1-1M19 17l1-1M28 14l1-1"/><g className="lavender-bow"><path d="M23 42c-4-4-7-3-7 0s3 4 7 1M25 42c4-4 7-3 7 0s-3 4-7 1"/><path d="M24 41v5"/></g></>,
  tree: <><path d="m24 5-9 12h6L12 29h8L9 41h30L28 29h8l-9-12h6zM24 41V46"/><path d="M8 12l3 3m0-3-3 3M38 8l3 3m0-3-3 3"/></>,
  birch: <><path className="birch-canopy" d="M6 18c-3-5 1-10 6-8 1-6 8-7 11-2 3-5 11-3 11 3 6-2 10 4 7 9 4 4 0 9-5 8H11c-6 0-9-6-5-10z"/><path className="birch-trunks" d="M12 18 10 43h8l-1-25M23 16l-1 28h8l-2-28M35 18l-1 25h7l-2-25"/><path className="birch-marks" d="m12 25 5-2m-6 8 5 2m-5 5 5-2m8-13 5 2m-6 6 5-2m-5 8 6 2m6-14 5-2m-5 8 5 2m-6 6 5-2"/><path className="birch-snow" d="M5 44c10-3 27 2 39-1"/></>,
  rice: <><path d="M15 42c7-7 10-18 9-34M24 17c-7 0-9-5-8-9 6 1 8 4 8 9zM23 24c7 0 10-4 10-9-6 0-9 4-10 9zM21 31c-6-1-9-5-8-9 6 0 8 4 8 9zM18 37c7 0 11-3 12-8-6-1-10 3-12 8z"/></>,
  koshihikari: <><path className="rice-stalk" d="M34 43c-2-12-1-24 4-36M37 12c-5 0-7-3-6-6 4 0 6 2 6 6zM36 18c5 0 7-3 7-6-4 0-6 2-7 6zM34 24c-5 0-7-3-7-6 4 0 6 2 7 6zM34 30c5 0 8-3 8-6-4-1-7 2-8 6z"/><path className="rice-bowl" d="M6 27h28c-1 10-6 16-14 16S7 37 6 27z"/><path className="rice-mound" d="M8 27c1-8 6-13 12-13s11 5 12 13z"/><g className="rice-grains"><path d="m13 23 2-2M19 19l2-2M25 22l2-2M17 26l2-2M24 26l2-2"/></g></>,
  onigiri: <><path className="onigiri-rice" d="M6.5 34.5c1.8-6.2 7.4-17.9 11.6-24.7C19.7 7.2 21.4 6 24 6s4.3 1.2 5.9 3.8c4.2 6.8 9.8 18.5 11.6 24.7 1.6 5.5-1.9 9.1-7.5 9.1H14c-5.6 0-9.1-3.6-7.5-9.1z"/><path className="onigiri-nori" d="M16.5 31.5c4.7-1.4 10.3-1.4 15 0v12.1h-15z"/><circle className="onigiri-ume" cx="24" cy="17.5" r="3.8"/><path className="onigiri-ume-shine" d="M22.1 16.2c.7-.8 1.4-1.1 2.3-1"/><path className="onigiri-grains" d="m14 23 2-1.2m16 2.4 2 1M17 13.5l1.8 1M30 13.8l1.6-1.1M11.5 30l2 .2m21.5.1 2-.4"/></>,
  horse: <><path d="M12 39c2-8 1-17 8-22l-1-9 8 6 7-2-2 7c6 5 5 13-1 15-5 2-9-2-12 5z"/><path d="M21 18c3 5 7 7 13 7M28 19h1"/></>,
  onsen: <><path d="M7 33c9 4 25 4 34 0M9 39c8 3 22 3 30 0M15 27c-5-6 5-8 0-14M25 27c-5-6 5-8 0-14M35 27c-5-6 5-8 0-14"/></>,
  monkey: <><path className="monkey-body" d="M17 28c-2 4-3 10-1 15h16c2-5 1-11-1-15z"/><circle cx="13" cy="17" r="5"/><circle cx="35" cy="17" r="5"/><circle className="monkey-head" cx="24" cy="17" r="11"/><path className="monkey-face" d="M17 18c0-6 3-9 7-9s7 3 7 9c0 7-3 10-7 10s-7-3-7-10z"/><path d="M20 17h1M27 17h1M22 22c1 2 3 2 4 0M18 31l-7 8M30 31l7 8M19 43l-4 3M29 43l4 3"/><path className="monkey-tail" d="M31 34c9-4 12 1 9 5-3 5-9 2-7-2"/><circle className="monkey-cheek" cx="19" cy="21" r="1.8"/><circle className="monkey-cheek" cx="29" cy="21" r="1.8"/></>,
  castle: <><path d="M8 42h32M12 42V29h24v13M16 29v-9h16v9M20 20v-8h8v8M17 12h14l-4-5h-6z"/><path d="M9 29h30l-4-5H13zM13 20h22l-4-5H17zM22 42v-7h4v7"/></>,
  snowpeak: <><path d="M5 39 20 13l7 12 4-6 12 20"/><path d="m14 23 6-5 6 8 5-4 5 8M24 4v5M13 8l3 4M35 8l-3 4"/></>,
  cow: <><path className="cow-head" d="M11 19c2-7 7-11 13-11s11 4 13 11v14c-2 8-7 12-13 12s-11-4-13-12z"/><path className="cow-ears" d="M12 19 4 14c0 6 3 10 8 10M36 19l8-5c0 6-3 10-8 10"/><path className="cow-horns" d="M15 13c-3-5-1-8 2-9M33 13c3-5 1-8-2-9"/><path className="cow-patch cow-patch-left" d="M12 18c2-5 5-8 10-9l1 9-5 5z"/><path className="cow-patch cow-patch-right" d="M29 10c4 2 7 5 8 10l-5 3-4-6z"/><circle className="cow-eye" cx="18" cy="23" r="1.4"/><circle className="cow-eye" cx="30" cy="23" r="1.4"/><path className="cow-muzzle" d="M15 31c0-5 4-7 9-7s9 2 9 7c0 6-4 9-9 9s-9-3-9-9z"/><circle className="cow-nostril" cx="20" cy="31" r="1.3"/><circle className="cow-nostril" cx="28" cy="31" r="1.3"/></>,
  juhyo: <><path d="M24 5c-3 2-4 5-3 8-5-2-8 3-5 7-6-1-8 6-3 9-5 3-2 9 3 9h16c5 0 8-6 3-9 5-3 3-10-3-9 3-4 0-9-5-7 1-3 0-6-3-8z"/><path d="M24 17v27M17 22l7 5 8-7M16 31l8 5 10-6M19 44h10"/></>,
  skier: <><circle cx="30" cy="9" r="4"/><path d="m27 14-7 9 8 6 7 10M20 23l-8-2M28 29l-10 10M9 43c10 2 22 2 32-2M14 17l-5 26M37 18l5 23"/></>,
  sakura: <><path d="M8 42c9-8 16-18 21-32M18 31c7 0 13 3 18 10M23 22c-5-1-9-4-12-8"/><path d="M29 13c-5-5 1-11 5-6 1-7 9-5 7 1 6-3 9 5 3 7 5 4-2 10-6 5-3 6-11 1-7-4-7 1-10-7-2-7zM16 15c-4-4 1-8 4-5 1-5 7-3 5 2 5-2 6 4 2 6 3 3-2 7-5 3-2 4-8 1-5-3-5 0-7-5-2-5z"/><circle cx="36" cy="13" r="1.5"/><circle cx="19" cy="16" r="1.2"/></>,
  yakeishi: <><path className="yakeishi-back" d="M1 39 9 27l6 5 8-13 6 8 6-11 12 23z"/><path className="yakeishi-front" d="M3 42 14 29l7 7 7-18 8 13 5-5 6 16z"/><path className="yakeishi-snow" d="m9 34 5-5 7 7 7-18 8 13 5-5 3 8-8 3-8-11-6 15-7-6z"/><path className="yakeishi-ridge" d="M4 42c12-2 28 2 42-1"/><path className="yakeishi-pines" d="m8 40 3-7 3 7M37 40l3-8 3 8"/></>,
  hakuba: <><path className="hakuba-mountain" d="M2 38 11 22l6 6L26 7l8 18 5-8 7 21z"/><path className="hakuba-snow" d="m7 30 4-8 6 6 9-21 8 18 5-8 3 9-8 6-8-12-7 13-6-6z"/><path className="hakuba-ground" d="M3 39c12-2 28 2 42-1"/></>,
};

function HandDrawnMotif({ type, className = "" }) {
  return (
    <svg
      className={`hand-motif motif-${type} ${className}`}
      x="-24"
      y="-24"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      style={{ "--motif-color": motifColors[type] ?? "#e87543" }}
      aria-hidden="true"
    >
      <g>{motifs[type] ?? motifs.snowpeak}</g>
    </svg>
  );
}

export default HandDrawnMotif;
