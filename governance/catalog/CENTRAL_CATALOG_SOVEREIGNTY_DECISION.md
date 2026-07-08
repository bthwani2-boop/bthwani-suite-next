# Central Catalog Sovereignty Decision

Status: DECIDED
Scope: services/dsh (all surfaces: control-panel, app-partner, app-field, app-client, WLT)

## Decision

The product/category catalog is centralized. There is exactly one sovereign
catalog: the **master catalog**, owned by the DSH catalog domain and exposed
through `/dsh/operator/catalog/*`, `/dsh/partner/catalog/*` (read),
`/dsh/field/catalog/*` (read), and `/dsh/stores/{storeId}/catalog` (client read).

No other surface, table, or code path may originate a category or a product as
ground truth. This decision does not replace code — it is the rule the code in
this journey must conform to.

## Rules

1. **No local category as ground truth.** A store, partner, or field actor
   cannot create a category. Categories exist only as `dsh_catalog_domains`
   (L1/L2) and `dsh_catalog_nodes` (L2 subtree / L3 / L4).
2. **No local product as ground truth.** A store, partner, or field actor
   cannot create a final, sellable product record. The only product-shaped
   record they can create is a `dsh_product_proposals` row — a request to add
   to the master catalog, not a sellable entity.
3. **Store data is assortment-only.** A store owns exactly: which master
   products it carries (`dsh_store_assortments`), at what price, in what
   availability/stock state, with what local note, and — only if platform
   policy allows it for that category — a custom local image. Nothing else is
   store-local ground truth.
4. **No client-visible product without three green lights.** A product is
   visible to `app-client` only if all of: `dsh_master_products.approval_status
   = approved` and `is_active = true`; the owning domain/node is
   `is_active = true` and `is_client_visible = true`; the store assortment row
   has `publication_status = client_visible` and `available = true`; and the
   store itself is published/visible. Missing any one hides the product.
5. **No hardcoded category enums in app-field or app-partner.** Those surfaces
   consume `GET /dsh/field/catalog/taxonomy` and `GET
   /dsh/partner/catalog/taxonomy` at runtime. A hardcoded category list in
   either surface is a defect, not a feature.
6. **No hardcoded commission/fee.** Platform commission rate, field-partner
   onboarding commission, and store onboarding fee are looked up from
   `dsh_catalog_platform_policies` (scoped to node → domain → default),
   never inlined as constants in app code.
7. **Manual-request domains are not catalog domains.** `manual_request` and
   its subdomains `shay_in` and `awnak` have `requires_product_catalog = false`
   and `is_manual_request = true`. They never populate
   `dsh_master_products`/`dsh_store_assortments`; they use a separate
   request-form flow, out of scope for this journey beyond flagging them
   correctly in taxonomy.
8. **Legacy per-store catalog tables (`dsh_catalog_categories`,
   `dsh_catalog_products`, `dsh_catalog_media`, `dsh_catalog_revisions`,
   `dsh_catalog_audit`) are legacy-read-only** as of dsh-030. They are not
   deleted (existing data still needs to be readable during migration), but no
   surface may create or update them going forward. They exist only as an
   input to the compatibility/migration adapter (Phase 7).
9. **`dsh_catalog_approval_records`/`dsh_catalog_approval_audit_trail`
   (dsh-023)** remain the generic cross-domain approval-queue mechanism (also
   used for videos/banners/promos/store approvals unrelated to catalog) and
   are not superseded by this decision. `dsh_product_proposals` is a narrower,
   catalog-specific proposal record; where a proposal needs cross-surface
   queue visibility it may also be projected into
   `dsh_catalog_approval_records` with `entity_type='product'`, but the
   proposal's own lifecycle (`submitted → under_review → adopted/rejected/
   needs_fix`) is authoritative on `dsh_product_proposals.status`.

## Ownership boundary (WLT vs DSH)

- **DSH owns**: the master catalog (domains, nodes, master products), store
  assortment (price/availability/stock/notes/local image), product proposals,
  platform catalog/commission/fee policy, and the commercial-price snapshot
  attached to an order line at the moment of purchase.
- **WLT owns**: settlement, payment capture/payout, and the financial ledger.
  WLT never originates or edits catalog/category/product data; it only reads
  the DSH order snapshot (product name, unit price, commission rate at time of
  sale) to settle.

## Sovereign taxonomy names (authoritative — use exactly these identifiers in
code, migrations, and API payloads)

| Level | Name | Arabic meaning |
|---|---|---|
| L1 | `BUSINESS_DOMAIN` | الفئة الرئيسية للمتجر |
| L2 | `BUSINESS_SUBDOMAIN` | الفئة الفرعية للمتجر |
| L3 | `PRODUCT_MAIN_CLASS` | التصنيف الرئيسي للمنتجات |
| L4 | `PRODUCT_SUB_CLASS` | التصنيف الفرعي للمنتجات |
| L5 | `MASTER_PRODUCT` | المنتج المركزي |

L1 lives in `dsh_catalog_domains`. L2/L3/L4 live in `dsh_catalog_nodes.level`
(`BUSINESS_SUBDOMAIN` / `PRODUCT_MAIN_CLASS` / `PRODUCT_SUB_CLASS`), linked by
`parent_id` to form the tree under a domain. L5 lives in
`dsh_master_products`. Not every domain populates every level — e.g.
`manual_request` has L1/L2 only, no L3/L4/L5.

## Non-goals of this decision

This document does not itself migrate data, write code, or change API
contracts. It is the constitution that Phases 2–11 of the
`CONTROL_PANEL_CENTRAL_CATALOG_SOVEREIGNTY_WITH_PLATFORM_POLICIES` journey
implement against.
