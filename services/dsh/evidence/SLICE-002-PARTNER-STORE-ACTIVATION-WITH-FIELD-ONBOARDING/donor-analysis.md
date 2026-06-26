# SLICE-002_PARTNER_STORE_ACTIVATION_WITH_FIELD_ONBOARDING
## Donor Analysis & Extraction Notes

We analyzed the donor repository (`C:\bthwani-suite`) to understand the exact roles, states, and rules for partner onboarding and store activation.

### 1. Role Definitions
- **app-field**: Owns initial data and evidence collection (`field-data-collection`). It collects information about the partner's legal identity, primary/secondary contact, branch details, location coordinates, visit notes, and documents. It submits the intake file for review. It is forbidden from final activation or approvals.
- **control-panel (Partners section)**: Responsible for reviewing the submitted files and documents (`partner-lifecycle-review`). It approves or rejects documents individually, check checklist readiness (catalog, delivery mode, serviceability), and triggers the final activation transition or deactivates the partner.
- **app-partner**: Allows the partner to track their onboarding progress, upload missing documents, configure store details (operating hours, delivery modes), and see their current activation status (`partner-status-visibility`). It cannot self-activate.
- **app-client (Discovery)**: Displays stores only when the partner is fully active and all visibility conditions are met (`client-store-visibility`). Requires `client_visible` status.

### 2. State Machine Rules
The transition model consists of 18 states:
- `draft` -> `submitted` -> `field_visit_scheduled` -> `field_visit_completed` -> `documents_missing` -> `documents_uploaded` -> `documents_verified` -> `catalog_not_ready` -> `catalog_ready` -> `delivery_modes_not_ready` -> `delivery_modes_ready` -> `ops_review` -> `ops_approved` -> `ops_rejected` -> `partner_active` -> `partner_deactivated` -> `client_visible` -> `client_hidden`.

### 3. Visibility Gate Conditions
For a store/partner to become `client_visible` (visible in `app-client` search and feed):
1. **Partner Active**: Operations review must be approved.
2. **Catalog Ready**: Products must be created and catalog approved.
3. **Delivery Modes Ready**: At least one delivery mode must be configured.
4. **Serviceability Check**: Runtime check (location coordinates, open hours).

### 4. Required Documents & Evidence
- **Documents**: National ID copy, Commercial Register, Lease/Property contract, Health Certificate (for food categories).
- **Field Evidence**: Front storefront photo, Owner contact verification, Location coordinates, Visit notes.
