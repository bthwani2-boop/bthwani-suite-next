import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verifyCatalogPath = new URL("../scripts/verify-catalog.ps1", import.meta.url);
const storeSchemaPath = new URL(
  "../../services/dsh/contracts/components/schemas/store.schemas.yaml",
  import.meta.url,
);

const [verifyCatalog, storeSchema] = await Promise.all([
  readFile(verifyCatalogPath, "utf8"),
  readFile(storeSchemaPath, "utf8"),
]);

test("catalog runtime readback consumes the canonical store media contract", () => {
  assert.match(storeSchema, /^\s{4}heroImageUrl:\s*$/m);
  assert.match(verifyCatalog, /storeDetails\.store\.heroImageUrl/);
  assert.doesNotMatch(verifyCatalog, /storeDetails\.store\.heroUrl\b/);
  assert.match(verifyCatalog, /missing heroImageUrl/);
});
