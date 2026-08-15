#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const TEMPLATE = path.join(HERE, "PACKAGE.template.md");
const SCHEMA = "BTHWANI_PACKAGE_V5";
const MODES = new Set(["PREPARE_ONLY", "EXECUTE_END_TO_END"]);
const PHASES = new Set(["diagnose", "prepare", "execute", "verify", "close"]);
const SHA = /^[0-9a-f]{40}$/i;
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const SAFE_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const ID = /^[A-Z][A-Z0-9_-]*$/;
const OP_ID = /^OP-[A-Z0-9_-]+$/;
const RC_ID = /^RC-[A-Z0-9_-]+$/;
const EVD_ID = /^EVD-[A-Z0-9_-]+$/;

export class OrchestratorError extends Error {}

function assert(condition, message) {
  if (!condition) throw new OrchestratorError(message);
}

function fail(message) {
  console.error(`orchestrator: FAIL: ${message}`);
  process.exit(1);
}

function safeLine(value, label) {
  const clean = String(value ?? "").trim();
  assert(clean && !/[\r\n]/.test(clean), `${label} must be one non-empty line`);
  return clean;
}

function safeBranch(value, label) {
  const clean = safeLine(value, label);
  assert(
    SAFE_BRANCH.test(clean) &&
      !clean.includes("..") &&
      !clean.includes("//") &&
      !clean.includes("@{") &&
      !clean.endsWith("/") &&
      !clean.endsWith("."),
    `${label} is not a safe branch name`,
  );
  return clean;
}

function parseArgs(tokens, allowed, required = allowed) {
  const out = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i];
    const value = tokens[i + 1];
    assert(key?.startsWith("--") && value !== undefined && !value.startsWith("--"), "arguments must be --key value pairs");
    const name = key.slice(2);
    assert(allowed.has(name), `unknown argument --${name}`);
    assert(!Object.hasOwn(out, name), `duplicate argument --${name}`);
    out[name] = value;
  }
  for (const name of required) assert(Object.hasOwn(out, name), `missing --${name}`);
  return out;
}

function lineValue(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^${escaped}:\\s*(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

function requiredLine(text, key) {
  const value = lineValue(text, key);
  assert(value !== null, `missing field ${key}`);
  return value;
}

function section(text, heading) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  assert(start >= 0, `missing section ${marker}`);
  const after = start + marker.length;
  const next = text.indexOf("\n## ", after);
  return text.slice(after, next >= 0 ? next : text.length).trim();
}

function splitCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function parseTable(text, heading, expectedHeaders) {
  const body = section(text, heading);
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("|"));
  assert(lines.length >= 2, `${heading} table header/separator missing`);
  const headers = splitCells(lines[0]);
  assert(JSON.stringify(headers) === JSON.stringify(expectedHeaders), `${heading} table header drift`);
  const separator = splitCells(lines[1]);
  assert(separator.length === headers.length && separator.every((cell) => /^:?-{3,}:?$/.test(cell)), `${heading} table separator invalid`);
  const rows = [];
  for (const line of lines.slice(2)) {
    const cells = splitCells(line);
    assert(cells.length === headers.length, `${heading} row has ${cells.length} cells; expected ${headers.length}`);
    if (cells.every((cell) => cell === "")) continue;
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    rows.push(row);
  }
  return rows;
}

