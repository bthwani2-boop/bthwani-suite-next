# Data and Migration Policy

Status: ACTIVE_CANONICAL

Service database folders own business schema and migrations. Shared
infrastructure owns database provisioning, roles, extensions, backup, restore,
and platform health, but never service business schema.

Historical migrations are immutable. Their full filename and SHA-256 are locked
in the service migration manifest. Corrections use a new forward-only migration;
history is never rewritten or blessed with a new checksum. New names are unique
after the current cutover.

One runner and one `schema_migrations` ledger own ordering, checksum, dirty state,
source SHA, and completion. Fresh, upgrade, replay, interrupted failure, and
recovery paths must be tested in isolated data volumes. Destructive reset is
explicit and never a default verification step.

Active isolation fields use `platform_context_id`. Domain ownership uses
`partner_organization_id`, `store_id`, `actor_id`, and `captain_affiliation`.
Partner and store records are never operator context identities.
