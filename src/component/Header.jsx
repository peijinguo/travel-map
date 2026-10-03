import { useCallback, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { snowTowns } from "../views/frontend/Home";
import { useAuth } from "../context/AuthContext";

function Header() {
  const {
    user,
    authReady,
    authError,
    isFirebaseConfigured,
    syncCode,
    syncCodes,
    setSyncCode,
    removeSyncCode,
  } = useAuth();
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isSyncCodeSelectOpen, setIsSyncCodeSelectOpen] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(syncCode);
  const [newSyncCode, setNewSyncCode] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [foodFavorites, setFoodFavorites] = useState([]);
  const [activeFavoriteTab, setActiveFavoriteTab] = useState("resorts");

  const loadFavorites = useCallback(() => {
    const savedFavorites = snowTowns.flatMap((town) =>
      town.resorts.flatMap((resort, index) =>
        localStorage.getItem(`resort-favorite:${town.id}:${index}`) === "true"
          ? [
              {
                townId: town.id,
                resortIndex: index,
                townName: town.name,
                resort,
              },
            ]
          : [],
      ),
    );
    setFavorites(savedFavorites);
    try {
      const savedFood = JSON.parse(
        localStorage.getItem("yuki-tabi-food-favorites-v1") ?? "[]",
      );
      setFoodFavorites(Array.isArray(savedFood) ? savedFood : []);
    } catch {
      setFoodFavorites([]);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    window.addEventListener("storage", loadFavorites);
    window.addEventListener("resort-favorites-changed", loadFavorites);
    window.addEventListener("food-favorites-changed", loadFavorites);
    return () => {
      window.removeEventListener("storage", loadFavorites);
      window.removeEventListener("resort-favorites-changed", loadFavorites);
      window.removeEventListener("food-favorites-changed", loadFavorites);
    };
  }, [loadFavorites]);

  useEffect(() => {
    const updateSyncMessage = (event) => {
      const messages = {
        loading: "正在重新載入資料…",
        success: "同步完成",
        error: "同步失敗，請確認 Firestore 規則後再試一次",
      };
      setSyncMessage(messages[event.detail] ?? "");
    };
    window.addEventListener("cloud-sync-status", updateSyncMessage);
    return () =>
      window.removeEventListener("cloud-sync-status", updateSyncMessage);
  }, []);

  const removeFavorite = (favorite) => {
    localStorage.removeItem(
      `resort-favorite:${favorite.townId}:${favorite.resortIndex}`,
    );
    loadFavorites();
    window.dispatchEvent(new CustomEvent("resort-favorites-changed"));
  };

  const removeFoodFavorite = (favorite) => {
    const next = foodFavorites.filter((item) => item.id !== favorite.id);
    localStorage.setItem("yuki-tabi-food-favorites-v1", JSON.stringify(next));
    setFoodFavorites(next);
    window.dispatchEvent(new CustomEvent("food-favorites-changed"));
  };

  const removeSavedSyncCode = (code) => {
    if (!removeSyncCode(code)) {
      setSyncMessage("至少需要保留一組同步碼");
      return;
    }
    const nextCode = syncCodes.find((savedCode) => savedCode !== code);
    setSyncCodeDraft(nextCode ?? syncCode);
    setSyncMessage("同步碼已從此裝置移除");
  };

  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="雪旅地圖首頁">
        <span className="brand-mark brand-mark--image" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-options/logo-b-snow-pin.svg`}
            alt=""
          />
        </span>
        <span className="brand-copy">
          <strong>雪旅地圖</strong>
          <small>YUKI TABI</small>
        </span>
      </Link>
      <nav
        className={`nav${isMobileMenuOpen ? " nav--open" : ""}`}
        id="mobile-navigation"
        aria-label="主要選單"
      >
        <NavLink to="/" end onClick={() => setIsMobileMenuOpen(false)}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
          </span>
          雪旅指南
        </NavLink>
        <NavLink to="/planner" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 20V5m0 1c4-3 7 3 12 0v8c-5 3-8-3-12 0" />
              <path d="M5 20h4" />
            </svg>
          </span>
          行程規劃
        </NavLink>
        <NavLink to="/hotel" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 11L12 4l8 7" />
              <path d="M6 10v10h12V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
          </span>
          住宿資訊
        </NavLink>
      </nav>
      <button
        className={`menu-toggle${isMobileMenuOpen ? " menu-toggle--open" : ""}`}
        type="button"
        aria-label={isMobileMenuOpen ? "關閉導覽選單" : "開啟導覽選單"}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation"
        onClick={() => {
          setIsFavoritesOpen(false);
          setIsMobileMenuOpen((open) => !open);
        }}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="header-controls">
        <div className="header-sync">
          <button
            type="button"
            className="header-login"
            aria-expanded={isSyncOpen}
            aria-controls="sync-code-panel"
            title={
              user
                ? "設定跨裝置同步碼"
                : isFirebaseConfigured
                  ? authError || "正在啟用同步"
                  : "目前使用本機儲存"
            }
            onClick={() => {
              setIsFavoritesOpen(false);
              setSyncMessage(authError);
              setSyncCodeDraft(syncCode);
              setIsSyncCodeSelectOpen(false);
              setIsSyncOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">↻</span>
            <strong>
              {user
                ? "同步碼"
                : isFirebaseConfigured
                  ? authReady
                    ? "同步失敗"
                    : "同步中"
                  : "本機儲存"}
            </strong>
          </button>
          {isSyncOpen && (
            <section
              className="sync-code-panel"
              id="sync-code-panel"
              aria-label="跨裝置同步設定"
            >
              <div className="sync-code-heading">
                <div>
                  <small>SYNC CODE</small>
                  <h2>跨裝置同步</h2>
                </div>
                <button type="button" onClick={() => setIsSyncOpen(false)}>
                  ×
                </button>
              </div>
              <p>選擇此裝置曾使用過的同步碼，即可切換共用的行程與筆記。</p>
              <div className="sync-code-form">
                <div className="sync-code-input-row">
                  <div className="sync-code-select">
                    <button
                      className="sync-code-select-trigger"
                      type="button"
                      aria-label="選擇同步碼"
                      aria-expanded={isSyncCodeSelectOpen}
                      aria-haspopup="listbox"
                      onClick={() =>
                        setIsSyncCodeSelectOpen((isOpen) => !isOpen)
                      }
                    >
                      <span>{syncCodeDraft}</span>
                      <span aria-hidden="true">⌄</span>
                    </button>
                    {isSyncCodeSelectOpen && (
                      <ul className="sync-code-options" role="listbox">
                        {syncCodes.map((code) => (
                          <li key={code}>
                            <button
                              className="sync-code-option"
                              type="button"
                              role="option"
                              aria-selected={code === syncCodeDraft}
                              onClick={() => {
                                setSyncCodeDraft(code);
                                setIsSyncCodeSelectOpen(false);
                                if (setSyncCode(code)) {
                                  setSyncMessage("已套用同步碼，正在重新載入資料…");
                                }
                              }}
                            >
                              {code}
                            </button>
                            <button
                              className="sync-code-option-remove"
                              type="button"
                              aria-label={`刪除同步碼 ${code}`}
                              onClick={() => removeSavedSyncCode(code)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <label htmlFor="new-sync-code">新增同步碼</label>
                <div className="sync-code-input-row">
                  <input
                    id="new-sync-code"
                    value={newSyncCode}
                    maxLength="32"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="輸入至少 8 碼英數字"
                    onChange={(event) => {
                      setNewSyncCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, ""),
                      );
                      setSyncMessage("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!setSyncCode(newSyncCode)) {
                        setSyncMessage("同步碼至少需要 8 個英文字母或數字");
                        return;
                      }
                      setSyncCodeDraft(newSyncCode);
                      setNewSyncCode("");
                      setSyncMessage("已新增並套用同步碼，正在重新載入資料…");
                    }}
                  >
                    新增
                  </button>
                </div>
                <span role="status">{syncMessage}</span>
              </div>
            </section>
          )}
        </div>
        <div className="header-favorites">
        <button
          className="header-action"
          type="button"
          aria-label={`我的收藏，共 ${favorites.length + foodFavorites.length} 個項目`}
          aria-expanded={isFavoritesOpen}
          aria-controls="header-favorites-panel"
          onClick={() => {
            loadFavorites();
            setIsMobileMenuOpen(false);
            setIsFavoritesOpen((open) => !open);
          }}
        >
          <span className="header-action-icon" aria-hidden="true">
            {favorites.length + foodFavorites.length ? "♥" : "♡"}
          </span>
          <span className="header-action-label">我的收藏</span>
          {favorites.length + foodFavorites.length > 0 && (
            <strong className="favorites-count">{favorites.length + foodFavorites.length}</strong>
          )}
        </button>

        {isFavoritesOpen && (
          <section
            className="favorites-panel"
            id="header-favorites-panel"
            aria-label="收藏的雪場"
          >
            <div className="favorites-tabs" role="tablist" aria-label="收藏分類">
              <button
                type="button"
                role="tab"
                aria-selected={activeFavoriteTab === "resorts"}
                className={activeFavoriteTab === "resorts" ? "is-active" : ""}
                onClick={() => setActiveFavoriteTab("resorts")}
              >
                雪場 <span>{favorites.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFavoriteTab === "food"}
                className={activeFavoriteTab === "food" ? "is-active" : ""}
                onClick={() => setActiveFavoriteTab("food")}
              >
                美食 <span>{foodFavorites.length}</span>
              </button>
            </div>
            {activeFavoriteTab === "resorts" ? (
            favorites.length === 0 ? (
              <div className="favorites-empty">
                <span aria-hidden="true">♡</span>
                <p>還沒有收藏雪場</p>
                <small>到雪場介紹頁按下「加入我的收藏」吧！</small>
              </div>
            ) : (
              <ul className="favorites-list">
                {favorites.map((favorite) => (
                  <li key={`${favorite.townId}-${favorite.resortIndex}`}>
                    <Link
                      to={`/resorts/${favorite.townId}/${favorite.resortIndex}`}
                      onClick={() => setIsFavoritesOpen(false)}
                    >
                      <small>{favorite.townName}</small>
                      <strong>{favorite.resort}</strong>
                    </Link>
                    <button
                      type="button"
                      aria-label={`移除 ${favorite.resort}`}
                      onClick={() => removeFavorite(favorite)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )
            ) : foodFavorites.length === 0 ? (
              <div className="favorites-empty">
                <span aria-hidden="true">♡</span>
                <p>尚未收藏美食</p>
                <small>收藏的餐廳與美食會顯示在這裡。</small>
              </div>
            ) : (
              <ul className="favorites-list favorites-food-list">
                {foodFavorites.map((favorite) => (
                  <li key={favorite.id}>
                    {favorite.to ? (
                      <Link to={favorite.to} onClick={() => setIsFavoritesOpen(false)}>
                        <small>{favorite.area ?? "美食"}</small>
                        <strong>{favorite.name}</strong>
                      </Link>
                    ) : (
                      <span className="favorites-food-copy">
                        <small>{favorite.area ?? "美食"}</small>
                        <strong>{favorite.name}</strong>
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`移除 ${favorite.name}`}
                      onClick={() => removeFoodFavorite(favorite)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        </div>
      </div>
    </header>
  );
}

export default Header;
