# Cleanup Ledger

This ledger records obsolete code structures, endpoints, and components removed during this cleanup.

## Obsolete Files Removed
- `services/dsh/frontend/shared/catalog/dsh-product-api.client.ts`
- `services/dsh/frontend/shared/catalog/dsh-product-api.transport.ts`

## Obsolete Routes Deprecated / write blocked
- `POST /dsh/partner/catalog/categories` -> returning 410 Gone
- `PATCH /dsh/partner/catalog/categories/{categoryId}` -> returning 410 Gone
- `DELETE /dsh/partner/catalog/categories/{categoryId}` -> returning 410 Gone
- `POST /dsh/partner/catalog/products` -> returning 410 Gone
- `PATCH /dsh/partner/catalog/products/{productId}` -> returning 410 Gone
- `DELETE /dsh/partner/catalog/products/{productId}` -> returning 410 Gone
