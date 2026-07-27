package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// ValidateEmployeePhoneTenant prevents the Workforce employee provisioning
// surface from attaching an actor that belongs to another SaaS tenant.
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
	if strings.TrimSpace(existingTenantID) != tenantID {
		return ErrPhoneAlreadyBound
	}
	return nil
}
