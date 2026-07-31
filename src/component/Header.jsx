import { useCallback, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { snowTowns } from "../views/frontend/Home";

function Header() {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
          <img src="/assets/logo-options/logo-b-snow-pin.svg" alt="" />
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
    </header>
  );
}

export default Header;
