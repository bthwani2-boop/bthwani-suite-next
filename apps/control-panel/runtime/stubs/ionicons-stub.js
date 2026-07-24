import React from "react";

const glyphs = {
  add: "+",
  alert: "!",
  arrowback: "←",
  arrowforward: "→",
  calendar: "▣",
  camera: "◉",
  cart: "▱",
  checkmark: "✓",
  chevronback: "‹",
  chevrondown: "⌄",
  chevronforward: "›",
  chevronup: "⌃",
  close: "×",
  create: "✎",
  document: "▤",
  download: "⇩",
  eye: "◉",
  filter: "▽",
  home: "⌂",
  information: "i",
  location: "⌖",
  lockclosed: "▣",
  mail: "✉",
  menu: "☰",
  notifications: "●",
  people: "♙",
  person: "♙",
  refresh: "↻",
  search: "⌕",
  settings: "⚙",
  time: "◷",
  trash: "⌫",
  wallet: "▰",
  warning: "!",
};

function normalizeName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/-(outline|sharp)$/u, "")
    .replaceAll("-", "");
}

function flattenStyle(style) {
  if (!Array.isArray(style)) return style ?? {};
  return Object.assign({}, ...style.filter((entry) => entry && typeof entry === "object"));
}

/**
 * Browser-safe Ionicons compatibility renderer. It preserves visible controls
 * and accessible labels without loading Expo native font modules in Next.js.
 */
export default function Ionicons({ name, size = 18, color = "currentColor", style, ...props }) {
  const normalized = normalizeName(name);
  const glyph = glyphs[normalized] ?? "◆";
  return React.createElement(
    "span",
    {
      ...props,
      role: props.role ?? "img",
      "aria-label": props["aria-label"] ?? String(name ?? "icon"),
      style: {
        ...flattenStyle(style),
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size,
        lineHeight: 1,
        width: size,
        height: size,
        userSelect: "none",
      },
    },
    glyph,
  );
}
