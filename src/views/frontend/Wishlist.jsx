import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loadPlannerCloud, subscribeMenusCloud, subscribePlannerCloud } from "../../services/firebase";
import {
  MenuDishRow,
  findPresetMenu,
  getInitialDays,
  normalizePlannerDay,
} from "./Planner";
import "../../assets/pages/_wishlist.scss";

// Every dish the traveller tapped as wanted (heart, or coloured thumbs-up) in
// a stop's menu, gathered across the whole trip and grouped by day and shop.
// It reads the same synced trip as 行程規劃; marks are changed in each menu.
function collectWishlist(days, cloudMenus) {
  return days
    .map((day, dayIndex) => {
      const seen = new Set();
      const items = [day.items, ...(day.versions ?? []).map((version) => version.items)]
        .flat()
        .filter((item) => item && !seen.has(item.id) && seen.add(item.id));
      const shops = items
        .filter((item) => item.menuLikes?.length)
        .map((item) => {
          const saved = cloudMenus[item.id] ?? item.menu;
          const menu = saved?.length ? saved : findPresetMenu(item.text) ?? [];
          const dishes = item.menuLikes
            .map((id) => menu.find((entry) => entry.id === id))
            .filter(Boolean);
          return { id: item.id, title: (item.text ?? "").split(/\r?\n/)[0].trim() || "未命名的店", dishes };
        })
        .filter((shop) => shop.dishes.length);
      return { id: day.id, label: `DAY ${dayIndex + 1}`, date: day.date, shops };
    })
    .filter((day) => day.shops.length);
}

function Wishlist() {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [days, setDays] = useState(getInitialDays);
  const [cloudMenus, setCloudMenus] = useState({});

  useEffect(() => {
    if (!cloudKey) return undefined;
    let cancelled = false;
    const apply = (cloud) => {
      if (!cancelled && Array.isArray(cloud?.days) && cloud.days.length) {
        setDays(cloud.days.map(normalizePlannerDay));
      }
    };
    loadPlannerCloud(cloudKey).then(apply).catch((error) => console.error("無法載入雲端行程", error));
    const stopPlanner = subscribePlannerCloud(cloudKey, apply, (error) =>
      console.error("無法即時接收行程", error),
    );
    const stopMenus = subscribeMenusCloud(cloudKey, setCloudMenus, (error) =>
      console.error("無法即時接收菜單", error),
    );
    return () => {
      cancelled = true;
      stopPlanner();
      stopMenus();
    };
  }, [cloudKey]);

  const wishlist = collectWishlist(days, cloudMenus);
  const dishCount = wishlist.reduce(
    (sum, day) => sum + day.shops.reduce((count, shop) => count + shop.dishes.length, 0),
    0,
  );

  return (
    <section className="wishlist-page">
      <header className="wishlist-heading">
        <h1>想吃清單</h1>
        <p>
          {dishCount
            ? `共 ${dishCount} 道。在行程的菜單裡點菜名旁的圖示，就能加入或移除。`
            : "還沒有想吃的菜。到行程規劃打開店家的菜單，點菜名旁的圖示，就會出現在這裡。"}
        </p>
      </header>
      {wishlist.map((day) => (
        <section className="wishlist-day" key={day.id}>
          <h2>
            {day.label}
            {day.date && <small>{day.date.replaceAll("-", "/")}</small>}
          </h2>
          {day.shops.map((shop) => (
            <article className="wishlist-shop" key={shop.id}>
              <h3>{shop.title}</h3>
              <ul className="planner-menu-list">
                {shop.dishes.map((entry) => (
                  <li key={entry.id}>
                    <MenuDishRow entry={entry} liked />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ))}
      <Link className="wishlist-back" to="/planner">
        回行程規劃
      </Link>
    </section>
  );
}

export default Wishlist;
