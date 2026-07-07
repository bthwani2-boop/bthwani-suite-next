# Runtime CI Verification Plan

This document defines the automated verification commands required to validate the health of this journey package.

## Verification Commands

Run the following commands in sequence to verify typescript compatibility, codebase clean code guards, and backend/frontend contract integrity:

### 1. Project Guards
- **Foundation Cross-Journey Remediation**: `pnpm run guard:foundation-cross-journey-remediation`
- **Foundation Cross-Journey Closure**: `pnpm run guard:foundation-cross-journey-closure`
- **Frontend Feature Binding Guard**: `pnpm run guard:frontend-feature-binding`
- **Backend API Binding Guard**: `pnpm run guard:backend-api-binding`
- **Go Routes CI Guard**: `pnpm run guard:go-routes-ci`
- **WLT Financial Boundary Guard**: `pnpm run guard:wlt-financial-boundary`
- **Imports Integrity Guard**: `pnpm run guard:no-broken-imports`

### 2. Static Analysis & Build Checks
- **Typecheck**: `pnpm run typecheck`
- **Tests**: `pnpm run test`
- **Git diff whitespace integrity**: `git --no-pager diff --check`