function listRefs(value) {
  const clean = safeLine(value, "reference list");
  if (clean === "NONE" || clean === "N/A") return [];
  return clean.split(",").map((item) => item.trim()).filter(Boolean);
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.error) {
    if (allowFailure) return { ok: false, stdout: "", stderr: result.error.message };
    throw new OrchestratorError(`git ${args.join(" ")} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (allowFailure) return { ok: false, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
    throw new OrchestratorError(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return { ok: true, stdout: (result.stdout ?? "").trim(), stderr: (result.stderr ?? "").trim() };
}

function remoteBranchSha(branchName) {
  const branch = safeBranch(branchName, "branch");
  const result = git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]);
  const line = result.stdout.split(/\r?\n/).find(Boolean);
  assert(line, `remote branch does not exist: ${branch}`);
  const sha = line.split(/\s+/)[0];
  assert(SHA.test(sha), `remote branch ${branch} did not resolve to a commit SHA`);
  return sha.toLowerCase();
}

function ensureCommitObject(sha, branchName = null) {
  assert(SHA.test(sha), `invalid commit SHA ${sha}`);
  if (git(["cat-file", "-e", `${sha}^{commit}`], { allowFailure: true }).ok) return;
  if (branchName) git(["fetch", "--no-tags", "--quiet", "origin", branchName], { allowFailure: true });
  if (!git(["cat-file", "-e", `${sha}^{commit}`], { allowFailure: true }).ok) {
    git(["fetch", "--no-tags", "--quiet", "origin", sha], { allowFailure: true });
  }
  assert(git(["cat-file", "-e", `${sha}^{commit}`], { allowFailure: true }).ok, `commit object unavailable locally: ${sha}`);
}

function isAncestor(base, head, branchName = null) {
  ensureCommitObject(base);
  ensureCommitObject(head, branchName);
  return git(["merge-base", "--is-ancestor", base, head], { allowFailure: true }).ok;
}

function currentHead() {
  const sha = git(["rev-parse", "HEAD"]).stdout;
  assert(SHA.test(sha), "current HEAD did not resolve to a commit SHA");
  return sha.toLowerCase();
}

function replaceToken(text, token, value) {
  assert(text.includes(token), `template missing ${token}`);
  return text.split(token).join(value);
}

function atomicWrite(file, text) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: false });
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  let fd;
  try {
    fd = fs.openSync(temp, "wx");
    fs.writeFileSync(fd, text, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.rmSync(temp, { force: true }); } catch {}
    try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
    throw error;
  }
}

function resolvePackage(input) {
  const resolved = path.resolve(input);
  assert(fs.existsSync(resolved), `package path does not exist: ${input}`);
  const stat = fs.statSync(resolved);
  const file = stat.isDirectory() ? path.join(resolved, "PACKAGE.md") : resolved;
  assert(fs.existsSync(file) && fs.statSync(file).isFile(), `PACKAGE.md is missing: ${file}`);
  return file;
}

function requireEvidencePass(evidenceById, id, { candidate = null } = {}) {
  const row = evidenceById.get(id);
  assert(row, `missing required evidence ${id}`);
  assert(row.Result === "PASS", `${id} must be PASS`);
  assert(row["Check / source"] && !/^(?:MISSING|UNSET|N\/A)$/i.test(row["Check / source"]), `${id} check/source is missing`);
  assert(row.Claim, `${id} claim is missing`);
  assert(row["Limits / invalidates on"], `${id} proof limits/invalidation trigger is missing`);
  if (candidate) assert(row.Candidate === candidate, `${id} must be bound to Candidate=${candidate}`);
  return row;
}

function validateCoreShape(text) {
  assert(!/__[A-Z0-9_]+__/.test(text), "unresolved template placeholder");
  const fields = {
    SCHEMA: requiredLine(text, "SCHEMA"),
    TASK_ID: requiredLine(text, "TASK_ID"),
    TARGET: requiredLine(text, "TARGET"),
    MODE: requiredLine(text, "MODE"),
    INTEGRATION_BRANCH: requiredLine(text, "INTEGRATION_BRANCH"),
    TASK_BRANCH: requiredLine(text, "TASK_BRANCH"),
    BASE_SHA: requiredLine(text, "BASE_SHA"),
    LATEST_RECONCILED_SHA: requiredLine(text, "LATEST_RECONCILED_SHA"),
    ROOT: requiredLine(text, "ROOT"),
    INTEGRATION_OWNER: requiredLine(text, "INTEGRATION_OWNER"),
    RUNTIME_REQUIRED: requiredLine(text, "RUNTIME_REQUIRED"),
  };
  assert(fields.SCHEMA === SCHEMA, `SCHEMA must be ${SCHEMA}`);
  assert(SAFE_NAME.test(fields.TASK_ID), "TASK_ID must be a safe lowercase identifier");
  assert(MODES.has(fields.MODE), "invalid MODE");
  assert(SHA.test(fields.BASE_SHA), "invalid BASE_SHA");
  assert(SHA.test(fields.LATEST_RECONCILED_SHA), "invalid LATEST_RECONCILED_SHA");
  assert(fields.ROOT === fields.TARGET, "ROOT must equal TARGET");
  fields.INTEGRATION_BRANCH = safeBranch(fields.INTEGRATION_BRANCH, "INTEGRATION_BRANCH");
  fields.TASK_BRANCH = safeBranch(fields.TASK_BRANCH, "TASK_BRANCH");
  assert(fields.INTEGRATION_BRANCH !== fields.TASK_BRANCH, "TASK_BRANCH must differ from INTEGRATION_BRANCH");
  assert(new Set(["YES", "NO", "UNSET"]).has(fields.RUNTIME_REQUIRED), "RUNTIME_REQUIRED must be YES, NO, or UNSET");

  const operational = parseTable(text, "Operational Coverage", ["Node", "Kind", "Parent", "Claim", "Status", "Evidence"]);
  const roots = parseTable(text, "Root-Cause Graph", ["RC", "Root cause", "Operational parent", "Evidence", "Depends on", "Consumers", "Blast / unlock", "Priority", "Deepening", "Disposition"]);
  const ledger = parseTable(text, "Ledger", ["Type", "ID", "RC", "Relation / claim", "Status", "Evidence"]);
  const frontier = parseTable(text, "Frontier", ["Work", "RC", "Depends on", "Blocks / unlocks", "Conflict", "Owner", "Parallel", "State", "Evidence"]);
  const evidence = parseTable(text, "Evidence", ["Evidence", "Claim", "Check / source", "Candidate", "Environment", "Result", "Limits / invalidates on"]);

  const closure = {
    integrationHead: requiredClosureBullet(text, "Integration head"),
    finalCandidate: requiredClosureBullet(text, "Final candidate"),
    verification: requiredClosureBullet(text, "Verification"),
    runtime: requiredClosureBullet(text, "Runtime/product evidence"),
    cleanup: requiredClosureBullet(text, "Cleanup"),
    governance: requiredClosureBullet(text, "Governance"),
    adversarial: requiredClosureBullet(text, "Final adversarial"),
  };
  return { fields, operational, roots, ledger, frontier, evidence, closure };
}

function requiredClosureBullet(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^- ${escaped}:\\s*(.*)$`, "m"));
  assert(match, `missing Closure ${key}`);
  return match[1].trim();
}

