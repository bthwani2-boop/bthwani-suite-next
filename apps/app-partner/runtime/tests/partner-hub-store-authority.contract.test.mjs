import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

test("partner hub keeps store status owned by canonical settings readback", async () => {
  const renderer = await read("services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx");
  const types = await read("services/dsh/frontend/app-partner/dsh-partner.types.ts");
  const hub = await read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");

  assert.doesNotMatch(renderer, /storeOpen=\{false\}|listingEnabled=\{false\}/);
  assert.doesNotMatch(types, /storeOpen\?: boolean|listingEnabled\?: boolean/);
  assert.match(hub, /fetchPartnerStoreSettings\(canonicalStoreId\)/);
  assert.match(hub, /const resolvedStoreOpen = storeRuntime\.settings\.storeOpen/);
  assert.match(hub, /const resolvedListingEnabled = storeRuntime\.settings\.listingEnabled/);
  assert.match(hub, /storeOpen=\{resolvedStoreOpen\}/);
  assert.match(hub, /listingEnabled=\{resolvedListingEnabled\}/);
});
