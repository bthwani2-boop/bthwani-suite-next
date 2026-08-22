#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const input = option("--input", ".diagnostics/opencodereview/result.json");
const summaryJson = option("--summary-json", ".diagnostics/opencodereview/summary.json");
const markdown = option("--markdown", ".diagnostics/opencodereview/summary.md");
const blockSeverity = option("--block-severity", "high").toLowerCase();
const targetSha = String(process.env.OCR_TARGET_SHA || "").trim();
const baseSha = String(process.env.OCR_BASE_SHA || "").trim();
const mode = String(process.env.OCR_MODE || "").trim();
const model = String(process.env.OCR_MODEL || "").trim();

function fail(message, exitCode = 1) {
  console.error(`[OPENCODEREVIEW FAIL] ${message}`);
  process.exit(exitCode);
}

if (process.env.GITHUB_ACTIONS !== "true") {
  fail("OpenCodeReview result adjudication is Remote-only and must run on GitHub Actions.");
}
if (!fs.existsSync(input)) fail(`missing OpenCodeReview JSON result: ${input}`);

let report;
try {
  report = JSON.parse(fs.readFileSync(input, "utf8"));
} catch (error) {
  fail(`invalid OpenCodeReview JSON: ${error.message}`);
}

const status = String(report?.status || "").trim().toLowerCase();
if (!["complete", "completed", "success"].includes(status)) {
  fail(`unexpected OpenCodeReview status '${status || "missing"}'`);
}
if (!Array.isArray(report?.comments)) {
  fail("OpenCodeReview result is missing the comments array");
}

const rank = new Map([
  ["critical", 4],
  ["high", 3],
  ["medium", 2],
  ["low", 1],
  ["info", 0],
  ["unknown", 0],
]);
const threshold = rank.get(blockSeverity);
if (threshold === undefined) fail(`unsupported --block-severity '${blockSeverity}'`);

const comments = report.comments.map((comment, index) => {
  const severityRaw = String(comment?.severity || "unknown").trim().toLowerCase();
  const severity = rank.has(severityRaw) ? severityRaw : "unknown";
  return {
    index: index + 1,
    path: String(comment?.path || "").trim(),
    startLine: Number.isFinite(Number(comment?.start_line)) ? Number(comment.start_line) : null,
    endLine: Number.isFinite(Number(comment?.end_line)) ? Number(comment.end_line) : null,
    severity,
    category: String(comment?.category || "other").trim().toLowerCase() || "other",
    content: String(comment?.content || comment?.message || "").trim(),
  };
});

const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, unknown: 0 };
for (const comment of comments) counts[comment.severity] += 1;
const blocking = comments.filter((comment) => (rank.get(comment.severity) || 0) >= threshold);

const summary = {
  schemaVersion: 1,
  status,
  targetSha,
  baseSha,
  mode,
  model,
  filesReviewed: Number(report?.summary?.files_reviewed ?? 0),
  commentsTotal: comments.length,
  counts,
  blockingThreshold: blockSeverity,
  blockingCount: blocking.length,
  comments,
};

fs.mkdirSync(path.dirname(summaryJson), { recursive: true });
fs.mkdirSync(path.dirname(markdown), { recursive: true });
fs.writeFileSync(summaryJson, `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

const lines = [
  "## OpenCodeReview Remote",
  "",
  `- Candidate: \`${targetSha || "unknown"}\``,
  `- Base: \`${baseSha || "n/a"}\``,
  `- Mode: \`${mode || "unknown"}\``,
  `- Model: \`${model || "unknown"}\``,
  `- Files reviewed: ${summary.filesReviewed}`,
  `- Findings: ${comments.length} (critical ${counts.critical}, high ${counts.high}, medium ${counts.medium}, low ${counts.low}, info ${counts.info}, unknown ${counts.unknown})`,
  `- Blocking threshold: ${blockSeverity} (${blocking.length} blocking)`,
  "",
];

if (!comments.length) {
  lines.push("No semantic findings were reported.");
} else {
  lines.push("### Findings", "");
  const maxBody = 56000;
  for (const comment of comments) {
    const location = comment.path
      ? `${comment.path}${comment.startLine ? `:${comment.startLine}${comment.endLine && comment.endLine !== comment.startLine ? `-${comment.endLine}` : ""}` : ""}`
      : "repository";
    const content = comment.content.replace(/\s+/g, " ").slice(0, 1200);
    const entry = `- **${comment.severity.toUpperCase()} / ${comment.category}** \`${location}\` — ${content || "No message supplied."}`;
    if ([...lines, entry].join("\n").length > maxBody) {
      lines.push("", "_Additional findings are retained in the OpenCodeReview workflow artifact._");
      break;
    }
    lines.push(entry);
  }
}

fs.writeFileSync(markdown, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });

console.log(`[OPENCODEREVIEW] findings=${comments.length} critical=${counts.critical} high=${counts.high} medium=${counts.medium} low=${counts.low}`);
if (blocking.length) {
  console.error(`[OPENCODEREVIEW FIX_REQUIRED] ${blocking.length} finding(s) meet blocking threshold ${blockSeverity}.`);
  process.exit(2);
}
console.log("[OPENCODEREVIEW PASS] no finding meets the blocking threshold.");