function validateOperational(model, evidenceById) {
  assert(model.operational.length > 0, "operational coverage is empty");
  const byId = new Map();
  for (const row of model.operational) {
    assert(OP_ID.test(row.Node), `invalid Operational Node id ${row.Node}`);
    assert(!byId.has(row.Node), `duplicate Operational Node ${row.Node}`);
    assert(row.Kind && row.Claim, `${row.Node} missing Kind/Claim`);
    assert(new Set(["PROVEN", "EXCLUDED", "OPEN", "STALE"]).has(row.Status), `${row.Node} has invalid status ${row.Status}`);
    if (new Set(["PROVEN", "EXCLUDED"]).has(row.Status)) {
      assert(row.Evidence && !/^(?:MISSING|UNSET)$/i.test(row.Evidence), `${row.Node} settled status requires evidence`);
      for (const ev of listRefs(row.Evidence)) assert(evidenceById.has(ev), `${row.Node} references unknown Evidence ${ev}`);
    }
    byId.set(row.Node, row);
  }
  for (const row of model.operational) {
    if (row.Parent === "ROOT" || row.Parent === "NONE") continue;
    assert(byId.has(row.Parent), `${row.Node} references unknown operational parent ${row.Parent}`);
  }
  const open = model.operational.filter((row) => !new Set(["PROVEN", "EXCLUDED"]).has(row.Status));
  assert(open.length === 0, `operational coverage has open/stale nodes: ${open.map((row) => row.Node).join(", ")}`);
  return byId;
}

