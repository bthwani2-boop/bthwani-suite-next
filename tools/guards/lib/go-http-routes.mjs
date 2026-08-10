import fs from "node:fs";
import path from "node:path";

function scannerState() {
  return { mode: "normal", escaped: false };
}

function advanceLexicalState(text, index, state) {
  const ch = text[index];
  const next = text[index + 1];

  if (state.mode === "line-comment") {
    if (ch === "\n") state.mode = "normal";
    return { consumed: 1, structural: false };
  }
  if (state.mode === "block-comment") {
    if (ch === "*" && next === "/") {
      state.mode = "normal";
      return { consumed: 2, structural: false };
    }
    return { consumed: 1, structural: false };
  }
  if (state.mode === "raw-string") {
    if (ch === "`") state.mode = "normal";
    return { consumed: 1, structural: false };
  }
  if (state.mode === "quoted-string" || state.mode === "rune") {
    if (state.escaped) {
      state.escaped = false;
      return { consumed: 1, structural: false };
    }
    if (ch === "\\") {
      state.escaped = true;
      return { consumed: 1, structural: false };
    }
    if ((state.mode === "quoted-string" && ch === '"') || (state.mode === "rune" && ch === "'")) {
      state.mode = "normal";
    }
    return { consumed: 1, structural: false };
  }

  if (ch === "/" && next === "/") {
    state.mode = "line-comment";
    return { consumed: 2, structural: false };
  }
  if (ch === "/" && next === "*") {
    state.mode = "block-comment";
    return { consumed: 2, structural: false };
  }
  if (ch === '"') {
    state.mode = "quoted-string";
    state.escaped = false;
    return { consumed: 1, structural: false };
  }
  if (ch === "'") {
    state.mode = "rune";
    state.escaped = false;
    return { consumed: 1, structural: false };
  }
  if (ch === "`") {
    state.mode = "raw-string";
    return { consumed: 1, structural: false };
  }
  return { consumed: 1, structural: true };
}

export function findMatchingDelimiter(text, openIndex, openChar = "(", closeChar = ")") {
  if (text[openIndex] !== openChar) return -1;
  const state = scannerState();
  let depth = 0;
  for (let index = openIndex; index < text.length; ) {
    const lexical = advanceLexicalState(text, index, state);
    if (lexical.structural) {
      if (text[index] === openChar) depth += 1;
      if (text[index] === closeChar) {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    index += lexical.consumed;
  }
  return -1;
}

export function splitTopLevelArguments(text) {
  const parts = [];
  const state = scannerState();
  let start = 0;
  let parens = 0;
  let brackets = 0;
  let braces = 0;

  for (let index = 0; index < text.length; ) {
    const lexical = advanceLexicalState(text, index, state);
    if (lexical.structural) {
      const ch = text[index];
      if (ch === "(") parens += 1;
      else if (ch === ")") parens -= 1;
      else if (ch === "[") brackets += 1;
      else if (ch === "]") brackets -= 1;
      else if (ch === "{") braces += 1;
      else if (ch === "}") braces -= 1;
      else if (ch === "," && parens === 0 && brackets === 0 && braces === 0) {
        parts.push(text.slice(start, index).trim());
        start = index + 1;
      }
    }
    index += lexical.consumed;
  }

  const tail = text.slice(start).trim();
  if (tail || parts.length > 0) parts.push(tail);
  return parts;
}

export function parseGoStringLiteral(expression) {
  const text = expression.trim();
  if (text.startsWith("`") && text.endsWith("`") && text.length >= 2) {
    return text.slice(1, -1);
  }
  if (!text.startsWith('"') || !text.endsWith('"')) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseHandlerExpression(expression) {
  const text = expression.trim();
  const direct = text.match(/^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/);
  if (direct) {
    return {
      kind: "direct",
      receiver: direct[1],
      handlerName: direct[2],
      surfaceExpression: null,
      permissionExpression: null,
    };
  }

  const wrapped = text.match(/^([A-Za-z_]\w*)\.withPermission\s*\(/);
  if (!wrapped) {
    return {
      kind: "other",
      receiver: null,
      handlerName: null,
      surfaceExpression: null,
      permissionExpression: null,
    };
  }
  const openIndex = text.indexOf("(", wrapped[0].length - 1);
  const closeIndex = findMatchingDelimiter(text, openIndex);
  if (closeIndex !== text.length - 1) {
    return {
      kind: "other",
      receiver: wrapped[1],
      handlerName: null,
      surfaceExpression: null,
      permissionExpression: null,
    };
  }
  const args = splitTopLevelArguments(text.slice(openIndex + 1, closeIndex));
  const handler = args[2]?.match(/^([A-Za-z_]\w*)\.([A-Za-z_]\w*)$/);
  return {
    kind: "withPermission",
    receiver: wrapped[1],
    handlerName: handler?.[2] ?? null,
    surfaceExpression: args[0] ?? null,
    permissionExpression: args[1] ?? null,
  };
}

export function parseHandleFuncRegistrations(source, { filePath = "" } = {}) {
  const registrations = [];
  const pattern = /\b([A-Za-z_]\w*)\.HandleFunc\s*\(/g;
  let match;
  while ((match = pattern.exec(source))) {
    const openIndex = source.indexOf("(", match.index + match[0].lastIndexOf("HandleFunc"));
    if (openIndex < 0) continue;
    const closeIndex = findMatchingDelimiter(source, openIndex);
    if (closeIndex < 0) continue;
    const args = splitTopLevelArguments(source.slice(openIndex + 1, closeIndex));
    if (args.length < 2) {
      pattern.lastIndex = closeIndex + 1;
      continue;
    }
    const routePattern = parseGoStringLiteral(args[0]);
    const routeMatch = routePattern?.match(/^([A-Z]+)\s+(.+)$/);
    if (!routeMatch) {
      pattern.lastIndex = closeIndex + 1;
      continue;
    }
    const handlerExpression = args[1].trim();
    registrations.push({
      receiver: match[1],
      method: routeMatch[1],
      path: routeMatch[2],
      route: `${routeMatch[1]} ${routeMatch[2]}`,
      handlerExpression,
      handler: parseHandlerExpression(handlerExpression),
      filePath,
      line: source.slice(0, match.index).split("\n").length,
    });
    pattern.lastIndex = closeIndex + 1;
  }
  return registrations;
}

export function listGoFiles(directory, { recursive = true } = {}) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...listGoFiles(fullPath, { recursive: true }));
      continue;
    }
    if (entry.name.endsWith(".go") && !entry.name.endsWith("_test.go")) files.push(fullPath);
  }
  return files;
}

export function collectHandleFuncRegistrations(directory, { recursive = true } = {}) {
  const registrations = [];
  for (const filePath of listGoFiles(directory, { recursive })) {
    const source = fs.readFileSync(filePath, "utf8");
    registrations.push(...parseHandleFuncRegistrations(source, { filePath }));
  }
  return registrations;
}
