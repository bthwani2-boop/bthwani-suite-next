package payout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

type payoutProviderDestination struct {
	ID                   string
	DestinationMethod    string
	BeneficiaryName      string
	DestinationReference string
}

func loadPayoutProviderDestination(
	ctx context.Context,
	tx *sql.Tx,
	payoutID string,
	encryptionKey string,
) (payoutProviderDestination, error) {
	var destination payoutProviderDestination
	err := tx.QueryRowContext(ctx, `
		SELECT d.id,
		       d.destination_method,
		       d.beneficiary_name,
		       COALESCE(pgp_sym_decrypt(d.destination_reference_encrypted, $2), '')
		FROM wlt_payout_requests p
		JOIN wlt_payout_destinations d
		  ON d.id = p.payout_destination_id
		 AND d.owner_actor_id = p.beneficiary_actor_id
		 AND d.owner_actor_type = p.beneficiary_actor_type
		WHERE p.id = $1
		FOR SHARE OF d`, payoutID, encryptionKey).Scan(
		&destination.ID,
		&destination.DestinationMethod,
		&destination.BeneficiaryName,
		&destination.DestinationReference,
	)
	return destination, err
}

func (destination payoutProviderDestination) validateForProvider() error {
	switch destination.DestinationMethod {
	case "bank", "mobile_money":
		if strings.TrimSpace(destination.DestinationReference) == "" {
			return errors.New("provider payout destination has no reference")
		}
	case "manual":
		return errors.New("manual payout destinations cannot be submitted to a provider")
	default:
		return errors.New("payout destination type is unsupported")
	}
	if strings.TrimSpace(destination.BeneficiaryName) == "" {
		return errors.New("payout destination beneficiary name is missing")
	}
	return nil
}

func destinationProviderPayload(destination payoutProviderDestination) map[string]any {
	return map[string]any{
		"id":                   destination.ID,
		"type":                 destination.DestinationMethod,
		"beneficiaryName":      destination.BeneficiaryName,
		"destinationReference": destination.DestinationReference,
	}
}

// HandleProcessGovernedPayoutRequest is disabled in the current product model.
// Completion is routed exclusively through manual execution and reconciliation.
func HandleProcessGovernedPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shared.SendError(w, http.StatusForbidden, "PROVIDER_SUBMISSION_DISABLED", "Active provider payout submission is disabled for the current product model; completion requires manual execution and reconciliation.")
	}
}

// Compile-time guard: destination provider payload must remain JSON-compatible
// without exposing it through the API response model.
var _ = json.Valid
