import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  addWishCloud,
  deleteWishCloud,
  loadPlannerCloud,
  subscribeMenusCloud,
  subscribePlannerCloud,
  subscribeWishesCloud,
  updateWishCloud,
} from "../../services/firebase";
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

// Shrinks a photo to a JPEG at most 800px on its long side, small enough to
// keep inside one cloud document.
const PHOTO_MAX_SIDE = 800;
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  for (const quality of [0.78, 0.65, 0.5]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length < 700000) return dataUrl;
  }
  return canvas.toDataURL("image/jpeg", 0.4);
}

// Adds something to eat that isn't on any stop's menu: a photo, a name and a
// note, synced with the trip.
function WishForm({ cloudKey }) {
  const [photo, setPhoto] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("處理圖片中…");
    try {
      setPhoto(await shrinkPhoto(file));
      setStatus("");
    } catch (error) {
      console.error("無法讀取圖片", error);
      setStatus("這張圖片讀不出來，換一張試試");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() && !photo) {
      setStatus("請放一張圖片或寫個名稱");
      return;
    }
    setBusy(true);
    setStatus("新增中…");
    try {
      await addWishCloud(cloudKey, { name: name.trim(), note: note.trim(), photo });
      setPhoto("");
      setName("");
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      setStatus("已新增");
    } catch (error) {
      console.error("無法新增想吃的東西", error);
      setStatus("新增失敗，請檢查網路後再試一次");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="wishlist-form" onSubmit={submit}>
      <label className={`wishlist-photo-pick ${photo ? "has-photo" : ""}`}>
        {photo ? <img src={photo} alt="預覽" /> : <span>＋ 圖片</span>}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} />
      </label>
      <div className="wishlist-form-fields">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="想吃什麼？例如：六花亭奶油葡萄夾心餅"
          maxLength={60}
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="備註：店名、地點、價格…（可不填）"
          maxLength={120}
        />
        <div className="wishlist-form-actions">
          <button type="submit" disabled={busy}>新增</button>
          {status && <span role="status">{status}</span>}
        </div>
      </div>
    </form>
  );
}

// A card's name and note; tapping them opens two fields to change them.
function WishCaption({ cloudKey, wish }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wish.name ?? "");
  const [note, setNote] = useState(wish.note ?? "");
  const [status, setStatus] = useState("");
  const formRef = useRef(null);

  // Tapping anywhere outside the fields (or pressing Esc) cancels the edit.
  useEffect(() => {
    if (!editing) return undefined;
    const cancelOutside = (event) => {
      if (!formRef.current?.contains(event.target)) setEditing(false);
    };
    const cancelOnEscape = (event) => {
      if (event.key === "Escape") setEditing(false);
    };
    document.addEventListener("pointerdown", cancelOutside);
    document.addEventListener("keydown", cancelOnEscape);
    return () => {
      document.removeEventListener("pointerdown", cancelOutside);
      document.removeEventListener("keydown", cancelOnEscape);
    };
  }, [editing]);

  const startEditing = () => {
    setName(wish.name ?? "");
    setNote(wish.note ?? "");
    setStatus("");
    setEditing(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setStatus("儲存中…");
    try {
      await updateWishCloud(cloudKey, wish.id, { name: name.trim(), note: note.trim() });
      setEditing(false);
    } catch (error) {
      console.error("無法更新", error);
      setStatus("儲存失敗，請再試一次");
    }
  };

  if (editing) {
    return (
      <form ref={formRef} className="wishlist-caption-edit" onSubmit={save}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="名稱"
          maxLength={60}
          autoFocus
        />
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="備註（可不填）"
          maxLength={120}
        />
        <div>
          <button type="button" onClick={() => setEditing(false)}>取消</button>
          <button type="submit" className="is-primary">儲存</button>
          {status && <span role="status">{status}</span>}
        </div>
      </form>
    );
  }
  return (
    <button
      type="button"
      className="wishlist-caption"
      aria-label={`編輯 ${wish.name || "這張圖片"}`}
      onClick={startEditing}
    >
      {wish.name ? <strong>{wish.name}</strong> : <span className="wishlist-caption-empty">＋ 加名稱</span>}
      {wish.note && <small>{wish.note}</small>}
      {/* The same outline pen as renaming a trip in the header. */}
      <svg className="wishlist-caption-pen" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4L19 9l-4-4L4 16z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    </button>
  );
}

