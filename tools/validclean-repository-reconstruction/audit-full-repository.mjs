import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
if (!root || !out) throw new Error("usage: node audit-full-repository.mjs <repo> <out>");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const git = (args) => execFileSync("git", ["-C", root, ...args], {
  encoding: "utf8", maxBuffer: 128 * 1024 * 1024,
}).trim();
const sha = git(["rev-parse", "HEAD"]);
const files = git(["ls-files", "-z"]).split("\0").filter(Boolean).sort();

const P = {
  noise: /(^|\/)(archive|archives|backup|backups|evidence|reports?|tmp|temp|obsolete|deprecated|legacy|old|copies|copy)(\/|$)|(^|[._-])(backup|copy|old|legacy|deprecated|obsolete|tmp|temp|draft|pasted)([._-]|$)/i,
  generated: /(^|\/)(generated|dist|build|coverage|artifacts?)(\/|$)|\.generated\./i,
  test: /(^|\/)(__tests__|tests?|specs?)(\/|$)|(?:^|[._-])(test|spec)\.[^.]+$/i,
  db: /(^|\/)(database|migrations?|indexes|seeds)(\/|$)/i,
  governance: /(^|\/)(governance|\.agents)(\/|$)|(^|\/)AGENTS\.md$/i,
  runtime: /(^|\/)(infra|runtime|docker|compose|\.github\/workflows)(\/|$)|docker-compose|Dockerfile/i,
  contract: /(^|\/)(contracts?)(\/|$)|openapi|swagger/i,
  security: /(auth|identity|permission|role|tenant|session|device|activation|otp|secret|security|scope)/i,
  finance: /(wlt|wallet|ledger|payment|refund|settlement|commission|payout|cod|finance|financial|money)/i,
};
const textExt = new Set([".c",".cc",".cpp",".css",".csv",".go",".graphql",".h",".html",".java",".js",".json",".jsx",".kt",".kts",".md",".mjs",".ps1",".py",".rb",".rs",".scss",".sh",".sql",".svg",".toml",".ts",".tsx",".txt",".xml",".yaml",".yml"]);
const findings = [];
const records = [];
const hashes = new Map();
const basenames = new Map();
const operationOwners = new Map();
const migrationSeq = new Map();
const stateMarkers = new Map();
const counts = { kind: {}, top: {}, signal: {}, extension: {}, bytes: 0, lines: 0 };
const inc = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };
const add = (priority, code, file, detail) => findings.push({ priority, code, path: file, detail });

