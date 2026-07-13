-- DSH-037: Bring store media (logo, cover, storefront/interior/signage
-- photos) under the central DAM instead of the free hero_image_url/logo_url/
-- *_photo_ref columns on dsh_stores. Those columns are kept as a transitional
-- read-through cache written when a store image link is approved; they are
-- not the source of truth once this migration lands.
--
-- Extends dsh_catalog_asset_links.entity_type/role from dsh-032 rather than
-- widening dsh_store_assortments' scope: a store's logo/cover/branch photos
-- are governed the same way a product's canonical image is (upload ->
-- pending_review -> approve), just scoped to entity_type='store'.

ALTER TABLE dsh_catalog_asset_links
    DROP CONSTRAINT IF EXISTS dsh_catalog_asset_links_entity_type_check;
ALTER TABLE dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_entity_type_check CHECK (entity_type IN
        ('domain', 'node', 'master_product', 'product_proposal', 'store_assortment',
         'collection', 'campaign', 'store'));

ALTER TABLE dsh_catalog_asset_links
    DROP CONSTRAINT IF EXISTS dsh_catalog_asset_links_role_check;
ALTER TABLE dsh_catalog_asset_links
    ADD CONSTRAINT dsh_catalog_asset_links_role_check CHECK (role IN
        ('icon', 'cover', 'thumbnail', 'gallery', 'canonical_product_image',
         'partner_custom_product_image', 'marketing_banner', 'document',
         'store_logo', 'store_cover', 'storefront_photo', 'interior_photo', 'signage_photo'));