function Wishlist() {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [days, setDays] = useState(getInitialDays);
  const [cloudMenus, setCloudMenus] = useState({});
  const [wishes, setWishes] = useState([]);

  useEffect(() => {
    setWishes([]);
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
    const stopWishes = subscribeWishesCloud(cloudKey, setWishes, (error) =>
      console.error("無法即時接收想吃清單", error),
    );
    return () => {
      cancelled = true;
      stopPlanner();
      stopMenus();
      stopWishes();
    };
  }, [cloudKey]);

  const wishlist = collectWishlist(days, cloudMenus);
  const dishCount =
    wishes.length +
    wishlist.reduce(
      (sum, day) => sum + day.shops.reduce((count, shop) => count + shop.dishes.length, 0),
      0,
    );

  // The wish waiting on the 確認刪除 dialog, and any error from deleting it.
  const [wishPendingDelete, setWishPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const closeDeleteDialog = () => {
    setWishPendingDelete(null);
    setDeleteError("");
  };
  const confirmRemoveWish = async () => {
    try {
      await deleteWishCloud(cloudKey, wishPendingDelete.id);
      closeDeleteDialog();
    } catch (error) {
      console.error("無法刪除", error);
      setDeleteError("刪除失敗，請檢查網路後再試一次。");
    }
  };

  useEffect(() => {
    if (!wishPendingDelete) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeDeleteDialog();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [wishPendingDelete]);

  return (
    <section className="wishlist-page">
      <header className="wishlist-heading">
        <h1>想吃清單</h1>
        <p>
          {dishCount ? `共 ${dishCount} 道。` : "還沒有想吃的東西。"}
          可以上傳圖片新增，或在行程規劃打開店家的菜單，點菜名旁的圖示。
        </p>
      </header>
      {cloudKey ? (
        <WishForm cloudKey={cloudKey} />
      ) : (
        <p className="wishlist-offline">
          要先選擇行程（右上角的行程代號），才能上傳圖片並跟其他裝置同步。
        </p>
      )}
      {wishes.length > 0 && (
        <section className="wishlist-day">
          <h2>自己加的</h2>
          <ul className="wishlist-wishes">
            {wishes.map((wish) => (
              <li key={wish.id}>
                {wish.photo && (
                  <img src={wish.photo} alt={wish.name || "想吃的東西"} loading="lazy" />
                )}
                <WishCaption cloudKey={cloudKey} wish={wish} />
                <button
                  type="button"
                  className="wishlist-delete"
                  aria-label={`刪除 ${wish.name || "這張圖片"}`}
                  onClick={() => setWishPendingDelete(wish)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {wishlist.map((day) => (
        <section className="wishlist-day" key={day.id}>
          <h2>
            行程 {day.label}
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
      {wishPendingDelete && (
        <div className="planner-confirm-backdrop" onClick={closeDeleteDialog}>
          <section
            className="planner-confirm wishlist-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wishlist-confirm-title"
            aria-describedby="wishlist-confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="wishlist-confirm-title">確認刪除</h2>
            {wishPendingDelete.photo && (
              <img className="wishlist-confirm-photo" src={wishPendingDelete.photo} alt="" />
            )}
            <p id="wishlist-confirm-message">
              {deleteError ||
                `要從想吃清單刪除「${wishPendingDelete.name || "這張圖片"}」嗎？刪除後無法復原。`}
            </p>
            <div className="planner-confirm-actions">
              <button type="button" autoFocus onClick={closeDeleteDialog}>
                取消
              </button>
              <button className="is-danger" type="button" onClick={confirmRemoveWish}>
                刪除
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Wishlist;
