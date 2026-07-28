package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// ValidateEmployeePhoneTenant enforces a create-only employee provisioning
// boundary. A phone already attached to any actor is rejected before roles or
// permissions can be mutated. Reassignment of an existing employee requires a
// separate, audited Identity operation rather than an implicit phone upgrade.
func (r *Repository) ValidateEmployeePhoneTenant(ctx context.Context, rawPhone, tenantID string) error {
	phone, err := NormalizePhoneE164(rawPhone)
	if err != nil {
		return err
	}
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return ErrInvalidActivation
	}
	var existingTenantID string
	err = r.db.QueryRowContext(ctx, `
		SELECT tenant_id FROM identity_actors WHERE phone_e164=$1 LIMIT 1`, phone).Scan(&existingTenantID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return ErrPhoneAlreadyBound
}
