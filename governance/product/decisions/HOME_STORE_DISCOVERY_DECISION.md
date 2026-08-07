# Home and Store Discovery Decision

Status: ACTIVE_CANONICAL
Authority domain: `home_store_discovery`

This decision owns the durable product semantics for client home discovery and store discovery context. It refines `governance/policies/product.md`, the platform model, and the catalog-sovereignty decision. Current route names, operation IDs, schema fields and ranking implementation remain implementation truth on the reviewed commit.

## Outcome

The client home experience must derive categories, stores, availability and discovery state from canonical DSH/product data under trusted platform context and governed business/serviceability scope. It must not create a local catalog, local store truth, hardcoded discoverability truth, or a second context model.

## Ownership

- DSH owns store publication, operational availability, serviceability, business scope and the application-facing discovery result.
- The central catalog owner defines canonical category/product taxonomy and visibility inputs.
- Platform/Identity-owned trusted context is server-derived; client input may express location or discovery intent but cannot authorize or override trusted context.
- Surfaces own presentation, navigation, local transient UI state and caching only; cached data is never newer truth than canonical readback.

## Required behavior

1. Home and store discovery use one canonical context model rather than independent per-screen city/store/category assumptions.
2. A store is discoverable only when every currently applicable partner/store/publication/serviceability/catalog gate passes.
3. Category/taxonomy content comes from the central catalog contract; no client hardcoded list becomes product truth.
4. Location/address input is validated as user intent and resolved against current service-area rules; it is not trusted authorization context.
5. Discovery must expose explicit loading, empty, partial, unavailable/offline, forbidden/not-serviceable and error states where applicable.
6. Stale cached results may be displayed only with the semantics permitted by the active runtime/product contract and must not enable an action that current canonical policy forbids.
7. Ranking, personalization or merchandising may reorder eligible results but may not make an ineligible/unpublished store or product visible.
8. Selecting a discovered store/category must resolve to canonical identifiers and current readback; display labels are not authority keys.
9. Client, operator and partner readbacks that describe the same publication/serviceability fact must converge on the same owner truth with role-appropriate redaction.
10. Discovery behavior must preserve RTL/localization, accessibility, large-text and weak/offline network recovery where the affected surface requires them.

## Forbidden

- local/demo/mock arrays representing live stores or categories;
- client-controlled trusted platform/operator context;
- bypassing publication/serviceability because a store exists in the database;
- separate home and store-detail visibility rules that can contradict each other;
- hardcoded category/product truth in client surfaces;
- deriving financial truth from discovery/commercial display data;
- treating an old cached success as permission to create checkout/order state after current canonical denial.

## Evidence boundary

A static binding can prove that the surface reaches the canonical discovery contract, but runtime evidence is required for serviceability, empty/offline/error behavior and real readback. Visual/accessibility evidence is required when the claimed outcome includes presentation/usability. This decision itself does not prove implementation or closure.
