import { useState, useEffect } from "react";
import { useI18n } from "../contexts/I18nContext";

export default function ScrollToTop() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
      className={`fixed bottom-6 right-6 z-50 inline-flex items-center justify-center w-10 h-10 rounded-full bg-ctp-surface1 text-ctp-subtext1 border border-ctp-surface2 shadow-lg hover:bg-ctp-surface2 hover:text-ctp-text transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  );
}
