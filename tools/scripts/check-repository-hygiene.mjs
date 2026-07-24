import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const policyPath = path.join(repoRoot, "governance/cleanup/repository-retention-policy.json");
const reportPath = path.resolve(
  repoRoot,
  process.env.BTHWANI_HYGIENE_REPORT ?? ".diagnostics/repository-hygiene/report.json",
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout;
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function trackedFiles() {
  return runGit(["ls-files", "-z"])
    .split("\0")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(toPosix)
    .sort();
}

function fileAgeDays(file) {
  const timestamp = Number(runGit(["log", "-1", "--format=%ct", "--", file]).trim());
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Math.floor((Date.now() - timestamp * 1000) / 86_400_000);
}

function isTextFile(file) {
  return /\.(?:cjs|css|go|html|js|json|jsx|md|mjs|ps1|py|sh|sql|ts|tsx|txt|yaml|yml)$/i.test(file);
}

function readText(file) {
  const full = path.join(repoRoot, file);
  const stat = fs.statSync(full);
  if (stat.size > 2 * 1024 * 1024) return "";
  return fs.readFileSync(full, "utf8");
}

function normalizedDocumentHash(content) {
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

const policy = readJson(policyPath);
const files = trackedFiles();
const errors = [];
const reviews = [];
const safeDelete = [];
const seen = new Set();

function add(target, finding) {
  const key = `${finding.code}:${finding.file}:${finding.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(finding);
  if (finding.safeDelete === true) safeDelete.push(finding.file);
}

const forbiddenNameRegexes = policy.forbiddenTrackedFilenamePatterns.map(
  (pattern) => new RegExp(pattern, "i"),
);
const allowedLogRoots = policy.allowedTrackedLogRoots ?? [];
const evidenceRoots = policy.evidence?.roots ?? [];
const permanentEvidenceRoots = policy.evidence?.permanentRoots ?? [];
const documentRoots = policy.documents?.roots ?? [];
const archiveRoot = policy.documents?.archiveRoot ?? "governance/archive/";
const retiredMarkers = policy.documents?.retiredMarkers ?? [];

const referenceText = (policy.evidence?.referenceIndexes ?? [])
  .filter((file) => fs.existsSync(path.join(repoRoot, file)))
  .map((file) => readText(file))
  .join("\n");

const searchableText = new Map();
for (const file of files) {
  if (!isTextFile(file)) continue;
  try {
    searchableText.set(file, readText(file));
  } catch {
    // Missing or unreadable tracked files are handled by Git and other repository guards.
  }
}

for (const file of files) {
  const lower = file.toLowerCase();
  const basename = path.posix.basename(file);

  const forbiddenPrefix = (policy.forbiddenTrackedPathPrefixes ?? []).find((prefix) =>
    lower.startsWith(String(prefix).toLowerCase()),
  );
  if (forbiddenPrefix) {
    add(errors, {
      code: "FORBIDDEN_TRACKED_TRANSIENT_PATH",
      file,
      message: `Tracked transient path matches ${forbiddenPrefix}`,
      classification: lower.includes("scratch") ? "scratch" : "temporary",
      safeDelete: true,
    });
  }

  const forbiddenName = forbiddenNameRegexes.find((regex) => regex.test(file));
  if (forbiddenName) {
    add(errors, {
      code: "FORBIDDEN_TRACKED_TRANSIENT_NAME",
      file,
      message: `Tracked filename matches ${forbiddenName}`,
      classification: "temporary",
      safeDelete: true,
    });
  }

  if (lower.endsWith(".log") && !allowedLogRoots.some((root) => lower.startsWith(root.toLowerCase()))) {
    add(errors, {
      code: "TRACKED_RUNTIME_LOG_OUTSIDE_EVIDENCE",
      file,
      message: "Runtime and diagnostic logs must be uploaded as artifacts or stored under an approved evidence root",
      classification: "generated-output",
      safeDelete: true,
    });
  }

  const isEvidence = evidenceRoots.some((root) => lower.startsWith(root.toLowerCase()));
  if (isEvidence && !permanentEvidenceRoots.some((root) => lower.startsWith(root.toLowerCase()))) {
    const ageDays = fileAgeDays(file);
    const referenced = referenceText.includes(file) || referenceText.includes(basename);
    if (
      ageDays !== null &&
      ageDays > Number(policy.evidence.maximumUnreferencedAgeDays) &&
      !referenced
    ) {
      add(errors, {
        code: "STALE_UNREFERENCED_EVIDENCE",
        file,
        message: `Evidence is ${ageDays} days old and is not referenced by a governing index`,
        classification: "evidence",
        safeDelete: false,
      });
    }
  }

  const isDocument = documentRoots.some((root) => lower.startsWith(root.toLowerCase()));
  if (isDocument && isTextFile(file)) {
    const content = searchableText.get(file) ?? "";
    const retiredMarker = retiredMarkers.find((marker) =>
      content.toLowerCase().includes(String(marker).toLowerCase()),
    );
    if (retiredMarker && !lower.startsWith(archiveRoot.toLowerCase())) {
      add(errors, {
        code: "RETIRED_DOCUMENT_OUTSIDE_ARCHIVE",
        file,
        message: `Document declares ${retiredMarker} but is not under ${archiveRoot}`,
        classification: "governance",
        safeDelete: false,
      });
    }
  }
}

const maintenance = policy.maintenanceScripts ?? {};
const maintenanceRoot = String(maintenance.root ?? "tools/scripts/");
const oneOffPrefixes = maintenance.oneOffPrefixes ?? [];
for (const file of files) {
  if (!file.startsWith(maintenanceRoot)) continue;
  const basename = path.posix.basename(file);
  if (!oneOffPrefixes.some((prefix) => basename.startsWith(prefix))) continue;
  const ageDays = fileAgeDays(file);
  if (ageDays === null || ageDays <= Number(maintenance.maximumUnreferencedAgeDays ?? 90)) continue;

  const referenced = [...searchableText.entries()].some(
    ([candidate, content]) => candidate !== file && (content.includes(file) || content.includes(basename)),
  );
  if (!referenced) {
    add(errors, {
      code: "STALE_UNREFERENCED_MAINTENANCE_SCRIPT",
      file,
      message: `One-off maintenance script is ${ageDays} days old and has no repository reference`,
      classification: "temporary",
      safeDelete: true,
    });
  }
}

const duplicateCandidates = files.filter(
  (file) => /\.(?:md|json)$/i.test(file) && documentRoots.some((root) => file.startsWith(root)),
);
const hashes = new Map();
for (const file of duplicateCandidates) {
  const content = searchableText.get(file) ?? "";
  const hash = normalizedDocumentHash(content);
  if (!hash) continue;
  const group = hashes.get(hash) ?? [];
  group.push(file);
  hashes.set(hash, group);
}
for (const group of hashes.values()) {
  if (group.length < 2) continue;
  for (const file of group) {
    add(reviews, {
      code: "DUPLICATE_DOCUMENT_CONTENT_REVIEW",
      file,
      message: `Exact normalized content duplicate: ${group.filter((item) => item !== file).join(", ")}`,
      classification: "document-review",
      safeDelete: false,
    });
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  decision: policy.decision,
  ciSourceMutation: policy.ciSourceMutation,
  trackedFileCount: files.length,
  errorCount: errors.length,
  reviewCount: reviews.length,
  safeDelete: [...new Set(safeDelete)].sort(),
  errors,
  reviews,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

for (const finding of errors) {
  console.error(`::error file=${finding.file},title=${finding.code}::${finding.message}`);
}
for (const finding of reviews.slice(0, 20)) {
  console.warn(`::warning file=${finding.file},title=${finding.code}::${finding.message}`);
}

console.log(`repository-hygiene: tracked=${files.length} errors=${errors.length} reviews=${reviews.length}`);
console.log(`repository-hygiene: report=${path.relative(repoRoot, reportPath).replaceAll("\\", "/")}`);

if (errors.length > 0) process.exit(1);
