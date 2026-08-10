package partner

import (
	"context"
	"database/sql"
)

func requiredDocumentsForCategory(category string) []string {
	switch category {
	case "restaurant", "bakery":
		return []string{"commercial_register", "national_id", "health_certificate"}
	default:
		return []string{"commercial_register", "national_id"}
	}
}

// EvaluateOnboardingCaseStatus checks the uploaded documents and updates the
// partner's onboarding_case_status accordingly.
func EvaluateOnboardingCaseStatus(ctx context.Context, tx *sql.Tx, partnerID string) error {
	var category string
	var currentStatus OnboardingCaseStatus
	err := tx.QueryRowContext(ctx, `SELECT category, onboarding_case_status FROM dsh_partners WHERE id = $1`, partnerID).Scan(&category, &currentStatus)
	if err != nil {
		return err
	}

	// If it's not in a state that can automatically be promoted, do nothing.
	// For instance, if it's already "submitted" or "validation_failed" or "duplicate_suspected", we might not automatically revert it unless rules specify.
	if currentStatus != OnboardingStatusDraft && currentStatus != OnboardingStatusEvidencePending {
		return nil
	}

	required := requiredDocumentsForCategory(category)

	// Query uploaded documents for this partner
	rows, err := tx.QueryContext(ctx, `SELECT document_type FROM dsh_partner_documents WHERE partner_id = $1`, partnerID)
	if err != nil {
		return err
	}
	defer rows.Close()

	uploadedSet := make(map[string]bool)
	for rows.Next() {
		var dt string
		if err := rows.Scan(&dt); err != nil {
			return err
		}
		uploadedSet[dt] = true
	}

	allRequiredPresent := true
	for _, req := range required {
		if !uploadedSet[req] {
			allRequiredPresent = false
			break
		}
	}

	var newStatus OnboardingCaseStatus
	if allRequiredPresent {
		newStatus = OnboardingStatusDraft
	} else {
		newStatus = OnboardingStatusEvidencePending
	}

	if newStatus != currentStatus {
		_, err = tx.ExecContext(ctx, `UPDATE dsh_partners SET onboarding_case_status = $2, updated_at = NOW() WHERE id = $1`, partnerID, newStatus)
		if err != nil {
			return err
		}
	}

	return nil
}
