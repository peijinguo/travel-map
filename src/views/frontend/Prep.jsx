import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { savePrepCloud, subscribePrepCloud } from "../../services/firebase";
import "../../assets/pages/_prep.scss";

// 行前準備: a hand-drawn notebook checklist. Tapping an item ticks its box and
// strikes it through; items can be added and removed. It syncs with the
// chosen trip, or stays on this device when no trip is chosen.
const LOCAL_KEY = "yuki-tabi-prep-items";

const STARTER_ITEMS = [
  "護照（效期 6 個月以上）",
  "Visit Japan Web 入境登錄",
  "電子機票、訂位紀錄",
  "住宿訂房確認",
  "台灣駕照正本＋日文譯本",
  "租車預約確認",
  "旅遊保險（含滑雪意外）",
  "日圓現金、信用卡",
  "網卡／eSIM",
  "雪票、滑雪課程預約",
  "雪衣、雪褲",
  "手套、雪鏡、毛帽、面罩",
  "發熱衣、羊毛襪",
  "暖暖包",
  "防滑鞋或冰爪",
  "護唇膏、乳液",
  "常備藥",
  "行動電源（放隨身行李）",
];

const makeId = () => `prep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const starterList = () => STARTER_ITEMS.map((text, index) => ({ id: `starter-${index + 1}`, text, done: false }));

const loadLocal = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(saved) ? saved : starterList();
  } catch {
    return starterList();
  }
};

// A slightly wobbly square, drawn like a pen box; a tick appears when done.
function HandBox({ done }) {
  return (
    <svg className="prep-box" viewBox="0 0 28 28" aria-hidden="true">
      <path className="prep-box-frame" d="M4.6 5.2c6.2-.9 12.7-.6 18.6-.3.6 6 .4 12.3.1 18.4-6.3.6-12.4.4-18.5.1-.5-6-.6-12.1-.2-18.2z" />
      {done && <path className="prep-box-tick" d="M7.5 14.6c2 1.6 3.4 3.4 4.6 5.4 3-6.2 7-11.2 12.6-15.6" />}
    </svg>
  );
}

function Prep() {
  const { user, syncSpaceId } = useAuth();
  const cloudKey = user && syncSpaceId ? syncSpaceId : null;
  const [items, setItems] = useState(loadLocal);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const cloudReadyRef = useRef(false);

  // Follow the trip's list; a trip with no list yet starts from this device's.
  useEffect(() => {
    cloudReadyRef.current = false;
    if (!cloudKey) return undefined;
    return subscribePrepCloud(
      cloudKey,
      (cloudItems) => {
        if (Array.isArray(cloudItems)) {
          setItems(cloudItems);
        } else if (!cloudReadyRef.current) {
          savePrepCloud(cloudKey, loadLocal()).catch((error) =>
            console.error("無法建立行前準備清單", error),
          );
        }
        cloudReadyRef.current = true;
      },
      (error) => console.error("無法即時接收行前準備清單", error),
    );
  }, [cloudKey]);

  // Each change builds on the latest list, so quick taps never undo each other.
  const latestRef = useRef(items);
  latestRef.current = items;
  const commit = (change) => {
    const nextItems = change(latestRef.current);
    latestRef.current = nextItems;
    setItems(nextItems);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(nextItems));
    } catch {
      // Storage full or blocked: the list still syncs to the trip.
    }
    if (cloudKey) {
      savePrepCloud(cloudKey, nextItems)
        .then(() => setStatus(""))
        .catch((error) => {
          console.error("無法同步行前準備清單", error);
          setStatus("已存在此裝置，雲端同步失敗");
        });
    }
  };

  const toggle = (id) =>
    commit((list) => list.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  const remove = (id) => commit((list) => list.filter((item) => item.id !== id));
  const add = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    commit((list) => [...list, { id: makeId(), text, done: false }]);
    setDraft("");
  };

  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="prep-page">
      <div className="prep-notebook">
        <div className="prep-sheet">
        <header className="prep-heading">
          <h1>行前準備</h1>
          <p>
            {items.length ? `完成 ${doneCount} / ${items.length}` : "清單是空的，在下面寫上要準備的東西"}
            {status && <span className="prep-status"> · {status}</span>}
          </p>
        </header>
        <ul className="prep-list">
          {items.map((item) => (
            <li key={item.id} className={item.done ? "is-done" : undefined}>
              <button
                type="button"
                className="prep-check"
                aria-pressed={item.done}
                onClick={() => toggle(item.id)}
              >
                <HandBox done={item.done} />
                <span className="prep-text">{item.text}</span>
              </button>
              <button
                type="button"
                className="prep-remove"
                aria-label={`刪除「${item.text}」`}
                onClick={() => remove(item.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form className="prep-add" onSubmit={add}>
          <HandBox done={false} />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="再寫一項…"
            maxLength={80}
          />
          <button type="submit">加入</button>
        </form>
        </div>
      </div>
    </section>
  );
}

export default Prep;
