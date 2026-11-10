/**
 * Canonical color and typography tokens used exclusively by DOCX and PDF export generators.
 * All UI styling must use Tailwind utility classes mapping to CSS variables in globals.css.
 */

export const EXPORT_TOKENS = {
  accent: "#3F6F57",
  accentHover: "#335C48",
  accentTint: "#E9F0EC",
  accentInk: "#2F5A44",
  onAccent: "#FFFFFF",
  page: "#F6F7F5",
  surface: "#FFFFFF",
  hover: "#F0F3F1",
  border: "#E2E6E3",
  borderStrong: "#CBD2CD",
  text: "#1A201C",
  muted: "#5E6862",
  ok: "#1E9E57",
  okTint: "#E3F5EA",
  okInk: "#14653D",
  bad: "#C0392B",
  badTint: "#FBEAE8",
  badInk: "#9A2B20",
  warn: "#B7791F",
  warnTint: "#FBF1DC",
  warnInk: "#7A4E10",
  black: "#000000",
} as const;

export const EXPORT_FONTS = {
  family: "Arial",
} as const;
