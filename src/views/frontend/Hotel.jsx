import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../assets/pages/_hotel.scss";

const LODGING_STORAGE_KEY = "yuki-tabi-lodgings-v1";
const PLANNER_STORAGE_KEY = "yuki-tabi-planner-days-v2";
const NON_LODGING_NAME_PATTERN = /滑雪場|滑雪场|スキー場|ski\s*(?:area|resort)/iu;
const CHECKOUT_PATTERN = /退房|退宿|チェック[\s-]*アウト|check[\s-]*out/iu;

const formatStayDates = (dateStrings) => {
  const dates = [...new Set(dateStrings.filter(Boolean))].sort();
  if (!dates.length) return "入住日期尚未設定";

  const formattedDates = dates.map((dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "long" }).format(date);
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日（${weekday}）`;
  });

  return `${formattedDates.join("、")}入住`;
};

function loadLodgings() {
  try {
    const lodgings = JSON.parse(localStorage.getItem(LODGING_STORAGE_KEY)) ?? [];
    if (!Array.isArray(lodgings)) return [];

    const plannerDays = JSON.parse(localStorage.getItem(PLANNER_STORAGE_KEY)) ?? [];
    const lodgingItems = Array.isArray(plannerDays)
      ? plannerDays.flatMap((day) =>
          (day.items ?? []).filter(
            (item) => !CHECKOUT_PATTERN.test(item.text ?? ""),
          ),
        )
      : [];
    const activeItemIds = new Set(
      lodgingItems.map((item) => item.id),
    );
    const activeLocationIds = new Set(
      lodgingItems.map((item) => item.location?.id).filter(Boolean),
    );

    const hotelLodgings = lodgings.filter(
      (lodging) =>
        !NON_LODGING_NAME_PATTERN.test(lodging.name ?? "") &&
        (lodging.stayItemId
          ? activeItemIds.has(lodging.stayItemId)
          : activeLocationIds.has(lodging.id)),
    );
    if (hotelLodgings.length !== lodgings.length) {
      localStorage.setItem(LODGING_STORAGE_KEY, JSON.stringify(hotelLodgings));
    }
    return hotelLodgings;
  } catch {
    return [];
  }
}

function Hotel() {
  const [lodgings, setLodgings] = useState(loadLodgings);
  const [searchParams] = useSearchParams();
  const selectedLodgingId = searchParams.get("lodging");
  const [selectedLodgingElement, setSelectedLodgingElement] = useState(null);
  const refreshLodgings = useCallback(() => setLodgings(loadLodgings()), []);
  const groupedLodgings = [...lodgings.reduce((groups, lodging) => {
    const key = lodging.id || `${lodging.name}::${lodging.displayName}`;
    const group = groups.get(key) ?? { ...lodging, stayDates: [] };
    group.stayDates.push(lodging.stayDate);
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
                <em>{formatStayDates(lodging.stayDates)}</em>
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
          尚未有住宿資料。請先在行程規劃中輸入並定位住宿。
        </div>
      )}
    </section>
  );
}

export default Hotel;
