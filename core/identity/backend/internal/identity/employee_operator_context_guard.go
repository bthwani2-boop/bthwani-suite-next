package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// ValidateEmployeePhoneOperatorContext enforces a create-only employee
// provisioning boundary. A phone already attached to any actor is rejected
// before roles or permissions can be mutated. Reassignment of an existing
// employee requires a separate, audited Identity operation rather than an
// implicit phone upgrade.
func (r *Repository) ValidateEmployeePhoneOperatorContext(ctx context.Context, rawPhone, operatorContextID string) error {
	phone, err := NormalizePhoneE164(rawPhone)
	if err != nil {
		return err
	}
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return ErrInvalidActivation
	}
	var existingOperatorContextID string
	err = r.db.QueryRowContext(ctx, `
		SELECT operator_context_id FROM identity_actors WHERE phone_e164=$1 LIMIT 1`, phone).Scan(&existingOperatorContextID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return ErrPhoneAlreadyBound
}
