package identity

import (
	"context"
	"errors"
	"strings"

	"github.com/lib/pq"
)

var localBootstrapActorIDs = []string{
	"operator-local-001",
	"partner-local-001",
	"field-local-001",
	"captain-local-001",
	"client-local-001",
	"platform-approver-local-001",
	"platform-applier-local-001",
	"platform-rollout-manager-local-001",
}

func normalizeLocalBootstrapTenantID(raw string) (string, error) {
	tenantID := strings.TrimSpace(raw)
	if tenantID == "" {
		return "", errors.New("BTHWANI_DEFAULT_TENANT_ID is required when IDENTITY_LOCAL_BOOTSTRAP=true")
	}
	return tenantID, nil
}

// RepairLocalBootstrapTenant makes the configured runtime tenant authoritative
// for every explicitly local bootstrap identity. Older development databases may
// contain these actors with a blank or stale tenant because the original
// bootstrap upsert did not update tenant_id on conflict. The repair is bounded
// to local bootstrap actors and is disabled whenever local bootstrap is off.
func (r *Repository) RepairLocalBootstrapTenant(
	ctx context.Context,
	input LocalBootstrap,
	configuredTenantID string,
) error {
	if !input.Enabled {
		return nil
	}
	tenantID, err := normalizeLocalBootstrapTenantID(configuredTenantID)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		UPDATE identity_actors
		SET tenant_id = $1, updated_at = now()
		WHERE id = ANY($2)
		  AND tenant_id IS DISTINCT FROM $1`,
		tenantID, pq.Array(localBootstrapActorIDs),
	)
	return err
}
