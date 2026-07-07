# 06 Frontend Surface Remediation

status: `VERIFIED`

## UI Controller and Adapter Isolation

- **App Client Surface**: Fully bound. Controllers isolated from UI layout representation.
- **App Partner Surface**: Fully bound. Catalog inventory, category management, product edit, and store settings are managed via controllers.
- **App Captain Surface**: Fully bound. Pickup, map layer, dropoff, and proof of delivery are decoupled from UI components.
- **App Field Surface**: Fully bound. Partner progress, verification checklists, and photo uploads are handled via model hooks.
- **Control Panel Surface**: All workspaces (operations, platform, finance, support, catalogs, administration, hr) use dedicated frame models.

## Layout and Token Validation

- `guard:design-tokens` outputs progressive warnings for raw layout values in styling properties. These are progressively resolved without breaking visual rendering.
- `guard:ui-kit-boundary` enforces color roles. Brand-specific color tokens from `shared/ui-kit` are utilized rather than raw hex/rgb values.
- Direct API calls (`fetch`, `axios`, etc.) are prohibited inside screens and pages. All communication is routed through shared controllers or adaptors.
