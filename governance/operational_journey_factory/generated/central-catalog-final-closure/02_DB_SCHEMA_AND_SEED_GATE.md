# DB Schema & Seed Gate

- Seed file: [central_catalog_seed.sql](file:///C:/bthwani-suite-next/services/dsh/database/seeds/central_catalog_seed.sql)
- Verification script: [verify-central-catalog-seed.sql](file:///C:/bthwani-suite-next/services/dsh/database/scripts/verify-central-catalog-seed.sql)
- Seed status endpoint: `GET /dsh/operator/catalog/seed-status`
- Seed status banner in frontend dashboard.
- Verification checks: All 11 L1 categories exist, `domain-manual-request` exists, `node-shay-in` and `node-awnak` exist under manual request.
