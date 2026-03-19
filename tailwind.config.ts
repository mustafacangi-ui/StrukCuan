import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Syne"', '"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        theme: {
          pink: "#ff4ecd",
          purple: "#9b5cff",
          deep: "#2a1a6e",
          green: "#00E676",
          gold: "#FFD600",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          red: "hsl(var(--neon-red))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 12px hsl(142 76% 36% / 0.3)" },
          "50%": { boxShadow: "0 0 18px hsl(142 76% 36% / 0.5)" },
        },
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 10px hsl(0 100% 61% / 0.2)" },
          "50%": { boxShadow: "0 0 18px hsl(0 100% 61% / 0.35)" },
        },
        "radar-ping": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "breathing": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "radar-dot": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "20%": { opacity: "0.8", transform: "scale(1)" },
          "80%": { opacity: "0.6", transform: "scale(1.1)" },
          "100%": { opacity: "0", transform: "scale(0.3)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fall": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(180deg)", opacity: "0.3" },
        },
        "ticket-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--fill-width, 100%)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "0.4" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "card-shake": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "10%": { transform: "translateX(-6px) rotate(-1.5deg)" },
          "20%": { transform: "translateX(6px) rotate(1.5deg)" },
          "30%": { transform: "translateX(-5px) rotate(-1deg)" },
          "40%": { transform: "translateX(5px) rotate(1deg)" },
          "50%": { transform: "translateX(-4px) rotate(-0.5deg)" },
          "60%": { transform: "translateX(4px) rotate(0.5deg)" },
          "70%": { transform: "translateX(-3px) rotate(0deg)" },
          "80%": { transform: "translateX(3px) rotate(0deg)" },
          "90%": { transform: "translateX(-2px) rotate(0deg)" },
        },
        "shake-mount": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pulse-border": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(236,72,153,0)" },
          "50%": { boxShadow: "0 0 0 3px rgba(236,72,153,0.25)" },
        },
        "glow-pop": {
          "0%": { boxShadow: "0 0 0 0 rgba(74,222,128,0)" },
          "50%": { boxShadow: "0 0 24px 6px rgba(74,222,128,0.5)" },
          "100%": { boxShadow: "0 0 12px 2px rgba(74,222,128,0.25)" },
        },
        "breathing-glow": {
          "0%, 100%": {
            boxShadow: "0 0 18px rgba(168,85,247,0.55), 0 0 36px rgba(236,72,153,0.3), inset 0 0 14px rgba(168,85,247,0.08)",
          },
          "50%": {
            boxShadow: "0 0 36px rgba(168,85,247,0.85), 0 0 72px rgba(236,72,153,0.55), inset 0 0 28px rgba(168,85,247,0.18)",
          },
        },
        "ticket-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "card-ready-pulse": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "20%": { transform: "translateY(-1.5px) rotate(0.15deg)" },
          "40%": { transform: "translateY(1px) rotate(-0.15deg)" },
          "60%": { transform: "translateY(-1px) rotate(0.1deg)" },
          "80%": { transform: "translateY(1.5px) rotate(-0.1deg)" },
        },
        "progress-liquid-shake": {
          "0%, 100%": { transform: "translateX(0) scaleX(1)" },
          "15%": { transform: "translateX(-4px) scaleX(0.98)" },
          "35%": { transform: "translateX(4px) scaleX(1.01)" },
          "55%": { transform: "translateX(-3px) scaleX(0.99)" },
          "75%": { transform: "translateX(3px) scaleX(1)" },
        },
        "neon-pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(236,72,153,0.6), 0 0 24px rgba(168,85,247,0.3)" },
          "50%": { boxShadow: "0 0 22px rgba(236,72,153,0.9), 0 0 44px rgba(168,85,247,0.6)" },
        },
        "gold-breathing-glow": {
          "0%, 100%": {
            boxShadow: "0 0 16px rgba(251,191,36,0.45), 0 0 32px rgba(245,158,11,0.25), inset 0 0 12px rgba(251,191,36,0.06)",
          },
          "50%": {
            boxShadow: "0 0 32px rgba(251,191,36,0.75), 0 0 64px rgba(245,158,11,0.45), inset 0 0 24px rgba(251,191,36,0.12)",
          },
        },
        "gold-pulse-btn": {
          "0%, 100%": { boxShadow: "0 0 14px rgba(251,191,36,0.6), 0 4px 12px rgba(0,0,0,0.4)" },
          "50%": { boxShadow: "0 0 28px rgba(251,191,36,0.9), 0 4px 16px rgba(0,0,0,0.5)" },
        },
        "radar-sweep": {
          "0%":   { transform: "rotate(0deg)"   },
          "100%": { transform: "rotate(360deg)" },
        },
        "radar-ring-expand": {
          "0%":   { transform: "scale(1)",   opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0"   },
        },
        "fab-glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,230,118,0.6), 0 0 40px rgba(0,230,118,0.3)" },
          "50%":      { boxShadow: "0 0 32px rgba(0,230,118,0.9), 0 0 64px rgba(0,230,118,0.5)" },
        },
        "unified-pulse": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(236,72,153,0.6), 0 0 24px rgba(168,85,247,0.3)" },
          "50%":      { boxShadow: "0 0 22px rgba(236,72,153,0.9), 0 0 44px rgba(168,85,247,0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-red": "pulse-red 2s ease-in-out infinite",
        "radar-ping": "radar-ping 2s ease-out infinite",
        "breathing": "breathing 3s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.35s ease-out",
        "fall": "fall 2s linear forwards",
        "ticket-pop": "ticket-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "progress-fill": "progress-fill 0.6s ease-out forwards",
        "ripple": "ripple 0.35s ease-out forwards",
        "card-shake": "card-shake 0.55s ease-in-out forwards",
        "shake-mount": "shake-mount 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-border": "pulse-border 2s ease-in-out infinite",
        "glow-pop": "glow-pop 0.6s ease-out forwards",
        "breathing-glow": "breathing-glow 2s ease-in-out infinite",
        "ticket-breathe": "ticket-breathe 3s ease-in-out infinite",
        "card-ready-pulse": "card-ready-pulse 2s ease-in-out infinite",
        "progress-liquid-shake": "progress-liquid-shake 0.4s ease-in-out forwards",
        "neon-pulse-glow": "neon-pulse-glow 1.4s ease-in-out infinite",
        "gold-breathing-glow": "gold-breathing-glow 3s ease-in-out infinite",
        "gold-pulse-btn": "gold-pulse-btn 1.6s ease-in-out infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
        "radar-ring-expand": "radar-ring-expand 2.5s ease-out infinite",
        "fab-glow-pulse": "fab-glow-pulse 2s ease-in-out infinite",
        "unified-pulse": "unified-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

