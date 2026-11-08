# Filling in stops the planner couldn't locate

When the free maps can't find a stop, the planner page queues its name in
Firebase. An hourly cloud job follows these steps to add each one to the
built-in places (`namedPlaces` in `src/views/frontend/Planner.jsx`, search
`id: "hakodate-onuma-prince-hotel"` for a recent example), so the next press
of ⌖ on that stop finds it.

## 1. Read the queue

```bash
python scripts/unlocated_places.py list
```

Prints `{key: {query, text, attempts}}`. `query` is the stop's first line (the
part the planner matches), `text` the whole stop. Empty `{}` → stop, nothing to do.

Skip (and `remove`) entries that are not a place: times, notes, a bare city
or region already handled, test strings. Skip entries with `attempts >= 3`
(leave them; the user will see them stay unlocated).

## 2. Find each place

Most stops are in Japan (Hokkaido trips: 函館, 大沼, 札幌, 小樽, ニセコ…); a few
are in Taiwan. Use the other stops in `text` and nearby places already in
`namedPlaces` to pick the right town when a name is ambiguous.

1. Web-search the shop/place name (Japanese and the area) for its address
   (Tabelog, Mapple, the official site, Jalan, Yahoo!ロコ, NAVITIME, Mapion).
2. Coordinates, best first:
   - A Mapcode found for it → `python scripts/mapcode.py "86 842 884*05"`.
   - OpenStreetMap: `https://photon.komoot.io/api/?q=<name>&limit=5`
     (coordinates are `[lon, lat]`; check the town matches).
   - The street address → GSI:
     `curl -s "https://msearch.gsi.go.jp/address-search/AddressSearch?q=<url-encoded address>"`
     (`[lon, lat]`; only use a result whose title has a 番地/号 number).
3. As soon as a place's coordinates are settled, write them back so any open
   planner page locates the stop immediately (its button shows 「定位中…」 until then):
   `python scripts/unlocated_places.py resolve <key> <lat> <lon> "<name>" "<address>"`
4. If two different candidates remain, or nothing reliable is found, run
   `python scripts/unlocated_places.py attempt <key>` and move on. Never guess.

## 3. Add the entry

Append to the end of `namedPlaces`:

```js
  {
    id: "<kebab-name>-<area>",
    name: "<name as the place writes it>",
    // <where the address and coordinates came from>
    latitude: 41.994023,
    longitude: 140.642065,
    displayName: "<prefecture + town + address>（<landmark or 中文 name if helpful>）",
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    cuisine: "<Japanese cuisine words>",   // eateries only
    aliases: [ ... ],
  },
```

- `types`: restaurant/food (+ `cuisine`) for eateries, `lodging` for hotels,
  `gas_station`, `car_rental`, `parking`, `park`, `tourist_attraction`…
- `aliases` must include the queued `query` **exactly as written** (matching
  ignores case, spaces and `・|,()_-`, but not other punctuation such as `.` or
  `;`), plus the usual spellings: Japanese name with/without spaces, with the
  area name before/after, the Chinese name, the English name.
- Don't add an alias so short or generic that it would capture other stops
  (e.g. just 「駐車場」 or 「ホテル」).
- If the place is already in `namedPlaces` under another alias, add the
  queued `query` to that entry's `aliases` instead of a new entry.

## 4. Check, commit, clear

1. `npm ci` (first time) and `npx vite build` must succeed.
2. Commit only `src/views/frontend/Planner.jsx`, one commit for the batch:
   `feat: auto-add <names> as named places [auto-place]`
   — the `[auto-place]` tag makes `.github/workflows/publish-auto-places.yml`
   publish the site. `git pull --rebase origin main`, then `git push origin main`.
3. Only after the push succeeds, remove the added and skipped keys:
   `python scripts/unlocated_places.py remove <keys>` (the new site build
   then locates those stops from `namedPlaces` itself).
4. Finish with one line per queued name: added (with address) / skipped / failed.