function validateEvidence(model) {
  const byId = new Map();
  const allowedResult = new Set(["PASS", "FAIL", "MISSING", "STALE", "BLOCKED", "N/A"]);
  const allowedCandidate = /^(?:BASE|TASK_HEAD|INTEGRATION_HEAD|SELF|N\/A|[0-9a-f]{40})$/i;
  for (const row of model.evidence) {
    assert(EVD_ID.test(row.Evidence), `invalid Evidence id ${row.Evidence}`);
    assert(!byId.has(row.Evidence), `duplicate Evidence ${row.Evidence}`);
    assert(row.Claim && row["Check / source"] && row.Environment && row["Limits / invalidates on"], `${row.Evidence} has incomplete evidence record`);
    assert(allowedResult.has(row.Result), `${row.Evidence} has invalid Result ${row.Result}`);
    assert(allowedCandidate.test(row.Candidate), `${row.Evidence} has invalid Candidate ${row.Candidate}`);
    byId.set(row.Evidence, row);
  }
  return byId;
}

function assertAcyclic(byId, depsFor, label) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      assert(false, `${label} dependency cycle: ${cycle.join(" -> ")}`);
    }
    visiting.add(id);
    stack.push(id);
    for (const dep of depsFor(byId.get(id))) visit(dep);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of byId.keys()) visit(id);
}

function validateRoots(model, operationalById, evidenceById) {
  assert(model.roots.length > 0, "root-cause landscape is empty");
  const byId = new Map();
  const priorities = [];
  for (const row of model.roots) {
    assert(RC_ID.test(row.RC), `invalid RC id ${row.RC}`);
    assert(!byId.has(row.RC), `duplicate RC ${row.RC}`);
    assert(row["Root cause"] && row["Blast / unlock"], `${row.RC} missing root cause/blast-unlock`);
    assert(operationalById.has(row["Operational parent"]), `${row.RC} references unknown Operational parent ${row["Operational parent"]}`);
    assert(/^[1-9]\d*$/.test(row.Priority), `${row.RC} Priority must be a positive integer`);
    priorities.push(Number(row.Priority));
    assert(new Set(["DEEPENED_ENOUGH_TO_RANK", "PROVEN_CANNOT_OUTRANK"]).has(row.Deepening), `${row.RC} has invalid Deepening ${row.Deepening}`);
    assert(new Set(["READY", "DEPENDENT", "RESOLVED", "EXCLUDED"]).has(row.Disposition), `${row.RC} has unresolved/invalid Disposition ${row.Disposition}`);
    for (const ev of listRefs(row.Evidence)) assert(evidenceById.has(ev), `${row.RC} references unknown Evidence ${ev}`);
    byId.set(row.RC, row);
  }
  assert(priorities.includes(1), "root-cause ranking must contain Priority=1");
  for (const row of model.roots) {
    for (const dep of listRefs(row["Depends on"])) assert(byId.has(dep), `${row.RC} references unknown RC dependency ${dep}`);
  }
  assertAcyclic(byId, (row) => listRefs(row["Depends on"]), "root-cause graph");
  const winners = model.roots.filter((row) => row.Priority === "1" && !new Set(["RESOLVED", "EXCLUDED"]).has(row.Disposition));
  assert(winners.length > 0, "no active Priority=1 root cause");
  for (const winner of winners) assert(winner.Deepening === "DEEPENED_ENOUGH_TO_RANK", `${winner.RC} winner must be DEEPENED_ENOUGH_TO_RANK`);
  return byId;
}

