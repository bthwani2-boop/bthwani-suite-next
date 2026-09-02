import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("captain readiness API exposes a DSH-owned start-work decision", async () => {
  const [publicApi, dispatchApi, dispatchTypes] = await Promise.all([
    read("services/dsh/frontend/app-captain/index.ts"),
    read("services/dsh/frontend/shared/dispatch/dispatch.api.ts"),
    read("services/dsh/frontend/shared/dispatch/dispatch.types.ts"),
  ]);

  assert.match(publicApi, /fetchOwnCaptainReadiness as fetchCaptainOperationalReadiness/);
  assert.match(publicApi, /DshCaptainReadiness as CaptainOperationalReadiness/);
  assert.match(dispatchApi, /export function fetchOwnCaptainReadiness/);
  assert.match(dispatchApi, /\/dsh\/captain\/me\/readiness/);
  assert.match(
    dispatchTypes,
    /export type DshCaptainReadiness =\s*operations\["getOwnCaptainReadiness"\]\["responses"\]\[200\]\["content"\]\["application\/json"\];/,
  );
  assert.doesNotMatch(publicApi, /captain-readiness\.api/);
});
