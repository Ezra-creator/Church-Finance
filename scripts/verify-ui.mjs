import fs from "node:fs";
import path from "node:path";

console.log("=== PUCA Finance UI Verification ===");

const errors = [];
function reportError(rule, message, file, line) {
  errors.push({ rule, message, file, line });
  console.error(`  [FAIL] ${rule}: ${message}${file ? ` (${file}:${line})` : ""}`);
}

// -------------------------------------------------------------
// 1. Verify 24 Tokens in globals.css
// -------------------------------------------------------------
const EXPECTED_TOKENS = {
  "--accent": "#3F6F57",
  "--accent-hover": "#335C48",
  "--accent-tint": "#E9F0EC",
  "--accent-ink": "#2F5A44",
  "--on-accent": "#FFFFFF",
  "--page": "#F6F7F5",
  "--surface": "#FFFFFF",
  "--hover": "#F0F3F1",
  "--border": "#E2E6E3",
  "--border-strong": "#CBD2CD",
  "--text": "#1A201C",
  "--muted": "#5E6862",
  "--ok": "#1E9E57",
  "--ok-tint": "#E3F5EA",
  "--ok-ink": "#14653D",
  "--bad": "#C0392B",
  "--bad-tint": "#FBEAE8",
  "--bad-ink": "#9A2B20",
  "--warn": "#B7791F",
  "--warn-tint": "#FBF1DC",
  "--warn-ink": "#7A4E10",
  "--r-control": "6px",
  "--r-panel": "8px",
};

const globalsPath = "src/app/globals.css";
if (!fs.existsSync(globalsPath)) {
  reportError("tokens", `globals.css not found at ${globalsPath}`);
} else {
  const globalsContent = fs.readFileSync(globalsPath, "utf8");
  for (const [token, expectedValue] of Object.entries(EXPECTED_TOKENS)) {
    const reg = new RegExp(`${token}\\s*:\\s*${expectedValue.replace("#", "#?")}`, "i");
    if (!reg.test(globalsContent)) {
      reportError("tokens", `Token ${token} missing or does not match ${expectedValue} in globals.css`, globalsPath);
    }
  }

  // Scrim check
  if (!globalsContent.includes("rgba(26, 32, 28, 0.45)") && !globalsContent.includes("rgba(26,32,28,0.45)")) {
    reportError("tokens", "Missing exact --scrim token rgba(26, 32, 28, 0.45)", globalsPath);
  }
}

// -------------------------------------------------------------
// 2. WCAG Contrast Ratios (All text/bg pairs >= 4.5:1)
// -------------------------------------------------------------
function hexToLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const CONTRAST_PAIRS = [
  { text: "--text", textHex: "#1A201C", bg: "--page", bgHex: "#F6F7F5" },
  { text: "--text", textHex: "#1A201C", bg: "--surface", bgHex: "#FFFFFF" },
  { text: "--muted", textHex: "#5E6862", bg: "--page", bgHex: "#F6F7F5" },
  { text: "--muted", textHex: "#5E6862", bg: "--surface", bgHex: "#FFFFFF" },
  { text: "--on-accent", textHex: "#FFFFFF", bg: "--accent", bgHex: "#3F6F57" },
  { text: "--accent-ink", textHex: "#2F5A44", bg: "--accent-tint", bgHex: "#E9F0EC" },
  { text: "--ok-ink", textHex: "#14653D", bg: "--ok-tint", bgHex: "#E3F5EA" },
  { text: "--bad-ink", textHex: "#9A2B20", bg: "--bad-tint", bgHex: "#FBEAE8" },
  { text: "--warn-ink", textHex: "#7A4E10", bg: "--warn-tint", bgHex: "#FBF1DC" },
];

for (const pair of CONTRAST_PAIRS) {
  const ratio = getContrastRatio(pair.textHex, pair.bgHex);
  if (ratio < 4.5) {
    reportError(
      "contrast",
      `Contrast ratio between ${pair.text} (${pair.textHex}) and ${pair.bg} (${pair.bgHex}) is ${ratio.toFixed(2)}:1 (minimum 4.5:1 required)`
    );
  }
}

// -------------------------------------------------------------
// 3. Scan Source Code
// -------------------------------------------------------------
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (["node_modules", ".next", ".git", "dist"].includes(file)) continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const allSrcFiles = walk("./src");
const uiFiles = allSrcFiles.filter(
  (f) =>
    (f.includes(path.join("src", "app")) ||
      f.includes(path.join("src", "components")) ||
      f.includes(path.join("src", "features"))) &&
    (f.endsWith(".tsx") || f.endsWith(".ts")) &&
    !f.includes(".test.")
);

