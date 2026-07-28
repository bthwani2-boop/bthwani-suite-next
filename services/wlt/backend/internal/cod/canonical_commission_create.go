package cod

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

var ErrCommissionSourceFinancialTruthMissing = errors.New("tenant-local WLT payment truth is required for order commission")

func bindCanonicalCommissionFinancialTruth(
	db *sql.DB,
	tenantID string,
	input *CreateGovernedCommissionInput,
) error {
	input.SourceType = strings.ToLower(strings.TrimSpace(input.SourceType))
	input.BeneficiaryActorType = strings.ToLower(strings.TrimSpace(input.BeneficiaryActorType))

	switch input.SourceType {
	case "order":
		if input.BeneficiaryActorType != "captain" && input.BeneficiaryActorType != "partner" {
			return fmt.Errorf("order commissions are supported only for captain or partner beneficiaries")
		}
		paymentSessionID := strings.TrimSpace(input.SourceEvidenceID)
		if paymentSessionID == "" {
			return ErrCommissionSourceFinancialTruthMissing
		}
		var amountMinorUnits int64
		var currency, status string
		err := db.QueryRow(`
			SELECT amount_minor_units, currency, status
			FROM wlt_payment_sessions
			WHERE tenant_id=$1 AND id=$2`, tenantID, paymentSessionID).Scan(
			&amountMinorUnits,
			&currency,
			&status,
		)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCommissionSourceFinancialTruthMissing
		}
		if err != nil {
			return err
		}
		if status != "captured" && status != "cod_collected" {
			return fmt.Errorf("payment session status %q is not commission-eligible", status)
		}
		if amountMinorUnits <= 0 || len(strings.TrimSpace(currency)) != 3 {
			return ErrCommissionSourceFinancialTruthMissing
		}
		input.GrossBasisMinorUnits = amountMinorUnits
		input.Currency = strings.ToUpper(strings.TrimSpace(currency))
		return nil
	case "field_visit":
		return fmt.Errorf("field visit commissions must use POST /wlt/field-commissions")
	default:
		return fmt.Errorf("unsupported commission sourceType %q", input.SourceType)
	}
}

// HandleCreateCanonicalCommission is the only runtime entry point for the
// generic JRN-036 commission route. Caller-supplied amount and currency never
// become financial authority: order commissions resolve both values from a
// tenant-local WLT payment session; field visits use their dedicated evidence
// route and WLT-owned category policy.
func HandleCreateCanonicalCommission(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID, err := shared.RequireTenantContext(r.Context())
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "TENANT_REQUIRED", err.Error())
			return
		}

		var input CreateGovernedCommissionInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
			return
		}
		if input.IdempotencyKey == "" {
			input.IdempotencyKey = strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		}
		if err := bindCanonicalCommissionFinancialTruth(db, tenantID, &input); err != nil {
			switch {
			case errors.Is(err, ErrCommissionSourceFinancialTruthMissing):
				shared.SendError(w, http.StatusConflict, "COMMISSION_SOURCE_TRUTH_MISSING", err.Error())
			default:
				shared.SendError(w, http.StatusUnprocessableEntity, "COMMISSION_SOURCE_INVALID", err.Error())
			}
			return
		}

		commission, err := CreateGovernedCommission(
			r.Context(),
			db,
			input,
			r.Header.Get("X-Correlation-ID"),
		)
		switch {
		case errors.Is(err, ErrGovernedCommissionPolicyMissing):
			shared.SendError(w, http.StatusConflict, "COMMISSION_POLICY_MISSING", err.Error())
			return
		case errors.Is(err, ErrCommissionEvidenceRequired):
			shared.SendError(w, http.StatusConflict, "COMMISSION_EVIDENCE_REQUIRED", err.Error())
			return
		case errors.Is(err, ErrCommissionIdempotencyConflict):
			shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", err.Error())
			return
		case errors.Is(err, ErrCommissionWalletUnavailable):
			shared.SendError(w, http.StatusConflict, "COMMISSION_WALLET_UNAVAILABLE", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusCreated, map[string]any{"commission": commission})
	}
}
