import React from "react";
import type { IconRendererProps } from "./Icon";

// The web owner renders the shared Icon contract directly. This deliberately
// does not masquerade as an implementation of an external native package.
const glyphs: Readonly<Record<string, string>> = Object.freeze({
  add: "+",
  alert: "!",
  arrowback: "←",
  arrowforward: "→",
  bag: "▰",
  baghandle: "▰",
  bicycle: "♢",
  cafe: "♨",
  call: "☎",
  camera: "◉",
  cart: "▱",
  chatbubbleellipses: "…",
  chatbubbles: "☷",
  checkmark: "✓",
  checkmarkcircle: "●",
  chevronback: "‹",
  chevrondown: "⌄",
  chevronforward: "›",
  chevronup: "⌃",
  close: "×",
  closecircle: "⊗",
  colorpalette: "◈",
  construct: "⚒",
  document: "▤",
  documentattach: "▤",
  documenttext: "▤",
  eye: "◉",
  eyeoff: "◌",
  gitbranch: "⑂",
  grid: "▦",
  home: "⌂",
  image: "▧",
  images: "▧",
  information: "i",
  informationcircle: "ⓘ",
  location: "⌖",
  lockclosed: "▣",
  mail: "✉",
  menu: "☰",
  navigate: "➤",
  notifications: "●",
  pausecircle: "Ⅱ",
  people: "♙",
  person: "♙",
  pricetag: "◇",
  pulse: "⌁",
  receipt: "▥",
  refresh: "↻",
  save: "▣",
  search: "⌕",
  send: "➤",
  shieldcheckmark: "⬟",
  star: "★",
  storefront: "⌂",
  sync: "↻",
  time: "◷",
  trash: "⌫",
  trendingup: "↗",
  wallet: "▰",
  warning: "!",
});

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/-(outline|sharp)$/u, "")
    .replaceAll("-", "");
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const flattened = Array.isArray(style)
    ? Object.assign(
        {},
        ...style.filter(
          (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object",
        ),
      )
    : style && typeof style === "object" ? style as Record<string, unknown> : {};

  if (Array.isArray(flattened.transform)) {
    const transformEntries = flattened.transform as readonly unknown[];
    flattened.transform = transformEntries
      .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .flatMap((entry) => Object.entries(entry).map(([operation, value]) => {
        if (operation === "scale" || operation === "scaleX" || operation === "scaleY") {
          return `${operation}(${String(value)})`;
        }
        if (operation === "rotate" || operation === "skewX" || operation === "skewY") {
          return `${operation}(${String(value)})`;
        }
        if (operation === "translateX" || operation === "translateY") {
          return `${operation}(${String(value)}px)`;
        }
        return "";
      }))
      .filter(Boolean)
      .join(" ");
  }

  return flattened;
}

export function WebIconRenderer({
  name,
  size,
  color,
  style,
  accessibilityLabel,
}: IconRendererProps): React.ReactElement {
  const glyph = glyphs[normalizeName(name)] ?? "◆";
  return React.createElement(
    "span",
    {
      role: "img",
      "aria-label": accessibilityLabel ?? name,
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
