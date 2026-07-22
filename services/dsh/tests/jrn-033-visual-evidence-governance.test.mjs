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
    "fixture بصري محكوم",
    "Identity → DSH → WLT",
  ], "visual evidence screen");
});

test("JRN-033 visual route is disabled outside the explicit evidence environment", () => {
  const page = read("apps/control-panel/runtime/src/app/dsh/finance/jrn-033-visual-evidence/page.tsx");
  const layout = read("apps/control-panel/runtime/src/app/dsh/layout.tsx");
  includesAll(page, ["NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE", '!== "1"', "notFound()"], "visual evidence page");
  includesAll(layout, [
    'pathname === "/dsh/finance/jrn-033-visual-evidence"',
    'process.env.NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE === "1"',
  ], "control-panel evidence auth isolation");
});

test("JRN-033 visual workflow captures hashed immutable evidence and distinguishes fixtures from runtime truth", () => {
  const workflow = read(".github/workflows/jrn-033-visual-evidence.yml");
  includesAll(workflow, [
    "NEXT_PUBLIC_JRN_033_VISUAL_EVIDENCE=1",
    "NEXT_PUBLIC_DSH_API_BASE_URL=/api/dsh",
    "success empty frozen error loading",
    "--headless=new",
    "SHA256SUMS",
    "jrn-033-visual-evidence-${{ github.sha }}",
    "Fixtures are visual-state data only; Docker runtime workflow owns live financial evidence.",
  ], "visual evidence workflow");
});
