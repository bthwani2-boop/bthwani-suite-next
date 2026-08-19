import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci-runtime.yml"), "utf8");
const contextualWorkflow = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
const runtimePhase = fs.readFileSync(path.join(repoRoot, "tools/scripts/invoke-runtime-phase.ps1"), "utf8");
const runtimeDispatch = fs.readFileSync(path.join(repoRoot, "infra/docker/scripts/runtime-dispatch.ps1"), "utf8");

test("DSH runtime profiles bootstrap exactly once before catalog readback and smoke", () => {
  const bootstrap = workflow.indexOf('Invoke-Phase "runtime:bootstrap-dev"');
  const readback = workflow.indexOf('Invoke-Phase "runtime:catalog-readback"');
  const smoke = workflow.indexOf('Invoke-Phase "runtime:smoke"');
  assert.ok(bootstrap > 0, "DSH bootstrap phase is missing");
  assert.match(workflow, /-Action bootstrap-dev -Profiles \$profiles -Force/);
  assert.equal(workflow.match(/Invoke-Phase "runtime:bootstrap-dev"/g)?.length, 1);
  assert.ok(readback > bootstrap, "catalog readback must follow bootstrap");
  assert.ok(smoke > readback, "smoke must follow catalog readback");
});

test("identity-security includes WLT and clean-clone media storage without local seed media", () => {
  assert.match(workflow, /"identity-security"\s*\{\s*"identity,workforce,dsh,wlt,media-storage"\s*\}/g);
  assert.doesNotMatch(workflow, /"identity-security"\s*\{\s*"[^"]*(?:^|,)media(?:,|$)[^"]*"\s*\}/g);
});

test("CI runtime profiles never require workstation local seed media", () => {
  assert.match(workflow, /"dsh"\s*\{\s*"dsh,media-storage"\s*\}/g);
  assert.match(workflow, /"full"\s*\{\s*"identity,workforce,dsh,wlt,providers,platform,financial-simulators,mail,media-storage"\s*\}/g);
  assert.doesNotMatch(workflow, /\{\s*"[^"\n]*(?:^|,)media(?:,|$)[^"\n]*"\s*\}/g);
});

test("profiles without DSH retain the non-mutating up path", () => {
  assert.match(workflow, /if \(\$requiresDshBootstrap\)[\s\S]*?else \{[\s\S]*?Invoke-Phase "runtime:up"/);
  assert.match(workflow, /-Action up -Profiles \$profiles/);
});

test("candidate-bound smoke reuses the prepared DSH image and preserves selected media capability", () => {
  assert.match(runtimePhase, /PreparedRuntimeMarkerPath/);
  assert.match(runtimePhase, /Assert-PreparedRuntimeMarker/);
  assert.match(runtimePhase, /runtimeParameters\.PreparedRuntime = \$true/);
  assert.match(runtimeDispatch, /\[switch\]\$PreparedRuntime/);
  assert.match(runtimeDispatch, /\$dshProfileString = \$dshProfiles -join ","/);
  assert.match(runtimeDispatch, /if \(\$PreparedRuntime\)[\s\S]*?skipping duplicate DSH image build/);
  assert.match(runtimeDispatch, /if \(\$PreparedRuntime\)[\s\S]*?Invoke-RuntimeEngine -EngineAction "smoke" -EngineProfiles \$dshProfileString/);
  assert.match(runtimeDispatch, /Invoke-RuntimeEngine -EngineAction "seed" -EngineProfiles \$dshProfileString/);
  assert.match(runtimeDispatch, /elseif \(\$hasMediaStorage\) \{ \$dshProfiles \+= "media-storage" \}/);
});

test("aggregate runtime applicability follows the canonical runtime_required decision", () => {
  assert.match(
    contextualWorkflow,
    /RUNTIME_REQUIRED:\s*\$\{\{\s*needs\.context\.outputs\.runtime_required\s*\}\}/,
    "aggregate must consume the router's canonical runtime_required output",
  );
  assert.doesNotMatch(
    contextualWorkflow,
    /RUNTIME_REQUIRED:\s*\$\{\{\s*needs\.context\.outputs\.runtime\s*\}\}/,
    "runtime relevance must never be reinterpreted as runtime proof being required",
  );
});
