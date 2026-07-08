# Policy & Permissions Gate

- Effective policy resolved on client-side: `resolveEffectivePolicy` in [central-catalog.policy.ts](file:///C:/bthwani-suite-next/services/dsh/frontend/shared/catalog/central-catalog.policy.ts).
- Resolves policies with the hierarchy: node -> parent node -> domain -> default policy.
- Permissions mapped and verified by actor role: `hasCatalogPermission` in [central-catalog.permissions.ts](file:///C:/bthwani-suite-next/services/dsh/frontend/shared/catalog/central-catalog.permissions.ts).
- Platform policies overview rendered in the dashboard policies tab.