function validateLedger(model, rootsById, evidenceById) {
  const allowedTypes = new Set(["FINDING", "DECISION", "CONSUMER", "DEPENDENCY", "SCOPE_DELTA", "CLEANUP", "LOWER_LAYER"]);
  const settled = new Set(["RESOLVED", "PASS", "DONE", "EXCLUDED", "DISPOSITIONED", "PROMOTED"]);
  const byId = new Map();
  for (const row of model.ledger) {
    assert(allowedTypes.has(row.Type), `Ledger ${row.ID || "<missing>"} has invalid Type ${row.Type}`);
    assert(ID.test(row.ID), `invalid Ledger id ${row.ID}`);
    assert(!byId.has(row.ID), `duplicate Ledger id ${row.ID}`);
    assert(row["Relation / claim"], `${row.ID} missing relation/claim`);
    assert(row.Status, `${row.ID} missing Status`);
    if (row.RC !== "NONE") assert(rootsById.has(row.RC), `${row.ID} references unknown RC ${row.RC}`);
    if (row.Type === "FINDING" && row.RC === "NONE") assert(row.Status === "EXCLUDED", `${row.ID} Finding requires RC unless EXCLUDED`);
    if (row.Type === "LOWER_LAYER") assert(new Set(["PROMOTED", "DISPOSITIONED", "HOLD"]).has(row.Status), `${row.ID} lower-layer status invalid`);
    for (const ev of listRefs(row.Evidence)) assert(evidenceById.has(ev), `${row.ID} references unknown Evidence ${ev}`);
    byId.set(row.ID, row);
  }
  const accountingTypes = new Set(["FINDING", "DECISION", "CONSUMER", "DEPENDENCY", "SCOPE_DELTA", "LOWER_LAYER"]);
  const open = model.ledger.filter((row) => accountingTypes.has(row.Type) && !settled.has(row.Status));
  assert(open.length === 0, `unaccounted material ledger rows: ${open.map((row) => row.ID).join(", ")}`);
  for (const root of model.roots) {
    for (const consumer of listRefs(root.Consumers)) {
      const row = byId.get(consumer);
      assert(row && row.Type === "CONSUMER", `${root.RC} references unknown/non-consumer ${consumer}`);
    }
  }
  return { byId, settled };
}

function validateFrontier(model, rootsById, evidenceById, phase) {
  assert(model.frontier.length > 0, "frontier is empty");
  const byId = new Map();
  const allowedState = new Set(["WAITING", "READY", "EXECUTING", "BLOCKED", "COMPLETE", "PREPARED"]);
  for (const row of model.frontier) {
    assert(ID.test(row.Work), `invalid Work id ${row.Work}`);
    assert(!byId.has(row.Work), `duplicate Work id ${row.Work}`);
    assert(rootsById.has(row.RC), `${row.Work} references unknown RC ${row.RC}`);
    assert(row["Blocks / unlocks"] && row.Conflict && row.Owner && row.Owner !== "UNASSIGNED", `${row.Work} missing block/unlock, conflict domain, or owner`);
    assert(new Set(["YES", "NO"]).has(row.Parallel), `${row.Work} Parallel must be YES or NO`);
    assert(allowedState.has(row.State), `${row.Work} has invalid State ${row.State}`);
    for (const ev of listRefs(row.Evidence)) assert(evidenceById.has(ev), `${row.Work} references unknown Evidence ${ev}`);
    byId.set(row.Work, row);
  }
  for (const row of model.frontier) {
    for (const dep of listRefs(row["Depends on"])) assert(byId.has(dep), `${row.Work} references unknown Work dependency ${dep}`);
  }
  assertAcyclic(byId, (row) => listRefs(row["Depends on"]), "frontier");
  const activePriorityOne = new Set(model.roots.filter((row) => row.Priority === "1" && !new Set(["RESOLVED", "EXCLUDED"]).has(row.Disposition)).map((row) => row.RC));
  for (const rc of activePriorityOne) assert(model.frontier.some((row) => row.RC === rc), `Priority=1 ${rc} is missing from frontier`);

  if (phase === "diagnose") {
    assert(model.frontier.every((row) => new Set(["WAITING", "READY"]).has(row.State)), "diagnose frontier may contain only WAITING/READY");
  }
  if (phase === "prepare") {
    assert(model.frontier.every((row) => row.State === "PREPARED"), "prepare requires every frontier row PREPARED");
  }
  if (phase === "execute") {
    assert(!model.frontier.some((row) => row.State === "BLOCKED"), "execute cannot pass with BLOCKED frontier work");
    assert(model.frontier.some((row) => new Set(["READY", "EXECUTING"]).has(row.State)), "execute requires READY or EXECUTING work");
    for (const row of model.frontier.filter((item) => new Set(["READY", "EXECUTING"]).has(item.State))) {
      for (const dep of listRefs(row["Depends on"])) assert(byId.get(dep).State === "COMPLETE", `${row.Work} dependency ${dep} is not COMPLETE`);
    }
  }
  if (phase === "verify" || phase === "close") {
    assert(model.frontier.every((row) => row.State === "COMPLETE"), `${phase} requires every frontier row COMPLETE`);
    for (const row of model.frontier) {
      const refs = listRefs(row.Evidence);
      assert(refs.length > 0, `${row.Work} COMPLETE requires evidence`);
      for (const ev of refs) assert(evidenceById.get(ev)?.Result === "PASS", `${row.Work} evidence ${ev} must PASS`);
    }
  }
  return byId;
}