function ext(file) {
  const base = path.basename(file);
  if (base === "Dockerfile") return ".dockerfile";
  if (base.startsWith(".env")) return ".env";
  return path.extname(base).toLowerCase() || "<none>";
}
function kind(file) {
  if (P.generated.test(file)) return "generated";
  if (P.db.test(file)) return "database";
  if (P.test.test(file)) return "test";
  if (P.governance.test(file)) return "governance";
  if (P.runtime.test(file)) return "runtime";
  if (P.contract.test(file)) return "contract";
  if (/\.(md|txt)$/i.test(file)) return "documentation";
  if (/\.(png|jpe?g|gif|webp|ico|pdf|docx|xlsx|pptx|zip|gz|tar|woff2?|ttf|otf)$/i.test(file)) return "asset";
  if (/(^|\/)(tools?|scripts?)(\/|$)/i.test(file)) return "tooling";
  return "source";
}
function readText(file, size) {
  const e = ext(file);
  if (size > 2_000_000 || (e !== "<none>" && e !== ".env" && !textExt.has(e))) return null;
  const b = fs.readFileSync(path.join(root, file));
  return b.includes(0) ? null : b.toString("utf8").replace(/\r\n/g, "\n");
}
function inspectPackage(file, text) {
  try {
    const value = JSON.parse(text);
    const aliases = new Map();
    for (const [name, cmd] of Object.entries(value.scripts || {})) {
      const normalized = String(cmd).replace(/\s+/g, " ").trim();
      if (!aliases.has(normalized)) aliases.set(normalized, []);
      aliases.get(normalized).push(name);
    }
    for (const [cmd, names] of aliases) if (names.length > 1) add("P2", "DUPLICATE_SCRIPT_ALIAS", file, `${names.join(", ")} => ${cmd}`);
    return { name: value.name || null, scripts: Object.keys(value.scripts || {}).length };
  } catch (error) {
    add("P0", "INVALID_PACKAGE_JSON", file, error.message);
    return null;
  }
}
function inspectOpenApi(file, text) {
  const meta = {};
  for (const key of ["x-bthwani-owner","x-bthwani-contract-state","x-bthwani-contract-role","x-bthwani-client-generation"]) {
    meta[key] = text.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]?.replace(/["']/g, "") || null;
  }
  if (!meta["x-bthwani-owner"]) add("P1", "OPENAPI_OWNER_MISSING", file, "Missing x-bthwani-owner");
  if (!meta["x-bthwani-contract-state"]) add("P1", "OPENAPI_STATE_MISSING", file, "Missing x-bthwani-contract-state");
  const ids = [...text.matchAll(/^\s+operationId:\s*(\S+)/gm)].map((m) => m[1]);
  for (const id of ids) {
    if (!operationOwners.has(id)) operationOwners.set(id, []);
    operationOwners.get(id).push(file);
  }
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) add("P0", "DUPLICATE_OPERATION_ID_IN_FILE", file, dup.join(", "));
  return { ...meta, operations: ids.length };
}
function inspectWorkflow(file, text) {
  if (/permissions:\s*[\s\S]{0,400}?contents:\s*write/m.test(text)) add("P0", "WORKFLOW_CONTENTS_WRITE", file, "contents: write requires explicit proof");
  if (/git\s+(push|commit)|gh\s+pr\s+merge|api\.github\.com[^\n]+git\/refs/i.test(text)) add("P0", "WORKFLOW_SOURCE_MUTATION", file, "source mutation or merge behavior");
  for (const m of text.matchAll(/uses:\s*([^\s#]+)@([^\s#]+)/g)) if (!m[1].startsWith("./") && !/^[0-9a-f]{40}$/i.test(m[2])) add("P1", "UNPINNED_ACTION", file, `${m[1]}@${m[2]}`);
}

for (const file of files) {
  const abs = path.join(root, file);
  const st = fs.statSync(abs);
  const buffer = fs.readFileSync(abs);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const text = readText(file, st.size);
  const k = kind(file);
  const signals = [];
  if (P.noise.test(file)) signals.push("NOISE_NAMING");
  if (P.generated.test(file)) signals.push("GENERATED_PATH");
  if (st.size === 0) signals.push("EMPTY_FILE");
  if (text && /(?:C:\\|C:\/|file:\/\/\/c%3A\/)/i.test(text)) signals.push("ABSOLUTE_WINDOWS_PATH");
  if (text && /(TODO|FIXME|HACK|TEMPORARY|PLACEHOLDER|NOT_IMPLEMENTED)/.test(text)) signals.push("UNRESOLVED_MARKER");
  if (text && /(PLAN_ONLY_AWAITING_OWNER_APPROVAL|READY_FOR_OWNER_REVIEW|EXECUTION_IN_PROGRESS|CLOSED_WITH_EVIDENCE)/.test(text)) signals.push("STATE_MARKER");
  if (k === "generated" && text && !/(generated|do not edit|@generated)/i.test(text.slice(0, 800))) signals.push("GENERATED_WITHOUT_PROVENANCE_HEADER");
  if (signals.includes("NOISE_NAMING")) add("P2", "NOISE_PATH_CANDIDATE", file, "archive/backup/legacy/evidence naming needs a retention decision");
  if (signals.includes("EMPTY_FILE")) add("P2", "EMPTY_TRACKED_FILE", file, "tracked empty file");
  if (signals.includes("ABSOLUTE_WINDOWS_PATH")) add("P1", "ABSOLUTE_LOCAL_PATH", file, "absolute local path or file URI");
  if (signals.includes("GENERATED_WITHOUT_PROVENANCE_HEADER")) add("P1", "GENERATED_PROVENANCE_MISSING", file, "generated path lacks provenance marker");

  let packageMeta = null, openapiMeta = null;
  if (text && path.basename(file) === "package.json") packageMeta = inspectPackage(file, text);
  if (text && /\.openapi\.ya?ml$/i.test(file)) openapiMeta = inspectOpenApi(file, text);
  if (text && /^\.github\/workflows\/.*\.ya?ml$/i.test(file)) inspectWorkflow(file, text);
  if (text) for (const m of text.matchAll(/(?:status|الحالة)\s*[:：]\s*`?([A-Z][A-Z0-9_]+)`?/g)) {
    if (!stateMarkers.has(m[1])) stateMarkers.set(m[1], []);
    stateMarkers.get(m[1]).push(file);
  }

  if (!hashes.has(hash)) hashes.set(hash, []); hashes.get(hash).push(file);
  const base = path.basename(file).toLowerCase();
  if (!basenames.has(base)) basenames.set(base, []); basenames.get(base).push(file);
  const mm = file.match(/(^|\/)(migrations?|indexes|seeds)\/([^/]*?)(\d{3,})[^/]*$/i);
  if (mm) {
    const key = `${file.slice(0, file.lastIndexOf("/"))}:${mm[4]}`;
    if (!migrationSeq.has(key)) migrationSeq.set(key, []); migrationSeq.get(key).push(file);
  }
  const top = file.includes("/") ? file.split("/")[0] : "<root>";
  const rec = { path: file, topLevel: top, directory: path.dirname(file), extension: ext(file), kind: k, bytes: st.size, lines: text ? text.split("\n").length : null, sha256: hash, securityProtected: P.security.test(file), financialProtected: P.finance.test(file), migrationProtected: P.db.test(file), runtimeProtected: P.runtime.test(file), signals, package: packageMeta, openapi: openapiMeta };
  records.push(rec);
  inc(counts.kind, k); inc(counts.top, top); inc(counts.extension, rec.extension); for (const s of signals) inc(counts.signal, s);
  counts.bytes += st.size; counts.lines += rec.lines || 0;
}

for (const [hash, group] of hashes) if (group.length > 1 && !group.every((f) => /lock\.yaml|package-lock\.json|yarn\.lock/i.test(f))) add("P2", "EXACT_DUPLICATE_CONTENT", group[0], `${group.length} files ${hash.slice(0, 12)}: ${group.join(" | ")}`);
for (const [base, group] of basenames) if (group.length >= 5 && !["index.ts","index.tsx","package.json","readme.md","go.mod","go.sum"].includes(base)) add("P2", "REPEATED_BASENAME", group[0], `${base} occurs ${group.length} times`);
for (const [key, group] of migrationSeq) if (group.length > 1) add("P0", "DUPLICATE_MIGRATION_SEQUENCE", group[0], `${key}: ${group.join(" | ")}`);
for (const [id, group] of operationOwners) { const unique = [...new Set(group)]; if (unique.length > 1) add("P0", "CROSS_CONTRACT_OPERATION_ID_DUPLICATE", unique[0], `${id}: ${unique.join(" | ")}`); }
const masters = records.filter((r) => r.openapi?.["x-bthwani-contract-role"] === "MASTER_INDEX_ONLY");
if (masters.length !== 1 || masters[0]?.path !== "contracts/master.openapi.yaml") add("P0", "MASTER_OPENAPI_CARDINALITY", masters[0]?.path || "<none>", `found: ${masters.map((r) => r.path).join(", ") || "none"}`);
if (stateMarkers.size > 1) add("P1", "CONFLICTING_STATE_MARKERS", "tools/validclean-repository-reconstruction", [...stateMarkers].map(([m, f]) => `${m}=${f.length}`).join(", "));

const order = { P0: 0, P1: 1, P2: 2 };
findings.sort((a, b) => order[a.priority] - order[b.priority] || a.code.localeCompare(b.code) || a.path.localeCompare(b.path));
const summary = {
  targetSha: sha, generatedAt: new Date().toISOString(), totalPaths: records.length,
  protected: {
    security: records.filter((r) => r.securityProtected).length,
    financial: records.filter((r) => r.financialProtected).length,
    migration: records.filter((r) => r.migrationProtected).length,
    runtime: records.filter((r) => r.runtimeProtected).length,
  },
  findings: { total: findings.length, P0: findings.filter((f) => f.priority === "P0").length, P1: findings.filter((f) => f.priority === "P1").length, P2: findings.filter((f) => f.priority === "P2").length },
  counts,
};
fs.writeFileSync(path.join(out, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(out, "inventory.ndjson"), records.map((r) => JSON.stringify(r)).join("\n") + "\n");
fs.writeFileSync(path.join(out, "findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
fs.writeFileSync(path.join(out, "findings.md"), [
  `# Full repository audit`, ``, `- Target SHA: \`${sha}\``, `- Paths: ${records.length}`, `- Findings: P0=${summary.findings.P0}, P1=${summary.findings.P1}, P2=${summary.findings.P2}`, ``,
  ...findings.map((f) => `- **${f.priority} ${f.code}** — \`${f.path}\`: ${f.detail}`), ``,
].join("\n"));
console.log(JSON.stringify(summary, null, 2));
console.log("AUDIT_FINDINGS_BEGIN");
for (const f of findings.slice(0, 400)) console.log(`${f.priority}\t${f.code}\t${f.path}\t${f.detail}`);
console.log("AUDIT_FINDINGS_END");
if (findings.length > 400) console.log(`AUDIT_FINDINGS_TRUNCATED=${findings.length - 400}`);
