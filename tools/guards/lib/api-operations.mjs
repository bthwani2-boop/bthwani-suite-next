/**
 * api-operations.mjs
 *
 * Shared resolution of "which canonical API operation does this call site hit?".
 *
 * Guards that answer that question must agree on the answer, so the path
 * normalization, path-compatibility and call-site extraction rules live here
 * once instead of being re-implemented per guard.
 */

import { ts } from "./typescript-compiler.mjs";

export const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Strip query/hash, collapse every path parameter to a single token, drop trailing slashes. */
export function normalizePath(rawPath) {
  return rawPath
    .replace(/[?#].*$/, "")
    .replace(/\{[^}]+\}/g, "{param}")
    .replace(/`/g, "")
    .replace(/\/+$/, "");
}

export function pathSegments(rawPath) {
  return normalizePath(rawPath).split("/").filter(Boolean);
}

/** True when a call-site path and a contract path differ only in parameter positions. */
export function pathsAreCompatible(candidatePath, contractPath) {
  const candidate = pathSegments(candidatePath);
  const contract = pathSegments(contractPath);
  if (candidate.length !== contract.length) return false;

  return candidate.every((segment, index) => {
    const contractSegment = contract[index];
    return segment === contractSegment || segment === "{param}" || contractSegment === "{param}";
  });
}

export function materializeTemplatePath(node) {
  let value = node.head.text;
  for (const span of node.templateSpans) {
    if (/[?#]/.test(value)) break;
    if (!value.endsWith("/")) {
      // Expressions appended to a complete route are query fragments or other
      // runtime suffixes, not path parameters. The contract path ends here.
      break;
    }
    value += `{param}${span.literal.text}`;
  }
  return value;
}

export function staticPathValue(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return materializeTemplatePath(node);
  }
  return null;
}

export function propertyNameText(name) {
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return "";
}

export function callName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return "";
}

/**
 * Resolve the HTTP method of a call site.
 *
 * Returns the method name, "GET" when a request carries no explicit method, or
 * null when the method is computed at runtime and therefore cannot be proven
 * statically. Callers must treat null as unproven, never as safe.
 */
export function staticMethodFromCall(node, methodArgumentIndex = 1) {
  const name = callName(node).toLowerCase();
  if (["get", "post", "put", "patch", "delete", "options", "head"].includes(name)) {
    return name.toUpperCase();
  }

  const options = node.arguments[methodArgumentIndex];
  if (!options) return "GET";
  if (!ts.isObjectLiteralExpression(options)) return null;

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "method") continue;
    const initializer = property.initializer;
    if (ts.isStringLiteralLike(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
      return initializer.text.toUpperCase();
    }
    return null;
  }
  return "GET";
}

/**
 * Classify how a call site states its HTTP method.
 *
 * Distinguishing "no options object" from "options object with a computed
 * method" matters: the first is an ordinary read helper such as
 * `tryGet(path, mapper)`, while the second genuinely cannot be proven and must
 * not be waved through.
 *
 *   { kind: "callee",  method }  the callee name is itself a method verb
 *   { kind: "literal", method }  options carried a string-literal method
 *   { kind: "dynamic" }          options carried a computed method
 *   { kind: "absent" }           no options object, or no method property
 */
export function classifyCallMethod(node, methodArgumentIndex = 1) {
  const name = callName(node).toLowerCase();
  if (["get", "post", "put", "patch", "delete", "options", "head"].includes(name)) {
    return { kind: "callee", method: name.toUpperCase() };
  }

  const options = node.arguments[methodArgumentIndex];
  if (!options || !ts.isObjectLiteralExpression(options)) return { kind: "absent" };

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== "method") continue;
    const initializer = property.initializer;
    if (ts.isStringLiteralLike(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
      return { kind: "literal", method: initializer.text.toUpperCase() };
    }
    return { kind: "dynamic" };
  }
  return { kind: "absent" };
}

/**
 * Extract every call site whose first argument is a static API path.
 *
 * `callNames` restricts which callee names count as HTTP calls. Each result
 * carries the resolved method (null when dynamic), how that method was
 * determined, the raw path, and the line for diagnostics.
 */
/**
 * Index the module-local indirections that API call sites legitimately use to
 * pick a path, so an indirect path is still provable rather than opaque:
 *
 *   const pathByActor = { partner: "/dsh/...", captain: "/dsh/..." };
 *   function actionPath(id, action) { switch (action) { case "a": return `/dsh/...`; } }
 *
 * Only module-level declarations whose candidate paths are all statically
 * known are indexed. Anything else stays unresolved on purpose.
 */
function indexLocalPathSources(sourceFile) {
  const objectMaps = new Map();
  const pathFunctions = new Map();

  const collectReturnedPaths = (node) => {
    const paths = [];
    const walk = (child) => {
      if (ts.isReturnStatement(child) && child.expression) {
        const value = staticPathValue(child.expression);
        if (value === null) return;
        paths.push(value);
      }
      ts.forEachChild(child, walk);
    };
    walk(node);
    return paths;
  };

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      const paths = collectReturnedPaths(statement.body);
      if (paths.length > 0) pathFunctions.set(statement.name.text, paths);
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      if (!ts.isObjectLiteralExpression(declaration.initializer)) continue;

      const values = [];
      let allLiteral = true;
      for (const property of declaration.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) {
          allLiteral = false;
          break;
        }
        const value = staticPathValue(property.initializer);
        if (value === null) {
          allLiteral = false;
          break;
        }
        values.push(value);
      }
      if (allLiteral && values.length > 0) objectMaps.set(declaration.name.text, values);
    }
  }

  return { objectMaps, pathFunctions };
}

/** Resolve a call's path argument to every path it can statically produce. */
function resolveCandidatePaths(argument, localSources) {
  const direct = staticPathValue(argument);
  if (direct !== null) return [direct];

  if (ts.isElementAccessExpression(argument) && ts.isIdentifier(argument.expression)) {
    return localSources.objectMaps.get(argument.expression.text) ?? [];
  }
  if (ts.isCallExpression(argument) && ts.isIdentifier(argument.expression)) {
    return localSources.pathFunctions.get(argument.expression.text) ?? [];
  }
  return [];
}

export function extractApiCallSites(
  file,
  content,
  {
    callNames,
    pathPattern = /^\/(?:dsh|wlt|identity|providers)\//,
    reportUnresolvedMutationPaths = false,
  } = {},
) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const sites = [];
  const allowed = callNames ? new Set([...callNames].map((name) => name.toLowerCase())) : null;
  const localSources = indexLocalPathSources(sourceFile);

  function visit(node) {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const name = callName(node).toLowerCase();
      if (!allowed || allowed.has(name)) {
        const line = () => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        const candidates = resolveCandidatePaths(node.arguments[0], localSources).filter((candidate) =>
          pathPattern.test(candidate.replace(/[?#].*$/, "")),
        );

        if (candidates.length > 0) {
          const classified = classifyCallMethod(node);
          for (const candidate of candidates) {
            sites.push({
              method: classified.method ?? null,
              methodSource: classified.kind,
              path: candidate,
              line: line(),
            });
          }
        } else if (reportUnresolvedMutationPaths && staticPathValue(node.arguments[0]) === null) {
          // A call whose path stays computed after local resolution cannot be
          // matched to a contract operation. Only surface it when it declares a
          // mutating method, so callers reject unprovable mutations instead of
          // silently skipping them.
          const classified = classifyCallMethod(node);
          if (classified.kind === "literal" && MUTATION_METHODS.has(classified.method)) {
            sites.push({
              method: classified.method,
              methodSource: classified.kind,
              path: null,
              line: line(),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return sites;
}
