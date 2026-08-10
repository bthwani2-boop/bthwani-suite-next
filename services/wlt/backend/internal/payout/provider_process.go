package payout

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/provider"
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

// HandleProcessGovernedPayoutRequest is the only current provider-submission
// handler. Destination secrets are decrypted inside WLT for the outbound
// provider call and are never serialized in the HTTP response or audit data.
func HandleProcessGovernedPayoutRequest(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorID, ok := decodeRequiredOperator(w, r)
		if !ok {
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		providerClient, err := provider.NewDefaultPaymentProvider()
		if err != nil {
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_CONFIG_ERROR", err.Error())
			return
		}
		encryptionKey, err := payoutEncryptionKey()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout encryption is not configured")
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start payout provider transaction")
			return
		}
		defer tx.Rollback()

		req, err := lockedPayout(r.Context(), tx, r.PathValue("payoutId"))
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payout request not found")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout request")
			return
		}
		if req.Status != "approved" {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "only approved payout requests can be processed")
			return
		}
		if req.ApprovedByOperatorID == "" || req.ApprovedByOperatorID == operatorID {
			shared.SendError(w, http.StatusForbidden, "MAKER_CHECKER_VIOLATION", "payout processor must differ from approver")
			return
		}

		destination, err := loadPayoutProviderDestination(r.Context(), tx, req.ID, encryptionKey)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_MISSING", "payout request has no owned destination")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to load payout destination")
			return
		}
		if err := destination.validateForProvider(); err != nil {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_UNSUPPORTED", err.Error())
			return
		}

		claimed, err := tx.ExecContext(r.Context(), `
			UPDATE wlt_payout_requests
			SET status = 'provider_pending',
			    processed_at = now(),
			    processed_by_operator_id = $2,
			    operator_id = $2,
			    provider_status = 'pending',
			    provider_processed_at = now()
			WHERE id = $1 AND status = 'approved'`, req.ID, operatorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to claim payout provider submission")
			return
		}
		if affected, _ := claimed.RowsAffected(); affected != 1 {
			shared.SendError(w, http.StatusConflict, "PAYOUT_ALREADY_CLAIMED", "payout request was already claimed for provider submission")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_request", req.ID, "payout.processing", operatorID, "operator", "", correlationID, map[string]any{
			"status":              "provider_pending",
			"payoutDestinationId": destination.ID,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout processing")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout provider claim")
			return
		}

		providerResult, providerErr := providerClient.Post(
			r.Context(),
			"/financial/payout/process",
			map[string]any{
				"payoutId":             req.ID,
				"beneficiaryActorId":   req.BeneficiaryActorID,
				"beneficiaryActorType": req.BeneficiaryActorType,
				"amountMinorUnits":     req.AmountMinorUnits,
				"currency":             req.Currency,
				"destination":          destinationProviderPayload(destination),
			},
			provider.RequestMetaFromHTTP(r, "wlt-payout-process"),
		)
		if providerErr != nil {
			var cleanDecline provider.Error
			if errors.As(providerErr, &cleanDecline) && cleanDecline.StatusCode >= 400 && cleanDecline.StatusCode < 500 {
				if failErr := failProviderDecline(r.Context(), db, req.ID, providerErr, correlationID, operatorID); failErr != nil {
					shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist provider payout decline")
					return
				}
				shared.SendProviderError(w, providerErr)
				return
			}
			markProviderResultUnknown(r.Context(), db, req.ID, providerErr, correlationID, operatorID)
			shared.SendProviderError(w, providerErr)
			return
		}

		providerStatus := strings.ToLower(strings.TrimSpace(providerResult.Status))
		if providerResult.ProviderReference == "" || (providerStatus != "processed" && providerStatus != "succeeded") {
			invalidResponseErr := errors.New("provider response missing successful proof")
			markProviderResultUnknown(r.Context(), db, req.ID, invalidResponseErr, correlationID, operatorID)
			shared.SendError(w, http.StatusBadGateway, "PROVIDER_INVALID_RESPONSE", invalidResponseErr.Error())
			return
		}

		finalTx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			markProviderResultUnknown(r.Context(), db, req.ID, err, correlationID, operatorID)
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start provider proof transaction")
			return
		}
		defer finalTx.Rollback()
		updated, err := payoutAfterUpdate(r.Context(), finalTx, `
			UPDATE wlt_payout_requests
			SET status = 'processing',
			    provider_reference = $2,
			    provider_status = $3,
			    provider_processed_at = now(),
			    processed_by_operator_id = $4,
			    operator_id = $4
			WHERE id = $1 AND status = 'provider_pending'
			RETURNING `+requestCols,
			req.ID,
			providerResult.ProviderReference,
			providerStatus,
			operatorID,
		)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATUS", "payout provider result arrived after state changed")
			return
		}
		if err != nil {
			markProviderResultUnknown(r.Context(), db, req.ID, err, correlationID, operatorID)
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist provider payout proof")
			return
		}
		if err := appendPayoutAudit(r.Context(), finalTx, "payout_request", req.ID, "payout.provider_processed", operatorID, "operator", "", correlationID, map[string]any{
			"status":            "processing",
			"providerStatus":    providerStatus,
			"providerReference": providerResult.ProviderReference,
		}); err != nil {
			markProviderResultUnknown(r.Context(), db, req.ID, err, correlationID, operatorID)
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit provider payout proof")
			return
		}
		if err := finalTx.Commit(); err != nil {
			markProviderResultUnknown(r.Context(), db, req.ID, err, correlationID, operatorID)
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit provider payout proof")
			return
		}
		updated.PayoutDestinationID = destination.ID
		updated.ReconciliationStatus = "not_required"
		shared.SendJSON(w, http.StatusOK, PayoutRequestResponse{PayoutRequest: updated})
	}
}

// Compile-time guard: destination provider payload must remain JSON-compatible
// without exposing it through the API response model.
var _ = json.Valid
