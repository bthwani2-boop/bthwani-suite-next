import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const workflowsRoot = path.join(repoRoot, ".github", "workflows");
const actionsRoot = path.join(repoRoot, ".github", "actions");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function walk(root, predicate) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (predicate(full)) result.push(full);
    }
  }
  return result.sort();
}

function relative(fullPath) {
  return path.relative(repoRoot, fullPath).split(path.sep).join("/");
}

const workflowFiles = walk(workflowsRoot, (file) => /\.ya?ml$/i.test(file));
const actionFiles = walk(actionsRoot, (file) => /action\.ya?ml$/i.test(file));
const allActionDocuments = [...workflowFiles, ...actionFiles];

const requiredWorkflows = [
  "ci.yml",
  "security.yml",
  "governance-audit.yml",
  "dsh-operational-closure-ci.yml",
  "jrn-043-sdlc-governance-ci-release.yml",
];

const forbiddenMutationPattern = /\b(?:git\s+(?:push|commit|reset\s+--hard)|gh\s+pr\s+merge)\b/i;
const forbiddenRewritePattern = /\b(?:gofmt\s+-w|prettier\s+--write|eslint\s+--fix|sed\s+-i|perl\s+-pi)\b/i;

test("JRN-043 permanent workflow set exists without temporary one-shot files", () => {
  const names = new Set(workflowFiles.map((file) => path.basename(file)));
  for (const name of requiredWorkflows) assert.ok(names.has(name), `missing permanent workflow ${name}`);
  for (const name of names) {
    assert.doesNotMatch(name, /(?:one[-_]?shot|oneshot|one[-_]?time)/i, `temporary workflow is forbidden: ${name}`);
  }
});

test("all workflows declare least privilege and cannot mutate repository source", () => {
  assert.ok(workflowFiles.length > 0, "no workflows found");
  for (const file of workflowFiles) {
    const fileName = relative(file);
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /^permissions:\s*(?:\n|$)|^permissions:\s*\{\s*\}\s*$/m, `${fileName}: missing explicit top-level permissions`);
    assert.doesNotMatch(text, /contents:\s*write\b|write-all\b/i, `${fileName}: source write permission forbidden`);
    assert.doesNotMatch(text, /pull_request_target\s*:/i, `${fileName}: pull_request_target forbidden`);
    assert.doesNotMatch(text, forbiddenMutationPattern, `${fileName}: source or branch mutation forbidden`);
    assert.doesNotMatch(text, forbiddenRewritePattern, `${fileName}: source rewrite command forbidden`);
  }
});

test("every external action is pinned and checkout credentials are disabled", () => {
  for (const file of allActionDocuments) {
    const fileName = relative(file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^\s*-?\s*uses:\s*([^\s#]+)/);
      if (!match) continue;
      const target = match[1];
      if (target.startsWith("./") || target.startsWith("docker://")) continue;
      assert.match(target, /@[a-f0-9]{40}$/i, `${fileName}:${index + 1}: mutable action reference ${target}`);
      if (/^actions\/checkout@/i.test(target)) {
        const block = lines.slice(index, index + 12).join("\n");
        assert.match(block, /persist-credentials:\s*false\b/, `${fileName}:${index + 1}: checkout credentials must not persist`);
      }
    }
  }
});

test("historically self-mutating JRN-032 workflows remain verification-only", () => {
  for (const relativePath of [
    ".github/workflows/jrn-032-operational-analytics.yml",
    ".github/workflows/jrn-032-pr-verification.yml",
  ]) {
    const text = read(relativePath);
    assert.doesNotMatch(text, /contents:\s*write\b/i, `${relativePath}: write permission regressed`);
    assert.doesNotMatch(text, forbiddenMutationPattern, `${relativePath}: source mutation regressed`);
    assert.doesNotMatch(text, forbiddenRewritePattern, `${relativePath}: rewrite command regressed`);
  }
});

test("JRN-043 SDLC impact and artifact manifest stay aligned", () => {
  const impact = readJson("governance/evidence/jrn-043/change-impact.json");
  const artifact = readJson("governance/evidence/jrn-043/artifact-manifest.json");
  assert.equal(impact.schemaVersion, 3);
  assert.equal(artifact.schemaVersion, 3);
  assert.equal(impact.capabilityId, "JRN-043");
  assert.equal(artifact.capabilityId, impact.capabilityId);
  assert.equal(artifact.repositoryMode, "REMOTE_ONLY");
  assert.equal(artifact.branch, "sambassam");
  assert.equal(artifact.resolvedCommitSha, impact.baseCommitSha);
  assert.equal(impact.productImpact, "NONE");
  assert.equal(artifact.productTruthState, "NOT_APPLICABLE");
  for (const key of ["qa", "security", "governance", "ci", "release"]) assert.equal(impact.impacts[key], true, `impact ${key} must be declared`);
  for (const scope of ["static", "qa", "security", "governance", "ci", "release"]) assert.ok(artifact.applicableEvidenceScopes.includes(scope), `missing evidence scope ${scope}`);
  assert.equal(artifact.decision, "NEEDS_EVIDENCE");
  assert.equal(artifact.separationOfDutiesPass, false);
  assert.ok(artifact.openBlockers.length > 0, "independent blockers must remain explicit");
});

test("release policy forbids self-authorized merge, release, and production claims", () => {
  const policy = readJson("governance/release/jrn-043-release-control-policy.json");
  assert.equal(policy.journeyId, "JRN-043");
  assert.equal(policy.targetBranch, "sambassam");
  assert.equal(policy.ciPolicy.verificationOnly, true);
  assert.equal(policy.ciPolicy.sourceMutationForbidden, true);
  assert.equal(policy.ciPolicy.externalActionsRequireFullCommitSha, true);
  assert.equal(policy.ciPolicy.checkoutPersistedCredentialsForbidden, true);
  assert.equal(policy.ciPolicy.temporaryOneShotWorkflowsForbidden, true);
  assert.equal(policy.pullRequestPolicy.implementationActorMayMerge, false);
  assert.equal(policy.pullRequestPolicy.independentReviewRequired, true);
  assert.equal(policy.releasePolicy.automaticReleaseForbidden, true);
  assert.equal(policy.releasePolicy.releaseAuthorityApprovalRequired, true);
  assert.equal(policy.releasePolicy.signedTagRequired, true);
  assert.equal(policy.releasePolicy.rollbackPlanRequired, true);
  assert.equal(policy.releasePolicy.productionEvidenceRequiredForProductionClaim, true);
  assert.equal(policy.decisionPolicy.technicalPassDoesNotAuthorizeMerge, true);
  assert.equal(policy.decisionPolicy.technicalPassDoesNotAuthorizeRelease, true);
  assert.equal(policy.decisionPolicy.technicalPassDoesNotAuthorizeProduction, true);
});
