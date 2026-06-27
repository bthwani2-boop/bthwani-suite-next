import { fail, listCodeFiles } from "./_guard-utils.mjs";

const files = listCodeFiles();
if (!Array.isArray(files)) {
  throw new Error("listCodeFiles failed");
}
fail("test-safe-delete-me", []);
