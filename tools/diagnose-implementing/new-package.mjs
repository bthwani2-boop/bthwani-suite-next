#!/usr/bin/env node

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkRoot = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(frameworkRoot, '_template');

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function replaceAll(text, replacements) {
  let output = text;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(key).join(value);
  }
  return output;
}

async function pathExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readTemplate(name, replacements) {
  const text = await readFile(join(templateRoot, name), 'utf8');
  return replaceAll(text, replacements);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const name = args.name;
const branch = args.branch;
const sha = args.sha;
const repository = args.repository ?? 'bthwani2-boop/bthwani-suite-next';
const requestedMode = args.mode ?? 'DIAGNOSIS_AND_PLAN_ONLY';

if (!name || !branch || !sha) {
  throw new Error(
    'Usage: node tools/diagnose-implementing/new-package.mjs --name <task-name> --branch <branch> --sha <40-character-sha> [--repository owner/repo] [--mode DIAGNOSIS_AND_PLAN_ONLY]',
  );
}

if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(name)) {
  throw new Error('Task name must be 3-80 characters using lowercase letters, digits, and hyphens only.');
}

if (name === '_template' || name.startsWith('.') || name.includes('..')) {
  throw new Error(`Reserved or unsafe task name: ${name}`);
}

if (!/^[0-9a-f]{40}$/i.test(sha)) {
  throw new Error('The pinned SHA must contain exactly 40 hexadecimal characters.');
}

if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) {
  throw new Error(`Unsafe branch value: ${branch}`);
}

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error(`Repository must use owner/name form: ${repository}`);
}

const destination = resolve(frameworkRoot, name);
const allowedPrefix = `${resolve(frameworkRoot)}${sep}`;
if (!destination.startsWith(allowedPrefix)) {
  throw new Error('Resolved destination escapes tools/diagnose-implementing.');
}

if (await pathExists(destination)) {
  throw new Error(`Destination already exists: ${destination}`);
}

const now = new Date().toISOString();
const taskId = `PKG-${name.toUpperCase().replace(/-/g, '_')}`;
const replacements = {
  TASK_NAME: name,
  TASK_SLUG: name,
  TASK_PACKAGE_ID: taskId,
  TARGET_BRANCH: branch,
  PINNED_START_SHA: sha.toLowerCase(),
  CREATED_AT_ISO: now,
  AGENT_OR_OPERATOR: 'UNRECORDED',
  'bthwani2-boop/bthwani-suite-next': repository,
  DIAGNOSIS_AND_PLAN_ONLY: requestedMode,
};

await mkdir(join(destination, 'evidence'), { recursive: true });
await mkdir(join(destination, 'phases'), { recursive: true });
await mkdir(join(destination, 'tasks'), { recursive: true });

const manifestText = await readTemplate('00-MANIFEST.template.json', replacements);
const manifest = JSON.parse(manifestText);
manifest.task.requestedMode = requestedMode;
manifest.task.repository = repository;
manifest.task.createdAt = now;
manifest.task.id = taskId;
manifest.task.name = name;
manifest.task.slug = name;
await writeJson(join(destination, '00-MANIFEST.json'), manifest);

await writeFile(
  join(destination, '01-DIAGNOSIS-REPORT.md'),
  await readTemplate('01-DIAGNOSIS-REPORT.template.md', replacements),
  'utf8',
);

const finding = JSON.parse(await readTemplate('02-FINDING.template.json', replacements));
await writeJson(join(destination, '02-FINDINGS-REGISTER.json'), {
  schemaVersion: 1,
  packageSlug: name,
  repository,
  targetBranch: branch,
  pinnedStartSha: sha.toLowerCase(),
  allowedStatuses: ['OPEN', 'IN_PROGRESS', 'FIXED_PENDING_VERIFICATION', 'BLOCKED_EXTERNAL', 'CLOSED_WITH_EVIDENCE'],
  findings: [finding],
});

