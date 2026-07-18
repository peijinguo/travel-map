import { Link, NavLink } from "react-router-dom";

function Header() {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="雪旅地圖首頁">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M24 8v32M10.2 16l27.6 16M37.8 16 10.2 32" /></svg>
        </span>
        <span className="brand-copy"><strong>雪旅地圖</strong><small>YUKI TABI</small></span>
      </Link>
      <nav className="nav" aria-label="主要選單">
        <NavLink to="/" end>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
          </span>
          探索雪鄉
        </NavLink>
        <NavLink to="/planner">
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 20V5m0 1c4-3 7 3 12 0v8c-5 3-8-3-12 0" /><path d="M5 20h4" /></svg>
          </span>
          行程規劃
        </NavLink>
        <a href="#guide">
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 5.5c3-1.4 5.8-.8 8 1.2 2.2-2 5-2.6 8-1.2v14c-3-1.4-5.8-.8-8 1.2-2.2-2-5-2.6-8-1.2Z" /><path d="M12 6.7v14" /></svg>
          </span>
          雪旅指南
        </a>
      </nav>
      <button className="header-action" type="button" aria-label="我的收藏">
        <span className="header-action-icon" aria-hidden="true">♡</span><span className="header-action-label">我的收藏</span>
      </button>
    </header>
  );
}

export default Header;
