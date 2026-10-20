import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        balanced: {
          DEFAULT: "var(--balanced)",
          bg: "var(--balanced-bg)",
        },
        variance: {
          DEFAULT: "var(--variance)",
          bg: "var(--variance-bg)",
        },
        attention: {
          DEFAULT: "var(--attention)",
          bg: "var(--attention-bg)",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-plex-sans)", "Segoe UI", "sans-serif"],
        mono: ["var(--font-plex-mono)", "Courier New", "monospace"],
      },
      borderRadius: {
        DEFAULT: "2px",
        none: "0",
        sm: "2px",
        md: "2px",
        lg: "2px",
      },
      maxWidth: {
        ledger: "720px",
      },
      width: {
        rail: "240px",
      },
    },
  },
  plugins: [],
};

export default config;
