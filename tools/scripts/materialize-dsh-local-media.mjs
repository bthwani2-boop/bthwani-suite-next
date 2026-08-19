import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(repoRoot, "services/dsh/database/seeds/media/local-media.manifest.json");
const mediaRoot = path.join(repoRoot, "services/dsh/database/seeds/local/media");
const outputDirectory = path.join(repoRoot, ".artifacts/local-dev/dsh-media-seed");
const outputPath = path.join(outputDirectory, "dsh-media.local.sql");

const validation = spawnSync(process.execPath, [path.join(repoRoot, "tools/scripts/check-local-media-contract.mjs"), "--mode", "contract"], {
  cwd: repoRoot,
  encoding: "utf8",
  stdio: "inherit",
  windowsHide: true,
});
if (validation.status !== 0) process.exit(validation.status ?? 1);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function linkFor(item) {
  const key = String(item.entityLogicalKey);
  const role = String(item.role);
  if ((item.entityType === "category" || item.entityType === "subcategory") && key.startsWith("node-")) {
    return { assetId: `asset-${key}`, linkId: `link-${key}`, entityType: "node", entityId: key, role: "cover" };
  }
  if (item.entityType === "store" && key !== "store-example" && key !== "store-1001") {
    if (role === "logo") return { assetId: `asset-local-${key}-logo`, linkId: `link-local-store-card-${key}-logo`, entityType: "store", entityId: key, role: "store_logo" };
    if (role === "hero") return { assetId: `asset-local-${key}-cover`, linkId: `link-local-store-card-${key}-cover`, entityType: "store", entityId: key, role: "store_cover" };
  }
  return productBindingByLogicalKey.get(key) ?? null;
}

// This is the canonical business association policy for legacy local placeholder
// products. Physical media truth (path, checksum, MIME, dimensions and alt text)
// remains exclusively in local-media.manifest.json.
const productBindingByLogicalKey = new Map([
  ["product-canned-tuna", { assetId: "asset-public-product-rice", linkId: "link-public-product-rice", entityType: "master_product", entityId: "product-1001-rice", role: "canonical_product_image" }],
  ["product-chocolate-box", { assetId: "asset-public-product-croissant", linkId: "link-public-product-croissant", entityType: "master_product", entityId: "product-1002-croissant", role: "canonical_product_image" }],
  ["product-cheese-kraft", { assetId: "asset-public-product-wheatbread", linkId: "link-public-product-wheatbread", entityType: "master_product", entityId: "product-1002-wheatbread", role: "canonical_product_image" }],
  ["product-aptamil-1", { assetId: "asset-public-product-milk", linkId: "link-public-product-milk", entityType: "master_product", entityId: "product-1001-milk", role: "canonical_product_image" }],
  ["product-imported-banana", { assetId: "asset-public-product-apple", linkId: "link-public-product-apple", entityType: "master_product", entityId: "product-1001-apple", role: "canonical_product_image" }],
  ["product-example", { assetId: "asset-public-product-meal", linkId: "link-public-product-meal", entityType: "master_product", entityId: "product-1005-meal", role: "canonical_product_image" }],
  ["product-panadol-advance", { assetId: "asset-public-product-pain-relief", linkId: "link-public-product-pain-relief", entityType: "master_product", entityId: "product-1006-pain-relief", role: "canonical_product_image" }],
  ["product-galaxy-s24", { assetId: "asset-public-product-android-phone", linkId: "link-public-product-android-phone", entityType: "master_product", entityId: "product-electronics-android-phone", role: "canonical_product_image" }],
]);

function getHomeAssetId(item) {
  if (item.entityType === "banner") {
    if (item.entityLogicalKey === "banner-001") return "asset-local-home-banner-restaurants";
    if (item.entityLogicalKey === "banner-002") return "asset-local-home-banner-offers";
    return `asset-local-home-banner-${item.entityLogicalKey}`;
  }
  if (item.entityType === "promo") {
    if (item.entityLogicalKey === "promo-001") return "asset-local-home-promo-free-delivery";
    if (item.entityLogicalKey === "promo-002") return "asset-local-home-promo-top-rated";
    return `asset-local-home-promo-${item.entityLogicalKey}`;
  }
  return null;
}

const assets = [];
const links = [];
const storeUpdates = [];
const homeUpdates = [];