function validateCleanup(model, settled) {
  const cleanup = model.ledger.filter((row) => row.Type === "CLEANUP");
  const open = cleanup.filter((row) => !settled.has(row.Status));
  assert(open.length === 0, `cleanup remains open: ${open.map((row) => row.ID).join(", ")}`);
}

function semanticPhase(text, phase) {
  assert(PHASES.has(phase), `unknown phase ${phase}`);
  const model = validateCoreShape(text);
  const evidenceById = validateEvidence(model);
  const operationalById = validateOperational(model, evidenceById);
  requireEvidencePass(evidenceById, "EVD-ROOT");
  requireEvidencePass(evidenceById, "EVD-NEGATIVE-SPACE");
  requireEvidencePass(evidenceById, "EVD-ADVERSARIAL");
  requireEvidencePass(evidenceById, "EVD-VERIFICATION-PLAN");
  const rootsById = validateRoots(model, operationalById, evidenceById);
  const { settled } = validateLedger(model, rootsById, evidenceById);
  validateFrontier(model, rootsById, evidenceById, phase);

  if (phase === "prepare") {
    assert(model.fields.MODE === "PREPARE_ONLY", "prepare requires MODE=PREPARE_ONLY");
    return model;
  }
  if (phase === "execute" || phase === "verify" || phase === "close") {
    assert(model.fields.MODE === "EXECUTE_END_TO_END", `${phase} requires MODE=EXECUTE_END_TO_END`);
  }
  if (phase === "verify" || phase === "close") {
    validateCleanup(model, settled);
    for (const id of ["EVD-IMPLEMENTATION", "EVD-CONSUMERS", "EVD-CLEANUP", "EVD-VERIFICATION"]) requireEvidencePass(evidenceById, id);
  }
  if (phase === "close") {
    assert(model.fields.INTEGRATION_OWNER !== "UNASSIGNED", "close requires assigned INTEGRATION_OWNER");
    assert(new Set(["YES", "NO"]).has(model.fields.RUNTIME_REQUIRED), "close requires RUNTIME_REQUIRED=YES or NO");
    requireEvidencePass(evidenceById, "EVD-GOVERNANCE", { candidate: "SELF" });
    requireEvidencePass(evidenceById, "EVD-FINAL-ADVERSARIAL", { candidate: "SELF" });
    requireEvidencePass(evidenceById, "EVD-VERIFICATION", { candidate: "SELF" });
    if (model.fields.RUNTIME_REQUIRED === "YES") requireEvidencePass(evidenceById, "EVD-RUNTIME", { candidate: "SELF" });
    if (model.fields.RUNTIME_REQUIRED === "NO") {
      const runtime = evidenceById.get("EVD-RUNTIME");
      if (runtime) assert(runtime.Result === "N/A", "EVD-RUNTIME must be N/A when runtime is not required");
    }
    assert(model.closure.integrationHead === "SELF", "Closure Integration head must be SELF");
    assert(model.closure.finalCandidate === "SELF", "Closure Final candidate must be SELF");
    for (const [key, value] of Object.entries(model.closure)) {
      if (new Set(["integrationHead", "finalCandidate"]).has(key)) continue;
      assert(value && !/^(?:MISSING|UNSET)$/i.test(value), `Closure ${key} evidence is missing`);
    }
  }
  return model;
}

export function semanticCheckForTests(text, phase) {
  return semanticPhase(text, phase);
}

