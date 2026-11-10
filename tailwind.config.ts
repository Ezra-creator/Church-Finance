import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      accent: {
        DEFAULT: "var(--accent)",
        hover: "var(--accent-hover)",
        tint: "var(--accent-tint)",
        ink: "var(--accent-ink)",
      },
      "on-accent": "var(--on-accent)",
      page: "var(--page)",
      surface: "var(--surface)",
      hover: "var(--hover)",
      border: {
        DEFAULT: "var(--border)",
        strong: "var(--border-strong)",
      },
      text: "var(--text)",
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
    fontSize: {
      caption: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      label: ["13px", { lineHeight: "18px", fontWeight: "500" }],
      body: ["14px", { lineHeight: "20px", fontWeight: "400" }],
      lead: ["16px", { lineHeight: "24px", fontWeight: "400" }],
      title: ["20px", { lineHeight: "28px", fontWeight: "600" }],
      heading: ["24px", { lineHeight: "32px", fontWeight: "600" }],
      figure: ["28px", { lineHeight: "36px", fontWeight: "600" }],
    },
    borderRadius: {
      none: "0",
      control: "var(--r-control)",
      panel: "var(--r-panel)",
      sheet: "12px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      overlay: "0 8px 24px rgba(26,32,28,0.12)",
    },
    fontFamily: {
      sans: [
        "var(--font-inter)",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "sans-serif",
      ],
    },
    extend: {
      width: {
        sidebar: "232px",
      },
      maxWidth: {
        content: "1120px",
        form: "360px",
      },
      height: {
        "top-desktop": "64px",
        "top-mobile": "56px",
        "bottom-bar": "64px",
        row: "44px",
        header: "40px",
        control: "40px",
        "control-mobile": "44px",
        target: "56px",
      },
      minHeight: {
        control: "40px",
        "control-mobile": "44px",
        target: "56px",
      },
      transitionDuration: {
        DEFAULT: "120ms",
        120: "120ms",
        150: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
