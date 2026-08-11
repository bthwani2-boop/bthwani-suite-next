package partner

import (
	"context"
	"database/sql"
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

func normalizePayoutProjectionOwner(operatorContextID, ownerActorID string) (string, string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	ownerActorID = strings.TrimSpace(ownerActorID)
	if operatorContextID == "" || ownerActorID == "" {
		return "", "", fmt.Errorf("operator context and partner owner actor are required")
	}
	return operatorContextID, ownerActorID, nil
}

// SyncOwnerPayoutDestinationProjection updates every DSH Partner business owned
// by the same partner actor inside the trusted OperatorContext. WLT destinations
// are actor-owned, while DSH onboarding/readiness is business-Partner-owned;
// syncing the full owner scope avoids choosing an arbitrary Store when one
// owner manages multiple Partner businesses. Exact replays are no-ops and do
// not create artificial partner-version churn.
func SyncOwnerPayoutDestinationProjection(
	ctx context.Context,
	db *sql.DB,
	operatorContextID, ownerActorID string,
	input PayoutDestinationProjection,
) error {
	operatorContextID, ownerActorID, err := normalizePayoutProjectionOwner(operatorContextID, ownerActorID)
	if err != nil {
		return err
	}
	projection, err := normalizePayoutDestinationProjection(input)
	if err != nil {
		return err
	}

	if _, err = db.ExecContext(ctx, `
		UPDATE dsh_partners
		SET payout_destination_id = $3,
		    destination_method = $4,
		    masked_destination_reference = $5,
		    destination_verification_status = $6,
		    version = version + 1,
		    updated_at = NOW()
		WHERE operator_context_id = $1
		  AND owner_actor_id = $2
		  AND (
		    COALESCE(payout_destination_id,'') IS DISTINCT FROM $3 OR
		    COALESCE(destination_method,'') IS DISTINCT FROM $4 OR
		    COALESCE(masked_destination_reference,'') IS DISTINCT FROM $5 OR
		    COALESCE(destination_verification_status,'') IS DISTINCT FROM $6
		  )`,
		operatorContextID,
		ownerActorID,
		projection.ID,
		projection.DestinationMethod,
		projection.MaskedDestinationReference,
		projection.DestinationVerificationStatus,
	); err != nil {
		return err
	}

	var total, converged int
	if err = db.QueryRowContext(ctx, `
		SELECT COUNT(*),
		       COUNT(*) FILTER (
		         WHERE COALESCE(payout_destination_id,'') = $3
		           AND COALESCE(destination_method,'') = $4
		           AND COALESCE(masked_destination_reference,'') = $5
		           AND COALESCE(destination_verification_status,'') = $6
		       )
		FROM dsh_partners
		WHERE operator_context_id = $1 AND owner_actor_id = $2`,
		operatorContextID,
		ownerActorID,
		projection.ID,
		projection.DestinationMethod,
		projection.MaskedDestinationReference,
		projection.DestinationVerificationStatus,
	).Scan(&total, &converged); err != nil {
		return err
	}
	if total == 0 {
		return ErrNotFound
	}
	if converged != total {
		return fmt.Errorf("payout destination projection did not converge for every owned Partner")
	}
	return nil
}

// ClearOwnerPayoutDestinationProjection removes stale DSH readiness state for
// all Partner businesses owned by the actor when WLT reports no active
// destination. Historical/raw financial facts remain exclusively in WLT.
func ClearOwnerPayoutDestinationProjection(
	ctx context.Context,
	db *sql.DB,
	operatorContextID, ownerActorID string,
) error {
	operatorContextID, ownerActorID, err := normalizePayoutProjectionOwner(operatorContextID, ownerActorID)
	if err != nil {
		return err
	}

	if _, err = db.ExecContext(ctx, `
		UPDATE dsh_partners
		SET payout_destination_id = '',
		    destination_method = '',
		    masked_destination_reference = '',
		    destination_verification_status = '',
		    version = version + 1,
		    updated_at = NOW()
		WHERE operator_context_id = $1
		  AND owner_actor_id = $2
		  AND (
		    COALESCE(payout_destination_id,'') <> '' OR
		    COALESCE(destination_method,'') <> '' OR
		    COALESCE(masked_destination_reference,'') <> '' OR
		    COALESCE(destination_verification_status,'') <> ''
		  )`, operatorContextID, ownerActorID); err != nil {
		return err
	}

	var total, clear int
	if err = db.QueryRowContext(ctx, `
		SELECT COUNT(*),
		       COUNT(*) FILTER (
		         WHERE COALESCE(payout_destination_id,'') = ''
		           AND COALESCE(destination_method,'') = ''
		           AND COALESCE(masked_destination_reference,'') = ''
		           AND COALESCE(destination_verification_status,'') = ''
		       )
		FROM dsh_partners
		WHERE operator_context_id = $1 AND owner_actor_id = $2`,
		operatorContextID, ownerActorID,
	).Scan(&total, &clear); err != nil {
		return err
	}
	if total == 0 {
		return ErrNotFound
	}
	if clear != total {
		return fmt.Errorf("payout destination projection did not clear for every owned Partner")
	}
	return nil
}
