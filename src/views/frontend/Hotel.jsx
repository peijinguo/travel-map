import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../../assets/pages/_hotel.scss";

const LODGING_STORAGE_KEY = "yuki-tabi-lodgings-v1";
const PLANNER_STORAGE_KEY = "yuki-tabi-planner-days-v2";
const NON_LODGING_NAME_PATTERN = /滑雪場|滑雪场|スキー場|ski\s*(?:area|resort)/iu;
const CHECKOUT_PATTERN = /退房|退宿|チェック[\s-]*アウト|check[\s-]*out/iu;
const LODGING_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "hostel",
  "guest_house",
  "resort",
  "campground",
  "rv_park",
]);

const formatStayDate = (dateString, dayNumber) => {
  if (!dateString) return `入住日期尚未設定 DAY ${dayNumber ?? "?"}`;
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return `${dateString} DAY ${dayNumber ?? "?"}`;
  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(date);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日（${weekday}）DAY ${dayNumber ?? "?"} 入住`;
};

function loadLodgings() {
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    if (!Array.isArray(lodgings)) return [];

    const plannerDays = JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)) ?? [];
    const lodgingItems = Array.isArray(plannerDays)
      ? plannerDays.flatMap((day, dayIndex) => {
          const versions = Array.isArray(day.versions) && day.versions.length
            ? day.versions.map((version) => ({
                ...version,
                items:
                  version.id === day.activeVersionId
                    ? day.items
                    : version.items,
              }))
            : [{ id: "version-1", label: "版本 1", items: day.items ?? [] }];
          return versions.flatMap((version) =>
            (version.items ?? [])
              .filter(
                (item) =>
                  !CHECKOUT_PATTERN.test(item.text ?? "") &&
                  item.location &&
                  !NON_LODGING_NAME_PATTERN.test(item.location.name ?? "") &&
                  item.location.types?.some((type) => LODGING_TYPES.has(type)),
              )
              .map((item) => ({ item, day, dayIndex, version })),
          );
        })
      : [];
    const activeItemIds = new Set(
      lodgingItems.map(({ item }) => item.id),
    );
    const activeLocationIds = new Set(
      lodgingItems.map(({ item }) => item.location?.id).filter(Boolean),
    );

    const hotelLodgings = lodgings.filter(
      (lodging) =>
        !NON_LODGING_NAME_PATTERN.test(lodging.name ?? "") &&
        (lodging.stayItemId
          ? activeItemIds.has(lodging.stayItemId)
          : activeLocationIds.has(lodging.id)),
    );
    const rebuiltLodgings = lodgingItems.map(
      ({ item, day, dayIndex, version }) => ({
      id: item.location.id,
      name: item.location.name,
      displayName: item.location.displayName ?? item.location.name,
      website: item.location.website ?? "",
      stayDate: day.date ?? "",
      stayDayLabel: day.label ?? "",
      stayDayId: day.id ?? "",
      stayDayNumber: dayIndex + 1,
      stayVersionId: version.id,
      stayVersionLabel: version.label,
      stayItemId: item.id,
      updatedAt: Date.now(),
      }),
    );
    const rebuiltItemIds = new Set(
      rebuiltLodgings.map((lodging) => lodging.stayItemId),
    );
    const mergedLodgings = [
      ...rebuiltLodgings,
      ...hotelLodgings.filter(
        (lodging) => !rebuiltItemIds.has(lodging.stayItemId),
      ),
    ];
    localStorage.setItem(
      LODGING_STORAGE_KEY,
      JSON.stringify(mergedLodgings),
    );
    return mergedLodgings;
  } catch {
    return [];
  }
}

function Hotel() {
  const [lodgings, setLodgings] = useState(loadLodgings);
  const [searchParams] = useSearchParams();
  const selectedLodgingId = searchParams.get("lodging");
  const availableVersions = [
    ...new Set(lodgings.map((lodging) => lodging.stayVersionLabel ?? "版本 1")),
  ].sort((first, second) =>
    first.localeCompare(second, "zh-Hant", { numeric: true }),
  );
  const requestedVersion = searchParams.get("version");
  const selectedVersion = availableVersions.includes(requestedVersion)
    ? requestedVersion
    : availableVersions[0] ?? "版本 1";
  const versionLodgings = lodgings.filter(
    (lodging) => (lodging.stayVersionLabel ?? "版本 1") === selectedVersion,
  );
  const [selectedLodgingElement, setSelectedLodgingElement] = useState(null);
  const refreshLodgings = useCallback(() => setLodgings(loadLodgings()), []);
  const groupedLodgings = [...versionLodgings.reduce((groups, lodging) => {
    const key = lodging.id || `${lodging.name}::${lodging.displayName}`;
    const group = groups.get(key) ?? {
      ...lodging,
      stayDates: [],
      stayVersions: [],
      stayEntries: [],
    };
    group.stayDates.push(lodging.stayDate);
    group.stayVersions.push({
      key: `${lodging.stayDayId}:${lodging.stayVersionId ?? "version-1"}`,
      dayId: lodging.stayDayId,
      versionId: lodging.stayVersionId ?? "version-1",
      label: lodging.stayVersionLabel ?? "版本 1",
    });
    group.stayEntries.push({
      key: `${lodging.stayDate}:${lodging.stayDayId}:${lodging.stayVersionId ?? "version-1"}`,
      date: lodging.stayDate,
      dayNumber: lodging.stayDayNumber,
      dayId: lodging.stayDayId,
      versionId: lodging.stayVersionId ?? "version-1",
    });
    groups.set(key, group);
    return groups;
  }, new Map()).values()].sort((first, second) => {
    const firstDate = first.stayDates.filter(Boolean).sort()[0] ?? "9999-12-31";
    const secondDate = second.stayDates.filter(Boolean).sort()[0] ?? "9999-12-31";
    return firstDate.localeCompare(secondDate);
  });

  useEffect(() => {
    window.addEventListener("storage", refreshLodgings);
    window.addEventListener("lodgings-changed", refreshLodgings);
    return () => {
      window.removeEventListener("storage", refreshLodgings);
      window.removeEventListener("lodgings-changed", refreshLodgings);
    };
  }, [refreshLodgings]);

  useEffect(() => {
    selectedLodgingElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedLodgingElement]);

  return (
    <section className="hotel-page">
      {availableVersions.length > 0 && (
        <nav className="hotel-version-nav" aria-label="住宿行程版本">
          {availableVersions.map((version) => (
            <Link
              key={version}
              className={version === selectedVersion ? "is-active" : undefined}
              to={`/hotel?version=${encodeURIComponent(version)}`}
            >
              {version}
            </Link>
          ))}
        </nav>
      )}
      {groupedLodgings.length ? (
        <ul className="hotel-list">
          {groupedLodgings.map((lodging) => (
            <li
              key={lodging.id || `${lodging.name}-${lodging.displayName}`}
              ref={selectedLodgingId === lodging.id ? setSelectedLodgingElement : null}
              className={selectedLodgingId === lodging.id ? "hotel-list-item-selected" : undefined}
            >
              <div>
                <strong>{lodging.name}</strong>
                <span>{lodging.displayName}</span>
                <div className="hotel-stay-date-links">
                  {[...new Map(
                    lodging.stayEntries.map((entry) => [entry.key, entry]),
                  ).values()]
                    .sort((first, second) =>
                      (first.date || "9999-12-31").localeCompare(
                        second.date || "9999-12-31",
                      ),
                    )
                    .map((entry) => (
                      <Link
                        key={entry.key}
                        to={`/planner?day=${encodeURIComponent(entry.dayId)}&version=${encodeURIComponent(entry.versionId)}`}
                      >
                        {formatStayDate(entry.date, entry.dayNumber)}
                      </Link>
                    ))}
                </div>
              </div>
              <div className="hotel-list-actions">
                {lodging.website ? (
                  <a href={lodging.website} target="_blank" rel="noreferrer">
                    前往官方網站 ↗
                  </a>
                ) : (
                  <small>尚未取得官方網站</small>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="hotel-empty">
          {selectedVersion} 尚未有住宿資料。請先在該版本輸入並定位住宿。
        </div>
      )}
    </section>
  );
}

export default Hotel;
