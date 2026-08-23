import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const mobileApps = ["app-client", "app-partner", "app-captain", "app-field"];

test("Windows Metro is fail-closed on compatible Watchman capabilities and a functional project watch", () => {
  const factory = read("tools/mobile/metro.config.factory.cjs");

  assert.match(factory, /process\.platform !== "win32"/);
  assert.match(factory, /"field-content\.sha1hex"/);
  assert.match(factory, /"relative_root"/);
  assert.match(factory, /"suffix-set"/);
  assert.match(factory, /"wildmatch"/);
  assert.match(factory, /"list-capabilities"/);
  assert.match(factory, /"--no-spawn"/);
  assert.match(factory, /runWatchman\(\["watch-project", projectRoot\]\)/);
  assert.match(factory, /Metro startup is blocked rather than falling back to the Node watcher/);
  assert.match(factory, /config\.resolver\.useWatchman = true/);
  assert.doesNotMatch(factory, /useWatchman\s*=\s*false/);
});

test("all four mobile surfaces consume the single governed Metro watcher policy", () => {
  for (const appKey of mobileApps) {
    const metroConfig = read(`apps/${appKey}/runtime/metro.config.cjs`);
    assert.match(metroConfig, /createBthwaniMetroConfig/);
    assert.match(metroConfig, /tools\/mobile\/metro\.config\.factory\.cjs/);
    assert.doesNotMatch(metroConfig, /useWatchman/);
  }
});

test("the Windows watcher safety policy has one canonical Watchman enablement assignment", () => {
  const factory = read("tools/mobile/metro.config.factory.cjs");
  const assignments = factory.match(/config\.resolver\.useWatchman\s*=\s*true/g) ?? [];
  assert.equal(assignments.length, 1, "shared factory must own exactly one Watchman enablement assignment");
});
