import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Casino-pit-at-night palette. Near-black felt, gold "boss" accent,
        // emerald/rose for the two sides of the tote board.
        pit: {
          950: "#08090c",
          900: "#0c0e13",
          850: "#11141b",
          800: "#161a23",
          700: "#1e2430",
          600: "#2a3140",
          500: "#3a4354",
        },
        boss: {
          DEFAULT: "#f5b43a",
          bright: "#ffca55",
          dim: "#b9862a",
        },
        yes: {
          DEFAULT: "#28c76f",
          bright: "#3ef08d",
          dim: "#1b8f4f",
        },
        no: {
          DEFAULT: "#ff5c72",
          bright: "#ff7d8f",
          dim: "#c73c50",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(245,180,58,0.25), 0 8px 40px -12px rgba(245,180,58,0.35)",
        "glow-yes": "0 0 24px -6px rgba(40,199,111,0.45)",
        "glow-no": "0 0 24px -6px rgba(255,92,114,0.45)",
      },
      keyframes: {
        steam: {
          "0%": { backgroundColor: "rgba(245,180,58,0.18)" },
          "100%": { backgroundColor: "rgba(245,180,58,0)" },
        },
        "slide-in": {
          "0%": { transform: "translateY(-6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        steam: "steam 900ms ease-out",
        "slide-in": "slide-in 220ms ease-out",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