for (const item of manifest.media) {
  const relativePath = String(item.relativeSourcePath).replaceAll("\\", "/");
  const binding = linkFor(item);
  const homeAssetId = getHomeAssetId(item);

  if (binding || homeAssetId) {
    const assetId = binding ? binding.assetId : homeAssetId;
    let size = 0;
    try {
      size = fs.statSync(path.join(mediaRoot, relativePath)).size;
    } catch { size = 1000; } // Fallback for headless CI without media workstation files
    
    assets.push(`(${[
      sql(assetId), sql(relativePath), "NULL", sql(item.fileName), sql(item.mimeType), String(size),
      String(item.expectedWidth), String(item.expectedHeight), sql(item.expectedChecksum), sql(item.altAr), sql(item.altEn),
      sql("#ffffff"), sql("approved"), sql("system"), sql("system-seed"),
    ].join(", ")})`);

    if (binding) {
      links.push({ ...binding });
      if (binding.entityType === "store") {
        const column = binding.role === "store_cover" ? "hero_image_url" : "logo_url";
        storeUpdates.push(`UPDATE dsh_stores SET ${column}=${sql(`/dsh/public/media/${binding.assetId}/original`)}, updated_at=NOW() WHERE id=${sql(binding.entityId)} AND operator_context_id='local-dsh';`);
      }
    } else {
      if (item.entityType === "banner") {
        homeUpdates.push(`UPDATE dsh_home_banners SET image_url=${sql(`/dsh/public/media/${assetId}/original`)}, is_active=TRUE, updated_at=NOW() WHERE id=${sql(item.entityLogicalKey)};`);
      } else if (item.entityType === "promo") {
        homeUpdates.push(`UPDATE dsh_home_promos SET image_url=${sql(`/dsh/public/media/${assetId}/original`)}, is_active=TRUE, updated_at=NOW() WHERE id=${sql(item.entityLogicalKey)};`);
      }
    }
  }
}

const lines = [
  "-- GENERATED FROM services/dsh/database/seeds/media/local-media.manifest.json.",
  "-- DO NOT EDIT. Regenerate by running tools/scripts/materialize-dsh-local-media.mjs.",
  "-- This file is machine-local runtime state under .artifacts/local-dev/.",
  "",
];

if (assets.length > 0) {
  lines.push(
    "INSERT INTO dsh_catalog_assets",
    "  (id, object_key, public_url, original_file_name, mime_type, size_bytes, width, height, checksum_sha256, alt_ar, alt_en, dominant_color, status, source_surface, uploaded_by)",
    "VALUES",
    `  ${assets.join(",\n  ")}`,
    "ON CONFLICT (id) DO UPDATE SET",
    "  object_key=EXCLUDED.object_key, public_url=NULL, original_file_name=EXCLUDED.original_file_name,",
    "  mime_type=EXCLUDED.mime_type, size_bytes=EXCLUDED.size_bytes, width=EXCLUDED.width, height=EXCLUDED.height,",
    "  checksum_sha256=EXCLUDED.checksum_sha256, alt_ar=EXCLUDED.alt_ar, alt_en=EXCLUDED.alt_en,",
    "  dominant_color=EXCLUDED.dominant_color, status='approved', source_surface=EXCLUDED.source_surface,",
    "  uploaded_by=EXCLUDED.uploaded_by, updated_at=NOW();",
    "",
  );
}

for (const binding of links) {
  lines.push(
    `UPDATE dsh_catalog_asset_links SET is_primary=FALSE, updated_at=NOW() WHERE entity_type=${sql(binding.entityType)} AND entity_id=${sql(binding.entityId)} AND role=${sql(binding.role)} AND status <> 'archived' AND id <> ${sql(binding.linkId)} AND is_primary=TRUE;`,
    "INSERT INTO dsh_catalog_asset_links (id, asset_id, entity_type, entity_id, role, sort_order, is_primary, status)",
    `VALUES (${sql(binding.linkId)}, ${sql(binding.assetId)}, ${sql(binding.entityType)}, ${sql(binding.entityId)}, ${sql(binding.role)}, 0, TRUE, 'approved')`,
    "ON CONFLICT (id) DO UPDATE SET asset_id=EXCLUDED.asset_id, entity_type=EXCLUDED.entity_type, entity_id=EXCLUDED.entity_id, role=EXCLUDED.role, sort_order=0, is_primary=TRUE, status='approved', updated_at=NOW();",
    "",
  );
}

lines.push(...storeUpdates, ...homeUpdates, "");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`dsh-local-media-materialize: PASS assets=${assets.length} links=${links.length} output=${path.relative(repoRoot, outputPath)}`);
