# Central Catalog Sovereignty Decision

Status: ACTIVE_CANONICAL
Authority domain: `catalog_sovereignty`

This decision refines `governance/policies/product.md` for the DSH catalog domain. Current routes, operation identifiers and schema details remain implementation truth and must match the reviewed commit.

## Canonical ownership

- DSH owns one master catalog truth: business taxonomy, master products, product proposals, store assortment and publication policy.
- Partner, Store, Field and client surfaces may consume or contribute only through governed DSH contracts; they must not create a parallel category or product truth.
- WLT owns ledger and authoritative financial mutation. It may consume governed DSH commercial snapshots/references but does not originate catalog truth.

## Taxonomy

Unless superseded by a newer registered decision and corresponding contracts/migrations:

| Level | Identifier | Storage owner |
| --- | --- | --- |
| L1 | `BUSINESS_DOMAIN` | `dsh_catalog_domains` |
| L2 | `BUSINESS_SUBDOMAIN` | `dsh_catalog_nodes` |
| L3 | `PRODUCT_MAIN_CLASS` | `dsh_catalog_nodes` |
| L4 | `PRODUCT_SUB_CLASS` | `dsh_catalog_nodes` |
| L5 | `MASTER_PRODUCT` | `dsh_master_products` |

L2/L3/L4 form the governed node hierarchy. A domain may intentionally stop before product levels when its product model does not require a catalog.

## Rules

1. No store, partner, field actor or surface may own a competing category taxonomy.
2. A product proposal is a request to change master truth; it is not a sellable product by itself.
3. Store-owned catalog data is assortment/projection data only: the master product carried by the store plus the store-specific price, availability/stock, permitted local metadata/media and publication state allowed by the current schema.
4. Client visibility requires every applicable gate: active/approved master product, active/client-visible taxonomy lineage, client-visible/available store assortment, and a published/visible store. A missing gate hides the item.
5. Governed surfaces consume the canonical DSH taxonomy contract. Hardcoded competing category lists are defects.
6. Platform-owned commercial policy values are resolved from their canonical policy owner rather than hardcoded in application code. DSH may snapshot permitted commercial inputs on an order; WLT remains the financial-truth owner.
7. Manual-request/non-catalog domains use their governed request workflow rather than master-product/store-assortment truth.
8. Legacy catalog structures retained by current migrations are compatibility inputs only when marked legacy/read-only. No surface may resume writes to them. Removal requires completed data/consumer migration and evidence.
9. A generic approval queue may project catalog proposal state for cross-surface visibility, but it does not replace the catalog proposal lifecycle owner defined by the current schema/contract.

## Non-goals

This decision does not itself migrate data, create routes, write code, grant approval or prove runtime behavior. Implementation conformance is established through current contracts, migrations, generated clients, domain code, guards and same-commit evidence.