// Regex checks for UI files
const RAW_COLORS_REGEX = /\b(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/;
const GRADIENTS_REGEX = /\b(bg-gradient-|from-|to-)\b/;
const BLUR_REGEX = /\b(backdrop-blur|blur-)\b/;
const RAW_SHADOWS_REGEX = /\bshadow-(sm|md|lg|xl|2xl|inner|none)\b/;
const TEXT_SIZES_REGEX = /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b/;
const ROUNDED_REGEX = /\brounded-(sm|md|lg|xl|2xl|3xl)\b/;
const HEX_REGEX = /#(?:[0-9a-fA-F]{3}){1,2}\b/;
const CURRENCY_MATH_REGEX = /\.(toFixed|parseFloat)\b/;

for (const file of uiFiles) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;

    // Raw colors
    if (RAW_COLORS_REGEX.test(line)) {
      reportError("raw-colors", `Disallowed raw Tailwind color: ${line.match(RAW_COLORS_REGEX)[0]}`, file, lineNum);
    }

    // Gradients
    if (GRADIENTS_REGEX.test(line)) {
      reportError("gradients", `Disallowed gradient class: ${line.match(GRADIENTS_REGEX)[0]}`, file, lineNum);
    }

    // Blur
    if (BLUR_REGEX.test(line)) {
      reportError("blur", `Disallowed blur class: ${line.match(BLUR_REGEX)[0]}`, file, lineNum);
    }

    // Raw shadows (except overlay)
    if (RAW_SHADOWS_REGEX.test(line)) {
      reportError("shadows", `Disallowed raw shadow: ${line.match(RAW_SHADOWS_REGEX)[0]}`, file, lineNum);
    }

    // Standard text sizes
    if (TEXT_SIZES_REGEX.test(line)) {
      reportError("typography-sizes", `Disallowed standard font size: ${line.match(TEXT_SIZES_REGEX)[0]}`, file, lineNum);
    }

    // Disallowed rounded
    if (ROUNDED_REGEX.test(line)) {
      reportError("radii", `Disallowed rounded class: ${line.match(ROUNDED_REGEX)[0]}`, file, lineNum);
    }

    // Hex codes in UI code (allow layout.tsx themeColor)
    if (HEX_REGEX.test(line) && !file.endsWith("layout.tsx")) {
      reportError("hex-codes", `Disallowed hex code in UI file: ${line.match(HEX_REGEX)[0]}`, file, lineNum);
    }
  });
}

// -------------------------------------------------------------
// 4. Scan Entire SRC for Hardcoded Denominational Names & Currency Math
// -------------------------------------------------------------
const DENOM_REGEX = /\b(Presbyterian Church of Ghana)\b/i;
const BANNED_UI_WORDS = [
  "dashboard",
  "analytics",
  "insights",
  "action items",
  "quick actions",
  "recent activity",
  "total count",
  "kpi",
  "hero",
  "super-admin",
];

for (const file of allSrcFiles) {
  if (file.includes(".test.") || file.includes("migrations")) continue;
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;

    // Currency math
    if (CURRENCY_MATH_REGEX.test(line) && !file.includes("parsers") && !file.includes("storage.ts") && !file.includes("money.ts")) {
      reportError("currency-math", `Disallowed toFixed/parseFloat on currency math: ${line.match(CURRENCY_MATH_REGEX)[0]}`, file, lineNum);
    }

    // Denominational names
    if (DENOM_REGEX.test(line)) {
      reportError("denominational-name", `Disallowed hardcoded denominational name: ${line.match(DENOM_REGEX)[0]}`, file, lineNum);
    }

    // Banned UI copy words (in JSX string literals / headings)
    for (const word of BANNED_UI_WORDS) {
      const wordReg = new RegExp(`>\\s*[^<]*\\b${word}\\b[^<]*<|title=["'][^"']*\\b${word}\\b|label=["'][^"']*\\b${word}\\b`, "i");
      if (wordReg.test(line)) {
        reportError("banned-copy", `Disallowed banned UI word "${word}": ${line.trim()}`, file, lineNum);
      }
    }
  });
}

// -------------------------------------------------------------
// 5. Report and Exit
// -------------------------------------------------------------
if (errors.length === 0) {
  console.log("\n[PASS] All UI verification checks passed cleanly (0 errors)!");
  process.exit(0);
} else {
  console.error(`\n[FAIL] UI verification failed with ${errors.length} error(s).`);
  process.exit(1);
}
