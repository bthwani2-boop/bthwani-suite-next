import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policyPath = path.join(repoRoot, "governance/cleanup/repository-retention-policy.json");
const reportPath = path.resolve(
  repoRoot,
  process.env.BTHWANI_CLEANUP_REPORT ?? ".diagnostics/repository-cleanup/report.json",
);
const apply = process.argv.includes("--apply");

function runGit(args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(`git ${args.join(" ")} failed: ${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout ?? "";
}

function trackedFiles() {
  return runGit(["ls-files", "-z"])
    .split("\0")
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean)
    .sort();
}

function fileAgeDays(file) {
  const timestamp = Number(runGit(["log", "-1", "--format=%ct", "--", file], true).trim());
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Math.floor((Date.now() - timestamp * 1000) / 86_400_000);
}

function readText(file) {
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) return "";
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return "";
  return fs.readFileSync(absolute, "utf8");
}

function normalizedHash(content) {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized ? crypto.createHash("sha256").update(normalized).digest("hex") : "";
}

function isDocument(file, roots) {
  return /\.(?:md|txt|json)$/i.test(file) && roots.some((root) => file.startsWith(root));
}

function isProtected(file) {
  return /(^|\/)(?:migrations?|contracts?)(\/|$)/i.test(file)
    || /\.openapi\.ya?ml$/i.test(file)
    || /(^|\/)audit(\/|$)/i.test(file);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const files = trackedFiles();
const documentRoots = policy.documents?.roots ?? [];
const evidenceRoots = policy.evidence?.roots ?? [];
const permanentEvidenceRoots = policy.evidence?.permanentRoots ?? [];
const allowedLogRoots = policy.allowedTrackedLogRoots ?? [];
const archiveRoot = policy.documents?.archiveRoot ?? "governance/archive/";
const retiredMarkers = (policy.documents?.retiredMarkers ?? []).map((value) => String(value).toLowerCase());
const forbiddenNameRegexes = (policy.forbiddenTrackedFilenamePatterns ?? []).map((pattern) => new RegExp(pattern, "i"));
const referenceText = (policy.evidence?.referenceIndexes ?? [])
  .map((file) => readText(file))
  .join("\n");
const contentByFile = new Map(files.map((file) => [file, readText(file)]));
const deletions = new Map();
const blocked = [];

function mark(file, reason, classification) {
  if (!file || deletions.has(file)) return;
  if (isProtected(file)) {
    blocked.push({ file, reason, classification, block: "protected-path" });
    return;
  }
  deletions.set(file, { file, reason, classification });
}

for (const file of files) {
  const lower = file.toLowerCase();
  const generatedRoot = (policy.generatedOutputRoots ?? []).find((root) => lower.startsWith(String(root).toLowerCase()));
  if (generatedRoot) mark(file, `tracked generated output under ${generatedRoot}`, "generated-output");

  const transientRoot = (policy.forbiddenTrackedPathPrefixes ?? []).find((root) => lower.startsWith(String(root).toLowerCase()));
  if (transientRoot) mark(file, `tracked transient path under ${transientRoot}`, "temporary");

  const transientName = forbiddenNameRegexes.find((regex) => regex.test(file));
  if (transientName) mark(file, `tracked transient filename matching ${transientName}`, "temporary");

  if (lower.endsWith(".log") && !allowedLogRoots.some((root) => lower.startsWith(String(root).toLowerCase()))) {
    mark(file, "tracked runtime/diagnostic log outside approved evidence root", "generated-output");
  }

  if (isDocument(file, documentRoots)) {
    const content = contentByFile.get(file) ?? "";
    const normalized = content.trim();
    if (policy.documents?.deleteEmptyDocuments === true && normalized.length === 0) {
      mark(file, "empty document", "empty-document");
    }
    if (!lower.startsWith(archiveRoot.toLowerCase())) {
      const marker = retiredMarkers.find((value) => content.toLowerCase().includes(value));
      if (marker) mark(file, `document explicitly marked ${marker}`, "retired-document");
    }
  }

  const isEvidence = evidenceRoots.some((root) => lower.startsWith(String(root).toLowerCase()));
  const isPermanentEvidence = permanentEvidenceRoots.some((root) => lower.startsWith(String(root).toLowerCase()));
  if (isEvidence && !isPermanentEvidence) {
    const ageDays = fileAgeDays(file);
    const basename = path.posix.basename(file);
    const referenced = referenceText.includes(file) || referenceText.includes(basename);
    if (
      ageDays !== null
      && ageDays > Number(policy.evidence?.maximumUnreferencedAgeDays ?? 180)
      && !referenced
    ) {
      mark(file, `unreferenced evidence older than ${ageDays} days`, "stale-evidence");
    }
  }
}

const maintenance = policy.maintenanceScripts ?? {};
for (const file of files) {
  if (!file.startsWith(String(maintenance.root ?? "tools/scripts/"))) continue;
  const basename = path.posix.basename(file);
  if (!(maintenance.oneOffPrefixes ?? []).some((prefix) => basename.startsWith(prefix))) continue;
  const ageDays = fileAgeDays(file);
  if (ageDays === null || ageDays <= Number(maintenance.maximumUnreferencedAgeDays ?? 90)) continue;
  const referenced = [...contentByFile.entries()].some(
    ([candidate, content]) => candidate !== file && (content.includes(file) || content.includes(basename)),
  );
  if (!referenced) mark(file, `unreferenced one-off maintenance script older than ${ageDays} days`, "temporary");
}

if (policy.documents?.deleteExactNormalizedDuplicates === true) {
  const groups = new Map();
  for (const file of files.filter((candidate) => isDocument(candidate, documentRoots))) {
    const hash = normalizedHash(contentByFile.get(file) ?? "");
    if (!hash) continue;
    const group = groups.get(hash) ?? [];
    group.push(file);
    groups.set(hash, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((left, right) => {
      const score = (file) => {
        let value = 0;
        if (permanentEvidenceRoots.some((root) => file.startsWith(root))) value -= 100;
        if (referenceText.includes(file) || referenceText.includes(path.posix.basename(file))) value -= 50;
        if (file.startsWith(archiveRoot)) value += 20;
        value += file.length / 1000;
        return value;
      };
      return score(left) - score(right) || left.localeCompare(right);
    });
    const canonical = ordered[0];
    for (const duplicate of ordered.slice(1)) {
      mark(duplicate, `exact normalized duplicate of ${canonical}`, "duplicate-document");
    }
  }
}

const allowedClasses = new Set([
  ...(policy.deletionPolicy?.safeAutomaticClasses ?? []),
  ...(policy.deletionPolicy?.safeManualRemediationClasses ?? []),
]);
const approved = [...deletions.values()].filter((item) => allowedClasses.has(item.classification));
for (const item of [...deletions.values()]) {
  if (!allowedClasses.has(item.classification)) {
    blocked.push({ ...item, block: "classification-not-approved" });
  }
}

if (apply) {
  for (const item of approved) {
    fs.rmSync(path.join(repoRoot, item.file), { force: true, recursive: true });
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: apply ? "apply" : "plan",
  approvedCount: approved.length,
  blockedCount: blocked.length,
  deleted: apply ? approved : [],
  planned: approved,
  blocked,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

for (const item of approved) console.log(`cleanup ${apply ? "deleted" : "planned"}: ${item.file} — ${item.reason}`);
for (const item of blocked) console.warn(`cleanup blocked: ${item.file} — ${item.block}`);
console.log(`repository-cleanup: approved=${approved.length} blocked=${blocked.length} mode=${report.mode}`);
