import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const roots = [
  "services/dsh/frontend",
  "services/wlt/frontend/shared/dsh",
  "apps/control-panel/runtime/src",
];

const ignored = /(?:\.test|\.spec|\.stories)\.[jt]sx$|\/__tests__\//;
const actionProps = new Set([
  "onPress",
  "onClick",
  "onActionPress",
  "onLongPress",
  "href",
  "to",
  "action",
]);
const valueProps = new Set([
  "onValueChange",
  "onChange",
  "onCheckedChange",
  "onSelectionChange",
]);
const exactValueControls = new Set([
  "SegmentedControl",
  "Switch",
  "Select",
  "Checkbox",
  "RadioGroup",
]);

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.[jt]sx$/.test(entry.name) && !ignored.test(full.replaceAll("\\", "/"))) {
      files.push(full);
    }
  }
  return files;
}

function tagName(node) {
  const tag = node.tagName;
  if (ts.isIdentifier(tag)) return tag.text;
  return tag.getText();
}

function isInteractive(name) {
  if (name === "button" || name === "a") return true;
  if (exactValueControls.has(name)) return true;
  return /(Button|Pressable|TouchableOpacity|TouchableHighlight|MenuItem|Link)$/.test(name);
}

function attributeMap(node) {
  const map = new Map();
  let hasSpread = false;
  for (const property of node.attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      hasSpread = true;
      continue;
    }
    map.set(property.name.text, property);
  }
  return { map, hasSpread };
}

function expressionText(attribute, sourceFile) {
  if (!attribute?.initializer) return "";
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) {
    return attribute.initializer.expression?.getText(sourceFile) ?? "";
  }
  return attribute.initializer.getText(sourceFile);
}

function emptyHandler(attribute) {
  const initializer = attribute?.initializer;
  if (!initializer || !ts.isJsxExpression(initializer)) return !initializer;
  const expression = initializer.expression;
  if (!expression) return true;
  if (
    expression.kind === ts.SyntaxKind.NullKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.UndefinedKeyword
  ) {
    return true;
  }
  if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
    return ts.isBlock(expression.body) && expression.body.statements.length === 0;
  }
  return false;
}

const files = roots.flatMap((root) => walk(root)).sort();
const violations = [];
const inventory = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.JSX,
  );

  function inspect(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = tagName(node);
      if (isInteractive(name)) {
        const { map, hasSpread } = attributeMap(node);
        const requiredProps = exactValueControls.has(name) ? valueProps : actionProps;
        const bindings = [...requiredProps].filter((prop) => map.has(prop));
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const normalizedFile = file.replaceAll("\\", "/");
        const record = {
          file: normalizedFile,
          line,
          element: name,
          bindings,
          spreadBound: hasSpread,
        };
        inventory.push(record);

        if (name === "button" && expressionText(map.get("type"), sourceFile) === "submit") {
          return ts.forEachChild(node, inspect);
        }
        if (bindings.length === 0 && !hasSpread) {
          violations.push({ ...record, reason: "INTERACTIVE_ELEMENT_WITHOUT_BINDING" });
        }
        for (const binding of bindings) {
          const attribute = map.get(binding);
          const text = expressionText(attribute, sourceFile).trim();
          if (emptyHandler(attribute)) {
            violations.push({ ...record, binding, reason: "EMPTY_INTERACTION_BINDING" });
          }
          if ((binding === "href" || binding === "to") && /^(#|javascript:void\(0\))$/.test(text)) {
            violations.push({ ...record, binding, reason: "PLACEHOLDER_NAVIGATION_BINDING" });
          }
        }
      }
    }
    ts.forEachChild(node, inspect);
  }

  inspect(sourceFile);
}

console.log(
  JSON.stringify(
    {
      guard: "ui-action-binding-gate",
      scannedFiles: files.length,
      interactiveElements: inventory.length,
      violations,
      inventory,
    },
    null,
    2,
  ),
);

if (violations.length > 0) {
  process.exit(1);
}
