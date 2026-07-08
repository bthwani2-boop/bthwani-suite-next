# Legacy Client Cleanup Status

## Status: IN_PROGRESS

Legacy file: `services/dsh/frontend/shared/catalog/dsh-product-api.client.ts`
Transport file: `services/dsh/frontend/shared/catalog/dsh-product-api.transport.ts`

To delete:
- [ ] Remove all imports referencing `dsh-product-api.client` in app-partner screens.
- [ ] Update `ui-only-runtime-clients.ts` to remove references to the legacy client.
- [ ] Delete `dsh-product-api.client.ts` and `dsh-product-api.transport.ts`.
