import assert from "node:assert/strict";
import test from "node:test";
import { queryKeys } from "../src/query-keys.ts";

test("dshHomeDiscovery normalizes scope parts for stable cache identity", () => {
  assert.deepEqual(
    queryKeys.dshHomeDiscovery({ cityCode: "  RUH ", serviceAreaCode: "  NORTH  " }),
    ["dsh", "home-discovery", "RUH", "NORTH"],
  );
  assert.deepEqual(
    queryKeys.dshHomeDiscovery({ cityCode: "   ", serviceAreaCode: undefined }),
    ["dsh", "home-discovery", null, null],
  );
});
