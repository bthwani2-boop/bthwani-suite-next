package partner

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// PayoutDestinationProjection is the only financial destination state DSH may
// cache for partner readiness. WLT remains the owner of the raw destination,
// provider policy, versioning, verification and settlement truth.
type PayoutDestinationProjection struct {
	ID                            string
	DestinationMethod             string
	MaskedDestinationReference    string
	DestinationVerificationStatus string
}

func normalizePayoutDestinationProjection(input PayoutDestinationProjection) (PayoutDestinationProjection, error) {
	input.ID = strings.TrimSpace(input.ID)
	input.DestinationMethod = strings.TrimSpace(input.DestinationMethod)
	input.MaskedDestinationReference = strings.TrimSpace(input.MaskedDestinationReference)
	input.DestinationVerificationStatus = strings.TrimSpace(input.DestinationVerificationStatus)

	if input.ID == "" {
		return PayoutDestinationProjection{}, fmt.Errorf("payout destination id is required")
	}
	if input.DestinationMethod != "official_wallet" {
		return PayoutDestinationProjection{}, fmt.Errorf("DSH may cache only official-wallet payout destinations")
	}
	if input.MaskedDestinationReference == "" {
		return PayoutDestinationProjection{}, fmt.Errorf("masked payout destination reference is required")
	}
	switch input.DestinationVerificationStatus {
	case "unverified", "verified", "requires_reverification", "rejected":
	default:
		return PayoutDestinationProjection{}, fmt.Errorf("unsupported payout destination verification status")
	}
	return input, nil
}

// SyncPayoutDestinationProjection updates only WLT-owned masked projection
// fields. Exact replays are no-ops so a WLT idempotent replay cannot create
// artificial partner-version churn.
func SyncPayoutDestinationProjection(ctx context.Context, db *sql.DB, partnerID string, input PayoutDestinationProjection) (Partner, error) {
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return Partner{}, ErrInvalid
	}
	projection, err := normalizePayoutDestinationProjection(input)
	if err != nil {
		return Partner{}, err
	}

	row := db.QueryRowContext(ctx, `
		UPDATE dsh_partners
		SET payout_destination_id = $2,
		    destination_method = $3,
		    masked_destination_reference = $4,
		    destination_verification_status = $5,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1
		  AND (
		    COALESCE(payout_destination_id,'') IS DISTINCT FROM $2 OR
		    COALESCE(destination_method,'') IS DISTINCT FROM $3 OR
		    COALESCE(masked_destination_reference,'') IS DISTINCT FROM $4 OR
		    COALESCE(destination_verification_status,'') IS DISTINCT FROM $5
		  )
		RETURNING `+governedPartnerColumns,
		partnerID,
		projection.ID,
		projection.DestinationMethod,
		projection.MaskedDestinationReference,
		projection.DestinationVerificationStatus,
	)
	updated, err := scanGovernedPartner(row)
	if err == nil {
		return SanitizePartnerForSurface(updated), nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Partner{}, err
	}

	// No row means either an exact replay or a missing partner. Read back the
	// canonical DSH projection to distinguish those states without incrementing
	// the optimistic partner version.
	current, err := GetPartnerSanitized(db, partnerID)
	if err != nil {
		return Partner{}, err
	}
	if current.PayoutDestinationID != projection.ID ||
		current.DestinationMethod != projection.DestinationMethod ||
		current.MaskedDestinationReference != projection.MaskedDestinationReference ||
		current.DestinationVerificationStatus != projection.DestinationVerificationStatus {
		return Partner{}, fmt.Errorf("payout destination projection did not converge")
	}
	return current, nil
}

// ClearPayoutDestinationProjection removes stale DSH readiness state when WLT
// reports that the partner has no active destination. Historical/raw financial
// facts stay in WLT; DSH deliberately keeps no second payout truth.
func ClearPayoutDestinationProjection(ctx context.Context, db *sql.DB, partnerID string) (Partner, error) {
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return Partner{}, ErrInvalid
	}
	row := db.QueryRowContext(ctx, `
		UPDATE dsh_partners
		SET payout_destination_id = '',
		    destination_method = '',
		    masked_destination_reference = '',
		    destination_verification_status = '',
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $1
		  AND (
		    COALESCE(payout_destination_id,'') <> '' OR
		    COALESCE(destination_method,'') <> '' OR
		    COALESCE(masked_destination_reference,'') <> '' OR
		    COALESCE(destination_verification_status,'') <> ''
		  )
		RETURNING `+governedPartnerColumns,
		partnerID,
	)
	updated, err := scanGovernedPartner(row)
	if err == nil {
		return SanitizePartnerForSurface(updated), nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Partner{}, err
	}
	return GetPartnerSanitized(db, partnerID)
}
