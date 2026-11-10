import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--on-brand-soft)",
          faint: "var(--on-brand-faint)",
          active: "var(--brand-active)",
          line: "var(--brand-line)",
        },
        "on-brand": {
          DEFAULT: "var(--on-brand)",
          soft: "var(--on-brand-soft)",
          faint: "var(--on-brand-faint)",
        },
        page: "var(--page)",
        surface: "var(--surface)",
        hover: "var(--hover)",
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
        },
        muted: "var(--muted)",
        ok: {
          DEFAULT: "var(--ok)",
          tint: "var(--ok-tint)",
          ink: "var(--ok-ink)",
        },
        bad: {
          DEFAULT: "var(--bad)",
          tint: "var(--bad-tint)",
          ink: "var(--bad-ink)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          tint: "var(--warn-tint)",
          ink: "var(--warn-ink)",
        },
        scrim: "var(--scrim)",
      },
      borderRadius: {
        control: "var(--r-control)",
        panel: "var(--r-panel)",
      },
      boxShadow: {
        overlay: "0 8px 24px rgba(26, 26, 26, 0.12)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