function gitTruth(model, phase) {
  const integrationSha = remoteBranchSha(model.fields.INTEGRATION_BRANCH);
  const taskSha = remoteBranchSha(model.fields.TASK_BRANCH);
  assert(isAncestor(model.fields.BASE_SHA.toLowerCase(), taskSha, model.fields.TASK_BRANCH), "BASE_SHA is not an ancestor of TASK_BRANCH");
  const reconciled = model.fields.LATEST_RECONCILED_SHA.toLowerCase();

  if (phase !== "close") {
    assert(reconciled === integrationSha, `package is stale: LATEST_RECONCILED_SHA=${reconciled} live=${integrationSha}`);
  } else {
    const head = currentHead();
    assert(head === integrationSha, `close must run on exact live Integration Target HEAD; current=${head} live=${integrationSha}`);
    assert(isAncestor(reconciled, integrationSha, model.fields.INTEGRATION_BRANCH), "LATEST_RECONCILED_SHA is not an ancestor of final Integration Target");
  }
  return { integrationSha, taskSha, head: currentHead() };
}

function commandNew(tokens) {
  const args = parseArgs(
    tokens,
    new Set(["name", "target", "mode", "integration-branch", "task-branch"]),
  );
  const name = safeLine(args.name, "name");
  assert(SAFE_NAME.test(name), "name must be 1-80 lowercase safe characters");
  const target = safeLine(args.target, "target");
  const mode = safeLine(args.mode, "mode");
  assert(MODES.has(mode), `mode must be ${[...MODES].join(" or ")}`);
  const integration = safeBranch(args["integration-branch"], "integration branch");
  const task = safeBranch(args["task-branch"], "task branch");
  assert(integration !== task, "task branch must differ from integration branch");

  const baseSha = remoteBranchSha(integration);
  const taskSha = remoteBranchSha(task);
  assert(isAncestor(baseSha, taskSha, task), `task branch ${task} is not based on current ${integration}=${baseSha}`);
  assert(fs.existsSync(TEMPLATE), "PACKAGE.template.md is missing");

  const taskDir = path.join(HERE, name);
  assert(!fs.existsSync(taskDir), `task package already exists: ${name}`);
  let text = fs.readFileSync(TEMPLATE, "utf8");
  text = replaceToken(text, "__TASK_ID__", name);
  text = replaceToken(text, "__TARGET__", target);
  text = replaceToken(text, "__MODE__", mode);
  text = replaceToken(text, "__INTEGRATION_BRANCH__", integration);
  text = replaceToken(text, "__TASK_BRANCH__", task);
  text = replaceToken(text, "__BASE_SHA__", baseSha);
  const output = path.join(taskDir, "PACKAGE.md");
  atomicWrite(output, text);
  console.log(path.relative(process.cwd(), output) || output);
}

function commandCheck(tokens) {
  const args = parseArgs(tokens, new Set(["package", "phase"]));
  const phase = safeLine(args.phase, "phase");
  assert(PHASES.has(phase), `phase must be ${[...PHASES].join(", ")}`);
  const packagePath = resolvePackage(args.package);
  const text = fs.readFileSync(packagePath, "utf8");
  const model = semanticPhase(text, phase);
  const truth = gitTruth(model, phase);
  console.log(`orchestrator: PASS (${phase}) integration=${truth.integrationSha} task=${truth.taskSha}`);
}

function canPhase(text, phase, withGit = false) {
  try {
    const model = semanticPhase(text, phase);
    if (withGit) gitTruth(model, phase);
    return true;
  } catch {
    return false;
  }
}

function commandState(tokens) {
  const args = parseArgs(tokens, new Set(["package"]));
  const packagePath = resolvePackage(args.package);
  const text = fs.readFileSync(packagePath, "utf8");
  let state = "DIAGNOSING";
  if (canPhase(text, "diagnose", true)) state = "READY";
  if (canPhase(text, "prepare", true)) state = "PREPARED";
  if (canPhase(text, "execute", true)) state = "EXECUTING";
  if (canPhase(text, "verify", true)) state = "INTEGRATION_READY";
  if (canPhase(text, "close", true)) state = "CLOSED";
  console.log(`orchestrator: STATE=${state}`);
}

function runCli() {
  const [command, ...tokens] = process.argv.slice(2);
  try {
    if (command === "new") commandNew(tokens);
    else if (command === "check") commandCheck(tokens);
    else if (command === "state") commandState(tokens);
    else fail("command must be new, check, or state");
  } catch (error) {
    if (error instanceof OrchestratorError) fail(error.message);
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
