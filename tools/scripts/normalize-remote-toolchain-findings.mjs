#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || process.env.EVIDENCE_ROOT || ".");
const outDir = path.resolve(process.argv[3] || root);

function files(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...files(full));
    else out.push(full);
  }
  return out;
}
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}
function severity(value) { return String(value || "").trim().toLowerCase(); }
function isMaterialSeverity(value) {
  return ["critical", "high", "error", "blocker"].includes(severity(value));
}
function lineOf(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function add(list, finding) {
  const normalized = {
    source: String(finding.source || "unknown"),
    id: String(finding.id || ""),
    severity: severity(finding.severity),
    category: String(finding.category || ""),
    path: String(finding.path || ""),
    line: lineOf(finding.line),
    message: String(finding.message || "").trim(),
    url: String(finding.url || ""),
    commitSha: String(finding.commitSha || ""),
    material: Boolean(finding.material ?? isMaterialSeverity(finding.severity)),
  };
  if (!normalized.message && !normalized.path && !normalized.id) return;
  list.push(normalized);
}

const findings = [];
const metadataFile = path.join(root, "metadata.json");
const metadata = readJson(metadataFile);
if (Array.isArray(metadata?.normalizedFindings)) {
  for (const item of metadata.normalizedFindings) add(findings, item);
}

for (const file of files(root)) {
  const base = path.basename(file).toLowerCase();
  const fullLower = file.toLowerCase();
  const json = base.endsWith(".json") ? readJson(file) : null;
  if (!json) continue;

  if (base === "semgrep.json" && Array.isArray(json.results)) {
    for (const result of json.results) {
      add(findings, {
        source: "semgrep",
        id: result?.check_id,
        severity: result?.extra?.severity,
        category: result?.extra?.metadata?.category || result?.extra?.metadata?.technology?.join?.(",") || "",
        path: result?.path,
        line: result?.start?.line,
        message: result?.extra?.message,
        url: result?.extra?.metadata?.source || result?.extra?.metadata?.shortlink || "",
        material: isMaterialSeverity(result?.extra?.severity),
      });
    }
  }

  if (base === "gitleaks.json" && Array.isArray(json)) {
    for (const result of json) {
      add(findings, {
        source: "gitleaks",
        id: result?.RuleID || result?.Fingerprint,
        severity: "critical",
        category: "secret",
        path: result?.File,
        line: result?.StartLine,
        message: result?.Description || result?.RuleID || "secret finding",
        material: true,
      });
    }
  }

  if (base === "open-alerts.json" && fullLower.includes("dependabot")) {
    const alerts = Array.isArray(json) ? json : [];
    for (const alert of alerts) {
      add(findings, {
        source: "dependabot",
        id: alert?.number,
        severity: alert?.security_advisory?.severity,
        category: "dependency",
        path: alert?.dependency?.manifest_path,
        message: `${alert?.dependency?.package?.ecosystem || ""}:${alert?.dependency?.package?.name || ""} ${alert?.security_advisory?.summary || ""}`.trim(),
        url: alert?.html_url,
        material: ["critical", "high"].includes(severity(alert?.security_advisory?.severity)),
      });
    }
  }

  if (base === "result.json" && fullLower.includes("opencodereview")) {
    const seen = new Set();
    const visit = (value) => {
      if (Array.isArray(value)) { value.forEach(visit); return; }
      if (!value || typeof value !== "object") return;
      const candidatePath = typeof value.path === "string" ? value.path : "";
      const content = typeof value.content === "string" ? value.content : "";
      if (candidatePath && content) {
        const key = `${candidatePath}|${value.start_line ?? ""}|${value.end_line ?? ""}|${content}`;
        if (!seen.has(key)) {
          seen.add(key);
          add(findings, {
            source: "opencodereview",
            id: value.id || "",
            severity: value.severity || "",
            category: value.category || "semantic-review",
            path: candidatePath,
            line: value.start_line || value.end_line,
            message: content,
            material: ["critical", "high"].includes(severity(value.severity)),
          });
        }
      }
      Object.values(value).forEach(visit);
    };
    visit(json);
  }
}

const deduped = [];
const keys = new Set();
for (const finding of findings) {
  const key = [finding.source, finding.id, finding.path, finding.line ?? "", finding.message].join("|");
  if (keys.has(key)) continue;
  keys.add(key);
  deduped.push(finding);
}

const bySource = {};
const bySeverity = {};
for (const finding of deduped) {
  bySource[finding.source] = (bySource[finding.source] || 0) + 1;
  const sev = finding.severity || "unknown";
  bySeverity[sev] = (bySeverity[sev] || 0) + 1;
}
const material = deduped.filter((finding) => finding.material);
const summary = {
  schemaVersion: 1,
  totalFindings: deduped.length,
  materialFindings: material.length,
  bySource,
  bySeverity,
  requiresSemanticRootCauseAudit: deduped.length > 0,
  note: "Normalized findings are evidence inputs, not independent root causes or Product/System Truth.",
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "normalized-findings.json"), `${JSON.stringify(deduped, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "policy-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);
process.exitCode = material.length ? 2 : 0;
