# U006 — catalog-products-public-readback

## Current-BB diagnosis

U006 contains useful historical implementation evidence, so do not recreate catalog functionality. Re-prove that app-field reads the centralized catalog, scopes store-local product mutations to the authorized store, preserves proposal/review ownership and never falls back to local catalog truth. Use one store/product identity through field mutation, operator/partner readback and client public visibility. Verify unpublished/rejected products do not leak publicly, price/stock changes remain store-scoped, retries are idempotent and barcode/search inputs resolve through canonical catalog contracts. Any fix must converge on central DSH catalog/product ownership rather than adding app-field copies.

If current behavior already holds, record verification on the current candidate. Do not import unrelated client checkout/order work or generic catalog-administration cleanup.
