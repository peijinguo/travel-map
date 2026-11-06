import { useEffect, useState } from "react";

function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 300);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <button
            type="button"
            className={`back-to-top${visible ? " is-visible" : ""}`}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="回到頂端"
            title="回到頂端"
            tabIndex={visible ? 0 : -1}
        >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>TOP</span>
        </button>
    );
}

export default BackToTop;
