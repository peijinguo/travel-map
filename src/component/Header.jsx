import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router-dom";
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
    deleteTrip,
    tripNames,
    renameTrip,
  } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Pages center things in the space below the header, whose height changes
  // when the menu wraps onto a second row; publish it as --topbar-height.
  const topbarRef = useRef(null);
  useEffect(() => {
    const topbar = topbarRef.current;
    if (!topbar) return undefined;
    const publish = () =>
      document.documentElement.style.setProperty("--topbar-height", `${topbar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(topbar);
    return () => observer.disconnect();
  }, []);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const syncRef = useRef(null);
  const [isSyncCodeSelectOpen, setIsSyncCodeSelectOpen] = useState(false);
  const [syncCodeDraft, setSyncCodeDraft] = useState(syncCode);
  const [newSyncCode, setNewSyncCode] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [codePendingRemoval, setCodePendingRemoval] = useState(null);
  const [codeBeingRenamed, setCodeBeingRenamed] = useState(null);
  const [tripNameDraft, setTripNameDraft] = useState("");

  const startRename = (code) => {
    setCodeBeingRenamed(code);
    setTripNameDraft(tripNames[code] ?? "");
  };
  const saveRename = () => {
    renameTrip(codeBeingRenamed, tripNameDraft);
    setCodeBeingRenamed(null);
  };
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const confirmDeleteTrip = async () => {
    const code = codePendingRemoval;
    setIsDeletingTrip(true);
    setDeleteError("");
    try {
      await deleteTrip(code);
      const nextCode = syncCodes.find((savedCode) => savedCode !== code);
      setSyncCodeDraft(code === syncCode ? nextCode ?? syncCode : syncCode);
      setSyncMessage(`已刪除行程 ${code}`);
      setCodePendingRemoval(null);
    } catch (error) {
      setDeleteError(
        {
          "not-connected": "目前沒有連上雲端，無法刪除行程內容。請在正式網站上操作。",
          "last-trip": "至少需要保留一個行程，請先新增另一個行程再刪除。",
        }[error?.message] ?? "刪除失敗，請稍後再試一次。",
      );
    } finally {
      setIsDeletingTrip(false);
    }
  };

  // 點雪旅行程面板以外的地方或按 Esc 時關閉面板。
  useEffect(() => {
    if (!isSyncOpen) return undefined;
    const closeSyncPanel = () => {
      setIsSyncOpen(false);
      setIsSyncCodeSelectOpen(false);
    };
    const closeOnOutsidePress = (event) => {
      // The removal dialog sits outside the panel but belongs to it.
      if (event.target.closest?.(".sync-code-confirm")) return;
      if (!syncRef.current?.contains(event.target)) closeSyncPanel();
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      // Esc first dismisses the removal dialog, then the panel.
      setCodePendingRemoval((code) => {
        if (!code) closeSyncPanel();
        return null;
      });
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSyncOpen]);

  useEffect(() => {
    const updateSyncMessage = (event) => {
      const messages = {
        loading: "正在重新載入資料…",
        success: "同步完成",
        error: "同步失敗，請稍後再試一次",
      };
      setSyncMessage(messages[event.detail] ?? "");
    };
    window.addEventListener("cloud-sync-status", updateSyncMessage);
    return () =>
      window.removeEventListener("cloud-sync-status", updateSyncMessage);
  }, []);

  // Without a cloud connection a switch only changes the saved code; say why
  // nothing loads instead of promising data that never comes.
  const switchedMessage = (loadingMessage) =>
    user
      ? loadingMessage
      : isFirebaseConfigured
        ? authError || "尚未連上雲端，請稍候再切換一次"
        : "目前使用本機儲存，無法載入雲端行程";


  return (
    <header ref={topbarRef} className="topbar">
      <Link className="brand" to="/" aria-label="雪旅地圖首頁">
        <span className="brand-mark brand-mark--image" aria-hidden="true">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo-options/logo-snowflake.svg`}
            alt=""
          />
        </span>
        <span className="brand-copy">
          <strong>雪旅地圖</strong>
        </span>
      </Link>
      <nav
        className={`nav${isMobileMenuOpen ? " nav--open" : ""}`}
        id="mobile-navigation"
        aria-label="主要選單"
      >
        {/* The ski guide is the home page, reached from the logo. */}
        <NavLink to="/prep" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="3.5" width="14" height="17" rx="2" />
              <path d="m8.5 9 1.5 1.5L13 7.5M8.5 15l1.5 1.5L13 13.5M15 9.5h1.5M15 15.5h1.5" />
            </svg>
          </span>
          行前準備
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
        <NavLink to="/wishlist" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" />
            </svg>
          </span>
          想吃清單
        </NavLink>
      </nav>
      <button
        className={`menu-toggle${isMobileMenuOpen ? " menu-toggle--open" : ""}`}
        type="button"
        aria-label={isMobileMenuOpen ? "關閉導覽選單" : "開啟導覽選單"}
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="header-controls">
        <div className="header-sync" ref={syncRef}>
          <button
            type="button"
            className="header-login"
            aria-expanded={isSyncOpen}
            aria-controls="sync-code-panel"
            title={
              user
                ? "切換或新增雪旅行程"
                : isFirebaseConfigured
                  ? authError || "正在啟用同步"
                  : "目前使用本機儲存"
            }
            onClick={() => {
              setSyncMessage(authError);
              setSyncCodeDraft(syncCode);
              setIsSyncCodeSelectOpen(false);
              setIsSyncOpen((open) => !open);
            }}
          >
            <span aria-hidden="true">
              <svg className="header-login-icon" viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
            </span>
            <strong>
              {user
                ? "雪旅行程"
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
              aria-label="雪旅行程"
            >
              <div className="sync-code-heading">
                <p>選擇要查看的行程；在其他裝置輸入相同的行程名稱，就能一起查看與編輯行程和筆記。</p>
                <button
                  type="button"
                  aria-label="關閉"
                  onClick={() => setIsSyncOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className="sync-code-form">
                <div className="sync-code-input-row">
                  <div className="sync-code-select">
                    <button
                      className="sync-code-select-trigger"
                      type="button"
                      aria-label="選擇雪旅行程"
                      aria-expanded={isSyncCodeSelectOpen}
                      aria-haspopup="listbox"
                      onClick={() =>
                        setIsSyncCodeSelectOpen((isOpen) => !isOpen)
                      }
                    >
                      <span title={syncCodeDraft}>{tripNames[syncCodeDraft] || syncCodeDraft}</span>
                      <span aria-hidden="true">⌄</span>
                    </button>
                    {isSyncCodeSelectOpen && (
                      <ul className="sync-code-options" role="listbox">
                        {syncCodes.map((code) =>
                          codeBeingRenamed === code ? (
                          <li key={code} className="is-renaming">
                            <input
                              className="sync-code-name-input"
                              value={tripNameDraft}
                              maxLength="24"
                              autoFocus
                              placeholder="行程名稱"
                              aria-label={`行程 ${code} 的名稱`}
                              onChange={(event) => setTripNameDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") saveRename();
                                if (event.key === "Escape") {
                                  // Cancel the rename without closing the panel.
                                  event.stopPropagation();
                                  event.nativeEvent.stopImmediatePropagation();
                                  setCodeBeingRenamed(null);
                                }
                              }}
                            />
                            <button
                              className="sync-code-option-rename is-save"
                              type="button"
                              aria-label="儲存名稱"
                              onClick={saveRename}
                            >
                              ✓
                            </button>
                            <button
                              className="sync-code-option-remove"
                              type="button"
                              aria-label="取消編輯名稱"
                              onClick={() => setCodeBeingRenamed(null)}
                            >
                              ×
                            </button>
                          </li>
                          ) : (
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
                                  setSyncMessage(switchedMessage("已切換行程，正在載入資料…"));
                                }
                              }}
                            >
                              {/* A named trip is listed by its name; the code stays as a tooltip. */}
                              <span title={code}>{tripNames[code] || code}</span>
                            </button>
                            <button
                              className="sync-code-option-rename"
                              type="button"
                              aria-label={`編輯行程 ${code} 的名稱`}
                              onClick={() => startRename(code)}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 20h4L19 9l-4-4L4 16z" />
                                <path d="m13.5 6.5 4 4" />
                              </svg>
                            </button>
                            <button
                              className="sync-code-option-remove"
                              type="button"
                              aria-label={`刪除行程 ${code}`}
                              onClick={() => {
                                setIsSyncCodeSelectOpen(false);
                                setDeleteError("");
                                setCodePendingRemoval(code);
                              }}
                            >
                              ×
                            </button>
                          </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                </div>
                <label htmlFor="new-sync-code">新增行程</label>
                <div className="sync-code-input-row sync-code-add-row">
                  <input
                    id="new-sync-code"
                    value={newSyncCode}
                    maxLength="32"
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="請輸入行程名稱"
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
                        setSyncMessage("行程代號至少需要 8 個英文字母或數字");
                        return;
                      }
                      setSyncCodeDraft(newSyncCode);
                      setNewSyncCode("");
                      setSyncMessage(switchedMessage("已加入行程，正在載入資料…"));
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
      </div>
      {codePendingRemoval &&
        createPortal(
          <div
            className="planner-confirm-backdrop sync-code-confirm"
            onClick={() => setCodePendingRemoval(null)}
          >
            <section
              className="planner-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="sync-code-confirm-title"
              aria-describedby="sync-code-confirm-message"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="sync-code-confirm-title">
                刪除行程
                <small>{codePendingRemoval}</small>
              </h2>
              <p id="sync-code-confirm-message">
                這個行程的所有天數、行程、菜單和雪場筆記都會從雲端刪除，所有裝置都看不到。最近 3 天的備份會保留，可以從行程頁的「備份紀錄」還原。
              </p>
              {deleteError && (
                <p className="sync-code-confirm-error" role="alert">
                  {deleteError}
                </p>
              )}
              <div className="planner-confirm-actions">
                <button type="button" autoFocus onClick={() => setCodePendingRemoval(null)}>
                  取消
                </button>
                <button
                  className="is-danger"
                  type="button"
                  disabled={isDeletingTrip}
                  onClick={confirmDeleteTrip}
                >
                  {isDeletingTrip ? "刪除中…" : "刪除"}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </header>
  );
}

export default Header;
