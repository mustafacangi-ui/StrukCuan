import { useTranslation } from "react-i18next";
import { APP_LANGS, setAppLanguage, type AppLang } from "@/i18n";

interface Props {
  /** "pills" = yan yana iki buton (Settings için), "compact" = tek küçük pill (topbar için) */
  variant?: "pills" | "compact";
  className?: string;
}

export default function LanguageSelector({ variant = "pills", className = "" }: Props) {
  const { i18n } = useTranslation();
  const current = i18n.language as AppLang;

  if (variant === "compact") {
    // Topbar'da tek küçük pill — aktif dili gösterir, tıklayınca diğerine geçer
    const next = APP_LANGS.find((l) => l.code !== current) ?? APP_LANGS[0];
    const active = APP_LANGS.find((l) => l.code === current) ?? APP_LANGS[0];
    return (
      <button
        type="button"
        onClick={() => setAppLanguage(next.code as AppLang)}
        title={`Switch to ${next.label}`}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 select-none ${className}`}
        style={{
          background: "rgba(155,92,255,0.10)",
          border: "1px solid rgba(155,92,255,0.22)",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        <span className="text-[15px] leading-none">{active.flag}</span>
        <span className="leading-none">{active.code.toUpperCase()}</span>
      </button>
    );
  }

  // "pills" variant — yan yana iki seçenek
  return (
    <div
      className={`flex items-center gap-1.5 rounded-2xl p-1 ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {APP_LANGS.map((lang) => {
        const isActive = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setAppLanguage(lang.code as AppLang)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 select-none ${
              isActive ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
            style={
              isActive
                ? {
                    background: "linear-gradient(135deg, rgba(155,92,255,0.35), rgba(255,78,205,0.25))",
                    border: "1px solid rgba(155,92,255,0.45)",
                    boxShadow: "0 0 18px rgba(155,92,255,0.25)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid transparent",
                  }
            }
          >
            <span className="text-[18px] leading-none">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
