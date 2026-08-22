import path from "node:path";

// Go advisories match a module version, not the packages a build imports.
// golang.org/x/crypto is the standing case: its openpgp advisory covers every
// version of the module and will never have a fixed release, while this
// repository only imports bcrypt from it. No dependency bump can satisfy a
// module-level verdict there, and ignoring the advisory by id would also hide
// the day one of those packages is imported for real.
//
// So a Go finding is adjudicated against the module's own import graph. It is
// dismissed only when the advisory names the vulnerable import paths and the
// graph contains none of them. Unknown scope, an unresolvable graph, and every
// other ecosystem stay blocking.

export function scopedGoImports(vulnerability, packageName) {
  const imports = new Set();
  for (const affected of vulnerability?.affected ?? []) {
    if (affected.package?.ecosystem !== "Go") continue;
    if (affected.package?.name !== packageName) continue;
    for (const entry of affected.ecosystem_specific?.imports ?? []) {
      if (entry?.path) imports.add(entry.path);
    }
  }
  return [...imports];
}

/**
 * @param {object} options
 * @param {object} options.report parsed osv-scanner JSON report
 * @param {string} options.repoRoot absolute repository root
 * @param {(vulnerability: object, packageName: string) => Promise<string[]>} options.resolveScopedImports
 * @param {(goModAbsolutePath: string) => Set<string> | null} options.importGraph
 */
export async function adjudicateOsvReport({ report, repoRoot, resolveScopedImports, importGraph }) {
  const blocking = [];
  const unreachable = [];

  for (const result of report?.results ?? []) {
    const rawSource = result.source?.path ?? "";
    const absoluteSource = path.isAbsolute(rawSource) ? rawSource : path.join(repoRoot, rawSource);
    const source = path.relative(repoRoot, absoluteSource).split(path.sep).join("/");
    const isGoModule = source.endsWith("go.mod");

    for (const entry of result.packages ?? []) {
      const ecosystem = entry.package?.ecosystem;
      const name = entry.package?.name;
      const version = entry.package?.version;

      for (const vulnerability of entry.vulnerabilities ?? []) {
        const finding = { id: vulnerability.id, source, name, version };
        if (!isGoModule || ecosystem !== "Go") {
          blocking.push({ ...finding, reason: "no import-level reachability evidence exists for this ecosystem" });
          continue;
        }
        const vulnerableImports = await resolveScopedImports(vulnerability, name);
        if (vulnerableImports.length === 0) {
          blocking.push({ ...finding, reason: "the advisory does not scope the vulnerability to import paths" });
          continue;
        }
        const graph = importGraph(absoluteSource);
        if (!graph) {
          blocking.push({ ...finding, reason: "the module import graph could not be resolved" });
          continue;
        }
        const reached = vulnerableImports.filter((importPath) => graph.has(importPath));
        if (reached.length > 0) {
          blocking.push({ ...finding, reason: `the build imports ${reached.join(", ")}` });
          continue;
        }
        unreachable.push({ ...finding, vulnerableImports });
      }
    }
  }

  return { blocking, unreachable };
}
