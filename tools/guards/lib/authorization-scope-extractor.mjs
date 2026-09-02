import fs from "node:fs";
import path from "node:path";
import { findMatchingDelimiter, listGoFiles, parseGoStringLiteral } from "./go-scanner.mjs";

const scanTargets = [
  {
    root: "core/workforce/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /providerSelf\(\s*"([^"]+)"/g,
      /anyAuthenticated\(\s*"([^"]+)"/g,
      /resolveReferenceOperator\([^)]*?,\s*"([^"]+)"\s*\)/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
      /hasWorkforceScope\(\s*identity,\s*"([^"]+)"/g,
      /changeDepartmentEmployeeStatus\([^)]*?,\s*"([^"]+)"/g,
      /requireEmployeeTarget\(\s*w,\s*identity,\s*"([^"]+)"/g,
    ],
  },
  {
    root: "core/providers/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
    ],
  },
  {
    root: "core/platform-control/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
    ],
  },
  {
    root: "services/dsh/backend",
    patterns: [
      /requirePermission\(\s*w,\s*r,\s*"[^"]*",\s*"([a-zA-Z][a-zA-Z0-9_.:-]*)"/g,
      /require(?!Permission\()[A-Za-z]*Permission\(\s*w,\s*r,\s*(?:"[^"]*",\s*)?"([a-zA-Z][a-zA-Z0-9_.:-]*)"/g,
      /require[A-Za-z]*Permission\(\s*w,\s*r,\s*(?:"[^"]*",\s*)?([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
      /serve[A-Za-z]*PermissionHandler\(\s*w,\s*r,[\s\S]*?,\s*([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
      /\.withPermission\(\s*"[^"]*",\s*([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
      /\.withPermission\(\s*"[^"]*",\s*"([a-zA-Z][a-zA-Z0-9_.:-]*)"\s*[,)]/g,
    ],
  },
];

export function relativeGoFiles(repositoryRoot, rootRelative) {
  const root = path.join(repositoryRoot, rootRelative);
  return listGoFiles(root, { recursive: true }).map((absolute) => ({
    absolute,
    relative: path.relative(repositoryRoot, absolute).replaceAll("\\", "/"),
  }));
}

export function collectDshPermissionConstants(repositoryRoot) {
  const constants = new Map();
  const sources = new Map();
  const constPattern = /([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*=\s*("(?:\\.|[^"\\])*"|`[^`]*`)/g;
  for (const { absolute, relative } of relativeGoFiles(repositoryRoot, "services/dsh/backend")) {
    const text = fs.readFileSync(absolute, "utf8");
    for (const match of text.matchAll(constPattern)) {
      const value = parseGoStringLiteral(match[2]);
      if (!value) continue;
      constants.set(match[1], value);
      sources.set(match[1], relative);
    }
  }
  return { constants, sources };
}

function collectDshPermissionReturningFunctions(repositoryRoot, constants) {
  const functions = new Map();
  const functionPattern = /func\s+(?:\([^)]*\)\s*)?([A-Za-z][A-Za-z0-9]*)\s*\([^)]*\)\s+string\s*\{/g;
  const returnPattern = /\breturn\s+([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*|"(?:\\.|[^"\\])*"|`[^`]*`)/g;

  for (const { absolute, relative } of relativeGoFiles(repositoryRoot, "services/dsh/backend")) {
    const text = fs.readFileSync(absolute, "utf8");
    functionPattern.lastIndex = 0;
    for (const match of text.matchAll(functionPattern)) {
      const bodyStart = text.indexOf("{", match.index + match[0].length - 1);
      const bodyEnd = findMatchingDelimiter(text, bodyStart, "{", "}");
      if (bodyStart < 0 || bodyEnd < 0) continue;
      const body = text.slice(bodyStart + 1, bodyEnd);
      const permissions = new Set();
      returnPattern.lastIndex = 0;
      for (const returned of body.matchAll(returnPattern)) {
        const literal = parseGoStringLiteral(returned[1]);
        if (literal) permissions.add(literal);
        else if (constants.has(returned[1])) permissions.add(constants.get(returned[1]));
      }
      if (permissions.size > 0) functions.set(match[1], { permissions, source: relative });
    }
  }
  return functions;
}

export function resolveDshPermissionExpression(expression, constants, dynamicFunctions = new Map()) {
  if (!expression) return new Set();
  const literal = parseGoStringLiteral(expression);
  if (literal) return new Set([literal]);

  const identifier = expression.trim();
  if (constants.has(identifier)) return new Set([constants.get(identifier)]);

  const call = identifier.match(/^([A-Za-z][A-Za-z0-9]*)\s*\(/);
  if (call && dynamicFunctions.has(call[1])) return new Set(dynamicFunctions.get(call[1]).permissions);
  return new Set();
}

export function collectEnforcedAuthorizationScopes(repositoryRoot) {
  const failures = [];
  const enforced = new Set();
  const sources = new Map();
  const { constants: dshConstants } = collectDshPermissionConstants(repositoryRoot);
  const dynamicFunctions = collectDshPermissionReturningFunctions(repositoryRoot, dshConstants);

  const add = (permission, source) => {
    if (!permission) return;
    enforced.add(permission);
    if (!sources.has(permission)) sources.set(permission, new Set());
    sources.get(permission).add(source);
  };

  for (const target of scanTargets) {
    for (const { absolute, relative } of relativeGoFiles(repositoryRoot, target.root)) {
      const text = fs.readFileSync(absolute, "utf8");
      for (const pattern of target.patterns) {
        pattern.lastIndex = 0;
        for (const match of text.matchAll(pattern)) {
          const token = match[1];
          if (!token) continue;
          if (/^[A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*$/.test(token) && !token.includes(".")) {
            const resolved = dshConstants.get(token);
            if (resolved) add(resolved, relative);
            else failures.push(`services/dsh/backend: unresolved permission constant '${token}' referenced in ${relative}`);
          } else {
            add(token, relative);
          }
        }
      }

      if (target.root === "services/dsh/backend") {
        const dynamicSinkPattern = /require[A-Za-z0-9]*Permission\(\s*w\s*,\s*r\s*,\s*(?:"(?:\\.|[^"\\])*"\s*,\s*)?([A-Za-z][A-Za-z0-9]*)\s*\(/g;
        for (const match of text.matchAll(dynamicSinkPattern)) {
          const helperName = match[1];
          const helper = dynamicFunctions.get(helperName);
          if (!helper) {
            failures.push(`${relative}: permission guard references unresolved permission helper '${helperName}'`);
            continue;
          }
          for (const permission of helper.permissions) add(permission, `${relative} -> ${helper.source}:${helperName}`);
        }
      }
    }
  }

  return { enforced, sources, dshConstants, dynamicFunctions, failures };
}
