# U006 — catalog-products-public-readback

## Boundary
This unit covers only catalog/product work that a field employee performs while onboarding or preparing an assigned partner/store, plus the operator/partner/client readers of those exact results. It does not implement general catalog administration, promotions, checkout or partner merchandising features unrelated to field capture.

## Current diagnosis
The current field product screen uses the central catalog, searches products, filters taxonomy, links selected master products in a batch and captures store-local price, availability, stock status and note. Partial batch failure is preserved by leaving failed rows selected, and conflict messaging exists. The screen can also propose a new/corrected product. This is the correct direction because product identity/unit/measurement remain central rather than becoming app-field local truth.

A concrete remaining gap is barcode capture. The search placeholder accepts name or barcode, but the UI examined does not expose a camera scanner and new proposals pass `barcode: null`; simply having `expo-camera` installed is not implementation. Whether camera barcode capture is mandatory must be resolved against current Product Truth/UX authority during execution. If it is required, implement it through the canonical central-catalog lookup/proposal path; if not, record the explicit decision rather than silently treating a missing feature as complete.

The broader closure risk is convergence: batch linking, proposal version/conflict, assortment, stock and publication must be read back by the partner/operator and, only after all store publication gates, by the client. A field-local success message cannot be the final truth.

## Remaining changes
- Resolve and implement/document the authoritative barcode capture requirement.
- Prove master product/taxonomy/version ownership and reject stale/conflicting proposals or links predictably.
- Prove partial batch retry identity and no duplicate assortment effects.
- Verify field-entered store-local price/availability/stock readback on partner/operator surfaces.
- Verify client product/store visibility only after applicable publication/catalog gates and after refresh/restart.

## Exit condition
Field catalog work must use only central product identity, preserve version/conflict semantics, survive retries, and converge to required partner/operator/client readers with no local catalog truth or premature public product visibility.
