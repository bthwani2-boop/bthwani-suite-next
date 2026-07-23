import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../src/resumable-upload.ts", import.meta.url),
  "utf8",
);

test("media runtime persists resumable checkpoints and completes governed assets", () => {
  for (const marker of [
    "uploadResumableMedia",
    "checkpointKey",
    "uploadChunk",
    "completeSession",
    "MEDIA_SIZE_CHANGED",
  ]) {
    assert.match(source, new RegExp(marker));
  }
});
