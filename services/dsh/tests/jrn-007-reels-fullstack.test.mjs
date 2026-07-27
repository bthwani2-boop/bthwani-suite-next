import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function includesAll(relativePath, markers) {
  const content = read(relativePath);
  for (const marker of markers) {
    assert.ok(content.includes(marker), `${relativePath}: missing ${marker}`);
  }
  return content;
}

test("JRN-007 persistent square video launcher opens the reels viewer regardless of load state", () => {
  const shell = includesAll(
    "services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx",
    [
      "onVideoPress={handleVideoPress}",
      "setVideoOpenRequest",
      "loadState={reelsLoadState}",
      "openRequest={videoOpenRequest}",
      "onRetry={() => void loadReels()}",
    ],
  );
  assert.equal(shell.includes("reels.length > 0 ? { onVideoPress"), false);
  includesAll(
    "services/dsh/frontend/app-client/home-discovery/HomePromoSection.tsx",
    ['label="فيديو"', "isVideo", 'label="الفئات"'],
  );
});

test("JRN-007 viewer mirrors donor behavior with full-screen states and active-only vertical playback", () => {
  const viewer = includesAll(
    "services/dsh/frontend/app-client/home-discovery/HomeReelsSection.tsx",
    [
      "ReelsStateModal",
      "لا توجد فيديوهات معتمدة بعد",
      "pagingEnabled",
      "itemVisiblePercentThreshold: 80",
      "impressedIds",
      "player.pause()",
      "slideCard",
      "borderRadius: 30",
      "ClientRemoteImage",
      "posterUrl",
      "slideSubtitle",
      "slideHighlight",
      "ctaLabelAr",
      "isPrivateDevelopmentHost",
    ],
  );
  assert.equal(viewer.includes("expo-av"), false);
  includesAll(
    "services/dsh/frontend/shared/home-discovery/home-reels.api.ts",
    ["resolveDshMediaUrl(reel.videoUrl)", "resolveDshMediaUrl(reel.posterUrl)", "subtitleAr", "highlightAr", "ctaLabelAr"],
  );
});

test("JRN-007 reel persistence governs poster and localized presentation metadata", () => {
  includesAll(
    "services/dsh/database/migrations/dsh-910_reel_presentation_metadata.sql",
    ["poster_asset_id", "subtitle_ar", "highlight_ar", "cta_label_ar", "ck_dsh_reels_cta_label_lengths"],
  );
  includesAll(
    "services/dsh/database/tests/dsh-910_reel_presentation_metadata.sql",
    ["reel presentation column missing", "poster_asset_id is not governed by the DAM foreign key"],
  );
  includesAll(
    "services/dsh/backend/internal/centralcatalog/reels.go",
    [
      "PosterAssetID",
      "SubtitleAr",
      "HighlightAr",
      "CTALabelAr",
      "validateReelPosterAsset",
      "mime_type LIKE 'image/%'",
      "publicMediaPath(posterAssetID)",
    ],
  );
});

test("JRN-007 partner surface uploads Expo blobs and reads its own store-scoped moderation state", () => {
  includesAll(
    "services/dsh/frontend/shared/catalog/catalog-media.controller-core.ts",
    ["type UploadFileSource", "readonly body: Blob", "uploadReelPoster", "deleteAssetsBestEffort", "posterFile?: UploadFileSource"],
  );
  includesAll(
    "services/dsh/frontend/app-partner/catalog/PartnerReelsManagementSection.tsx",
    [
      "expo-document-picker",
      "File as ExpoFile",
      "type: \"video/mp4\"",
      "uploadAndSubmitReel",
      "fetchPartnerReels",
      "إرسال لمراجعة التسويق",
    ],
  );
  includesAll(
    "services/dsh/frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx",
    ["PartnerReelsManagementSection", "<PartnerReelsManagementSection storeId={storeId} />"],
  );
  includesAll(
    "services/dsh/backend/internal/centralcatalog/reels_partner.go",
    ["submitted_by=$1 AND source_store_id=$2", "ListPartnerReels"],
  );
  includesAll(
    "services/dsh/backend/internal/http/reels_partner.go",
    ["storeId is required", "ResolveActorStoreForID", "centralcatalog.ListPartnerReels"],
  );
});

test("JRN-007 operator preview remains private and moderation commits canonical copy", () => {
  includesAll(
    "services/dsh/backend/internal/http/reels_operator_preview.go",
    [
      "CatalogPermissionMediaManage",
      "private, no-store",
      "X-Content-Type-Options",
      "ReelMediaAssetID",
    ],
  );
  includesAll(
    "services/dsh/frontend/shared/catalog/reels.api.ts",
    ["getIdentityAccessToken", "fetchOperatorReelMediaBlob", "Authorization: `Bearer ${token}`", 'cache: "no-store"'],
  );
  includesAll(
    "services/dsh/frontend/control-panel/catalogs/ReelsReviewPanel.tsx",
    [
      "fetchOperatorReelMediaBlob",
      "URL.createObjectURL",
      "URL.revokeObjectURL",
      "reviewGovernedReel",
      "سبب الرفض مطلوب",
      "اعتماد ونشر مؤهل",
    ],
  );
});

test("JRN-007 governed reels contract is registered in the master index", () => {
  includesAll(
    "services/dsh/contracts/dsh.reels.openapi.yaml",
    [
      "/dsh/partner/reels:",
      "/dsh/operator/reels/{reelId}/media/{kind}:",
      "/dsh/public/reels:",
      "DshGovernedReel:",
      "DshPublicReel:",
      'const: "private, no-store"',
    ],
  );
  includesAll("contracts/master.openapi.yaml", ["dshReels: ../services/dsh/contracts/dsh.reels.openapi.yaml"]);
  includesAll(
    "services/dsh/backend/internal/http/catalog_approval_routes.go",
    [
      'GET /dsh/partner/reels',
      'GET /dsh/operator/reels/{reelId}/media/{kind}',
    ],
  );
});
