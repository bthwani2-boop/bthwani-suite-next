import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");

function includesAll(content, values, label) {
  for (const value of values) assert.ok(content.includes(value), `${label} is missing ${value}`);
}

test("JRN-033 visual evidence renders actual wallet components for all representative surfaces", () => {
  const screen = read("services/dsh/frontend/control-panel/finance/Jrn033VisualEvidenceScreen.tsx");
  includesAll(screen, [
    "ActorWalletPanel",
    "RepresentativeWalletLookup",
    'client: "تطبيق العميل"',
    'partner: "تطبيق الشريك"',
    'captain: "تطبيق الكابتن"',
    'field: "تطبيق الميداني"',
    '"success" | "empty" | "frozen" | "error" | "loading"',
    "بيانات هذه الصفحة مخصصة لإثبات العرض المرئي",
    "Identity → DSH → WLT",
  ], "visual evidence screen");
});

test("JRN-033 visual route is disabled outside the explicit evidence environment", () => {
  const page = read("apps/control-panel/runtime/src/app/dsh/finance/jrn-033-visual-evidence/page.tsx");
  const flags = read("apps/control-panel/runtime/src/config/public-runtime-flags.ts");
  const layout = read("apps/control-panel/runtime/src/app/dsh/layout.tsx");
  includesAll(page, ["publicRuntimeFlags.jrn033VisualEvidenceEnabled", "notFound()"], "visual evidence page");
  includesAll(flags, ["NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE", '=== "1"'], "public runtime evidence flag");
  includesAll(layout, [
    'pathname === "/dsh/finance/jrn-033-visual-evidence"',
    "publicRuntimeFlags.jrn033VisualEvidenceEnabled",
  ], "control-panel evidence auth isolation");
});

test("JRN-033 visual evidence remains governed by unified immutable CI", () => {
  const dedicatedWorkflow = path.join(repositoryRoot, ".github/workflows/jrn-033-visual-evidence.yml");
  const workflow = read(".github/workflows/ci-node-verification.yml");
  assert.equal(fs.existsSync(dedicatedWorkflow), false, "dedicated journey workflow must remain consolidated into unified CI");
  includesAll(workflow, [
    "pnpm exec nx run-many -t test --all --outputStyle=stream",
    "pnpm run nx:build",
    "Upload Node test evidence",
  ], "unified visual-component verification workflow");
});
