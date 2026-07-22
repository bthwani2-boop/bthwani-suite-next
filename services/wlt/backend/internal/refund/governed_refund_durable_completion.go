package refund

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"wlt-api/internal/provider"
	"wlt-api/internal/shared"
)

var ErrRefundOutcomePersistence = errors.New("refund provider outcome could not be durably persisted")

// CompleteGovernedRefundWithProviderDurable preserves the original provider
// semantics while refusing to hide a database failure that leaves a claimed
// refund in processing. The legacy completion path already attempts to persist
// definitive and ambiguous outcomes; this wrapper verifies that attempt and
// retries the state transition once when the first persistence attempt did not
// commit. If persistence still fails, callers receive an explicit joined error
// instead of a misleading provider-only response.
func CompleteGovernedRefundWithProviderDurable(ctx context.Context, db *sql.DB, client financialProvider, refundID, operatorID, correlationID string) (*GovernedRefund, error) {
	item, operationErr := CompleteGovernedRefundWithProvider(ctx, db, client, refundID, operatorID, correlationID)
	if operationErr == nil {
		return item, nil
	}

	current, readErr := GetGovernedRefund(db, refundID)
	if readErr != nil {
		return nil, errors.Join(operationErr, fmt.Errorf("%w: read claimed refund: %v", ErrRefundOutcomePersistence, readErr))
	}
	if current == nil || current.Status != "processing" {
		return item, operationErr
	}

	var persistErr error
	switch {
	case errors.Is(operationErr, ErrRefundProviderUnknown):
		persistErr = markGovernedRefundProviderUnknown(ctx, db, current, operationErr, correlationID)
	case isDefinitiveProviderFailure(operationErr):
		persistErr = markGovernedRefundProviderFailure(ctx, db, current, operationErr, correlationID)
	default:
		return item, operationErr
	}
	if persistErr != nil {
		return nil, errors.Join(operationErr, fmt.Errorf("%w: %v", ErrRefundOutcomePersistence, persistErr))
	}
	return item, operationErr
}

// HandleCompleteGovernedRefundDurable is the public governed completion route.
// It uses the durable wrapper so an outcome-persistence failure can never be
// mistaken for a normal provider decline or an acknowledged unknown result.
func HandleCompleteGovernedRefundDurable(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID string `json:"operatorId"`
		}
		if !decodeGovernedJSON(w, r, &input) {
			return
		}
		client, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		item, err := CompleteGovernedRefundWithProviderDurable(
			r.Context(),
			db,
			client,
			r.PathValue("refundId"),
			input.OperatorID,
			r.Header.Get("X-Correlation-ID"),
		)
		if err != nil {
			if errors.Is(err, ErrRefundOutcomePersistence) {
				shared.SendError(w, http.StatusInternalServerError, "REFUND_OUTCOME_PERSISTENCE_FAILED", err.Error())
				return
			}
			if !sendGovernedRefundError(w, err) {
				shared.SendProviderError(w, err)
			}
			return
		}
		if item == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"refund": item})
	}
}
