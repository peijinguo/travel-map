import { useCallback, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { snowTowns } from "../views/frontend/Home";
import { useAuth } from "../context/AuthContext";

function Header() {
  const {
    user,
    authReady,
    isFirebaseConfigured,
    syncCode,
    setSyncCode,
  } = useAuth();
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(syncCode);
  const [syncMessage, setSyncMessage] = useState("");
  const [favorites, setFavorites] = useState([]);

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
  }, []);

  useEffect(() => {
    loadFavorites();
    window.addEventListener("storage", loadFavorites);
    window.addEventListener("resort-favorites-changed", loadFavorites);
    return () => {
      window.removeEventListener("storage", loadFavorites);
      window.removeEventListener("resort-favorites-changed", loadFavorites);
    };
  }, [loadFavorites]);

  const removeFavorite = (favorite) => {
    localStorage.removeItem(
      `resort-favorite:${favorite.townId}:${favorite.resortIndex}`,
    );
    loadFavorites();
    window.dispatchEvent(new CustomEvent("resort-favorites-changed"));
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
          {(!isFirebaseConfigured || authReady) && (
          <button
            type="button"
            className="header-login"
            aria-expanded={isSyncOpen}
            aria-controls="sync-code-panel"
            title={
              user
                ? "設定跨裝置同步碼"
                : isFirebaseConfigured
                  ? "正在啟用自動同步"
                  : "目前使用本機儲存"
            }
            onClick={() => {
              setIsFavoritesOpen(false);
              setSyncMessage("");
              setSyncCodeDraft(syncCode);
              setIsSyncOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">↻</span>
            <strong>
              {user
                ? "同步碼"
                : isFirebaseConfigured
                  ? "同步中"
                  : "本機儲存"}
            </strong>
          </button>
          )}
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
                <button
                  type="button"
                  aria-label="關閉同步設定"
                  onClick={() => setIsSyncOpen(false)}
                >
                  ×
                </button>
              </div>
              <p>在另一台裝置輸入相同同步碼，即可共用行程與筆記。</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!setSyncCode(syncCodeDraft)) {
                    setSyncMessage("同步碼至少需要 8 個英文字母或數字");
                    return;
                  }
                  setSyncMessage("已套用同步碼，正在載入資料…");
                }}
              >
                <div className="sync-code-input-row">
                  <input
                    id="sync-code-input"
                    value={syncCodeDraft}
                    maxLength="32"
                    autoComplete="off"
                    spellCheck="false"
                    onChange={(event) => {
                      setSyncCodeDraft(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, ""),
                      );
                      setSyncMessage("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(syncCode);
                      setSyncMessage("同步碼已複製");
                    }}
                  >
                    複製
                  </button>
                </div>
                <button className="sync-code-apply" type="submit">
                  使用這組同步碼
                </button>
                <span role="status" aria-live="polite">{syncMessage}</span>
              </form>
            </section>
          )}
        </div>
        <div className="header-favorites">
        <button
          className="header-action"
          type="button"
          aria-label={`我的收藏，共 ${favorites.length} 個雪場`}
          aria-expanded={isFavoritesOpen}
          aria-controls="header-favorites-panel"
          onClick={() => {
            loadFavorites();
            setIsMobileMenuOpen(false);
            setIsSyncOpen(false);
            setIsFavoritesOpen((open) => !open);
          }}
        >
          <span className="header-action-icon" aria-hidden="true">
            {favorites.length ? "♥" : "♡"}
          </span>
          <span className="header-action-label">我的收藏</span>
          {favorites.length > 0 && (
            <strong className="favorites-count">{favorites.length}</strong>
          )}
        </button>

        {isFavoritesOpen && (
          <section
            className="favorites-panel"
            id="header-favorites-panel"
            aria-label="收藏的雪場"
          >
            {favorites.length === 0 ? (
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
            )}
          </section>
        )}
        </div>
      </div>
    </header>
  );
}

export default Header;