const executionPlan = `# Execution Plan — ${name}\n\n> Planning is not execution authorization. This package remains derived support and must defer to canonical repository authority and the current remote branch.\n\n## 1. Planning baseline\n\n\`\`\`yaml\nrepository: ${repository}\ntarget_branch: ${branch}\npinned_start_sha: ${sha.toLowerCase()}\nrequested_mode: ${requestedMode}\nexecution_authorization: NOT_AUTHORIZED\nplan_status: NOT_READY\n\`\`\`\n\n## 2. Dependency order\n\nDocument why each phase must precede the next. Order by truth ownership, migration safety, consumer dependencies, and operational behavior rather than file location.\n\n## 3. Phase index\n\n| Phase | Outcome | Owned findings | Preconditions | Exit gate | Status |\n| --- | --- | --- | --- | --- | --- |\n| PHASE-00 | Pin authority, scope, inventory, and evidence | FND-0001 | Exact remote SHA | Diagnosis zero gate | PLANNED |\n\n## 4. Vertical-slice rule\n\nEach implementation slice must close one behavior across every affected layer and surface before the next dependent slice opens. Do not execute all backend work, then all frontend work, when the behavior crosses both.\n\n## 5. Work-item ordering\n\n| Order | Work item | Atomic outcome | Depends on | Verification | Commit boundary |\n| ---: | --- | --- | --- | --- | --- |\n| 1 | TASK-0001 | REPLACE_WITH_ATOMIC_OUTCOME | None | VER-0001 | One logical commit and push |\n\n## 6. Per-phase zero gate\n\n\`\`\`yaml\nopen_internal_findings: 0\nfailed_required_checks: 0\nunverified_required_behaviors: 0\nduplicate_truth_owners: 0\ncontract_mismatches: 0\nunverified_deletions: 0\nunresolved_internal_blockers: 0\n\`\`\`\n\nThe next phase may not open while any applicable value is nonzero.\n\n## 7. Migration and deletion sequence\n\nFor each moved, renamed, replaced, or deleted element, define: replacement readiness, consumer migration, compatibility window, data migration, reference search, post-change verification, rollback, and final removal.\n\n## 8. Verification strategy\n\nMap each acceptance criterion to the smallest sufficient check. Add runtime, security, finance, isolation, migration, visual, release, or production evidence only when the claim requires it; never infer one scope from another.\n\n## 9. Commit and remote protocol\n\nFor each work item: re-pin the branch, reconcile unexpected movement, execute one logical unit, verify after the last write, commit, push, re-pin, record the resulting SHA, then open the next eligible work item. Never force-push or overwrite concurrent movement.\n\n## 10. Rollback strategy\n\nDefine code, contract, data, runtime, and operational rollback per phase. Identify irreversible operations before execution authorization.\n\n## 11. Plan-readiness gate\n\n\`\`\`yaml\nunclassified_inventory_items: 0\nfindings_without_evidence: 0\nfindings_without_root_cause: 0\ninternal_findings_without_work_items: 0\nwork_items_without_acceptance_criteria: 0\nwork_items_without_verification: 0\nunresolved_template_markers: 0\ndependency_cycles: 0\n\`\`\`\n\nAny nonzero value keeps the plan at \`NOT_READY\`.\n`;
await writeFile(join(destination, '03-EXECUTION-PLAN.md'), executionPlan, 'utf8');

const workItem = JSON.parse(await readTemplate('03-WORK-ITEM.template.json', replacements));
await writeJson(join(destination, '04-WORK-ITEMS.json'), {
  schemaVersion: 1,
  packageSlug: name,
  oneInProgressAtATime: true,
  workItems: [workItem],
});
await writeJson(join(destination, 'tasks', 'TASK-0001.json'), workItem);

const verification = JSON.parse(await readTemplate('04-VERIFICATION.template.json', replacements));
verification.result.branch = branch;
await writeJson(join(destination, '05-VERIFICATION-MATRIX.json'), {
  schemaVersion: 1,
  packageSlug: name,
  repository,
  targetBranch: branch,
  pinnedStartSha: sha.toLowerCase(),
  verifications: [verification],
});

await writeFile(
  join(destination, '06-CLOSURE-AND-DISPOSAL.md'),
  await readTemplate('99-CLOSURE-AND-DISPOSAL.template.md', replacements),
  'utf8',
);

await writeFile(
  join(destination, 'evidence', 'README.md'),
  `# Evidence index — ${name}\n\nStore only sanitized, task-relevant evidence references here. Prefer immutable repository paths and SHAs, exact commands and exit codes, or immutable external references.\n\nDo not store secrets, credentials, private keys, production data, personal data, raw database dumps, or sensitive screenshots.\n\nEach evidence item must include:\n\n- evidence ID;\n- claim supported;\n- source type;\n- repository/branch/SHA or immutable external reference;\n- exact path, symbol, line range, command, or result;\n- timestamp when temporal state matters;\n- confidence and limitations;\n- linked finding, work-item, acceptance, and verification IDs.\n`,
  'utf8',
);

await writeFile(
  join(destination, 'phases', 'PHASE-00.md'),
  `# PHASE-00 — Foundation and diagnosis\n\n## Outcome\n\nEstablish the exact remote baseline, authority, scope, complete classification, evidence ledger, findings, root causes, truth owners, and an executable dependency-ordered plan.\n\n## Inputs\n\n- Repository: \`${repository}\`\n- Branch: \`${branch}\`\n- Pinned SHA: \`${sha.toLowerCase()}\`\n\n## Owned findings\n\n- \`FND-0001\` — replace or expand after evidence collection.\n\n## Work items\n\n- \`TASK-0001\` — replace with one atomic diagnosis/planning outcome.\n\n## Exit gate\n\n- all in-scope inventory classified;\n- every material finding has evidence, root cause, truth owner, impact, and disposition;\n- every internal finding has an atomic work item;\n- every work item has measurable acceptance and verification;\n- no unresolved authority conflict, silent exclusion, dependency cycle, or template marker;\n- package validator passes in strict mode.\n\n## Status\n\n\`PLANNED\`\n`,
  'utf8',
);

console.log(`Created disposable diagnosis/implementation package: ${destination}`);
console.log(`Pinned remote baseline: ${repository}@${branch} ${sha.toLowerCase()}`);
console.log(`Next: fill evidence and registers, then run:`);
console.log(`node tools/diagnose-implementing/validate-package.mjs tools/diagnose-implementing/${name} --strict`);
