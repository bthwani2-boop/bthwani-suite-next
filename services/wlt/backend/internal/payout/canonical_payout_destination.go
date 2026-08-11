package payout

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// canonicalDestinationRequestHash binds an Idempotency-Key to the exact
// request that first used it. It covers the caller-supplied operator id as
// well, because replaying the same destination under a different recorded
// operator is a different request even though it resolves to the same
// material identity.
func canonicalDestinationRequestHash(operatorContextID, actorType, actorID string, input officialWalletDestinationInput) string {
	canonical := struct {
		OperatorContextID         string `json:"operatorContextId"`
		ActorType                 string `json:"actorType"`
		ActorID                   string `json:"actorId"`
		BeneficiaryName           string `json:"beneficiaryName"`
		OfficialWalletProviderKey string `json:"officialWalletProviderKey"`
		DestinationReference      string `json:"destinationReference"`
		OperatorID                string `json:"operatorId"`
	}{
		OperatorContextID:         operatorContextID,
		ActorType:                 actorType,
		ActorID:                   actorID,
		BeneficiaryName:           input.BeneficiaryName,
		OfficialWalletProviderKey: input.OfficialWalletProviderKey,
		DestinationReference:      input.DestinationReference,
		OperatorID:                input.OperatorID,
	}
	encoded, _ := json.Marshal(canonical)
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func scanCanonicalDestination(tx *sql.Tx, operatorContextID, destinationID string) (*governedDestinationRef, error) {
	return scanGovernedDestination(tx.QueryRow(`SELECT `+governedDestinationReturning+`, material_identity_hash
		FROM wlt_payout_destinations WHERE operator_context_id=$1 AND id=$2`, operatorContextID, destinationID))
}

// HandleUpsertCanonicalPayoutDestination is the only write boundary for payout
// destinations.
//
// It accepts an official-wallet provider key and reference, never a bank or
// mobile-money method, and never a destination method chosen by the caller. A
// request whose material identity matches the owner's current active
// destination is returned unchanged, preserving that destination's
// verification. Any change to the provider, the reference or the beneficiary
// supersedes the active row and opens a new unverified version, so a verified
// destination can never be edited into a different one.
func HandleUpsertCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
		if !ok {
			return
		}
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
		if len(idempotencyKey) < 8 {
			shared.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain at least 8 characters")
			return
		}
		var input officialWalletDestinationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "payout destination body is invalid")
			return
		}
		if err := input.normalize(); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		key, err := payoutEncryptionKey()
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "WLT_INTERNAL_ERROR", "payout encryption is not configured")
			return
		}
		requestHash := canonicalDestinationRequestHash(operatorContextID, actorType, actorID, input)
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start destination transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck
		if _, err := tx.ExecContext(r.Context(), `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, operatorContextID+"\x1f"+idempotencyKey); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to lock destination request")
			return
		}

		var previousHash, previousDestinationID string
		err = tx.QueryRowContext(r.Context(), `SELECT request_hash,payout_destination_id
			FROM wlt_payout_destination_requests WHERE operator_context_id=$1 AND idempotency_key=$2`, operatorContextID, idempotencyKey).Scan(&previousHash, &previousDestinationID)
		if err == nil {
			if previousHash != requestHash {
				shared.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "Idempotency-Key was already used with different payout destination inputs")
				return
			}
			destination, readErr := scanCanonicalDestination(tx, operatorContextID, previousDestinationID)
			if readErr != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "stored payout destination replay target is unavailable")
				return
			}
			if err := tx.Commit(); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to complete destination replay")
				return
			}
			shared.SendJSON(w, http.StatusOK, map[string]any{"payoutDestination": destination})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to inspect destination replay")
			return
		}

		if err := assertActiveOfficialWalletProvider(r.Context(), tx, operatorContextID, input.OfficialWalletProviderKey); err != nil {
			if errors.Is(err, errUnsupportedOfficialWalletProvider) {
				shared.SendError(w, http.StatusBadRequest, "OFFICIAL_WALLET_PROVIDER_UNSUPPORTED", err.Error())
				return
			}
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to resolve official wallet provider")
			return
		}

		materialHash := input.materialIdentityHash(operatorContextID, actorType, actorID)
		current, currentMaterialHash, err := currentOfficialWalletDestination(r.Context(), tx, operatorContextID, actorType, actorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read current payout destination")
			return
		}

		operatorID := input.OperatorID
		if operatorID == "" {
			operatorID = actorID
		}

		destination := current
		created := false
		if current == nil || currentMaterialHash != materialHash {
			if err := supersedeActiveDestination(r.Context(), tx, operatorContextID, actorType, actorID); err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to retire current payout destination")
				return
			}
			version, err := nextDestinationVersion(r.Context(), tx, operatorContextID, actorType, actorID)
			if err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to resolve destination version")
				return
			}
			destination, err = insertOfficialWalletDestinationVersion(
				r.Context(), tx, operatorContextID, actorType, actorID, input, key, version, materialHash, operatorID)
			if err != nil {
				shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist payout destination")
				return
			}
			created = true
		}

		if _, err := tx.ExecContext(r.Context(), `INSERT INTO wlt_payout_destination_requests
			(operator_context_id,partner_id,idempotency_key,request_hash,payout_destination_id,correlation_id)
			VALUES($1,$2,$3,$4,$5,$6)`, operatorContextID, actorID, idempotencyKey, requestHash, destination.ID, correlationID); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to bind payout destination request identity")
			return
		}
		action := "destination.unchanged"
		if created {
			action = "destination.version_created"
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_destination", destination.ID, action, operatorID, actorType, "", correlationID, map[string]any{
			"ownerActorId":              actorID,
			"ownerActorType":            actorType,
			"officialWalletProviderKey": destination.OfficialWalletProviderKey,
			"destinationVersion":        destination.DestinationVersion,
			"verificationStatus":        destination.DestinationVerificationStatus,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit payout destination")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit payout destination")
			return
		}
		status := http.StatusOK
		if created {
			status = http.StatusCreated
		}
		shared.SendJSON(w, status, map[string]any{"payoutDestination": destination})
	}
}

type destinationVerificationInput struct {
	DestinationVersion int    `json:"destinationVersion"`
	Decision           string `json:"decision"`
	OperatorID         string `json:"operatorId"`
	Reason             string `json:"reason"`
}

// HandleVerifyCanonicalPayoutDestination is the finance-operator decision that
// moves a destination version into verified or rejected.
//
// The caller must name the exact version it reviewed. If a newer version has
// superseded it in the meantime the decision is refused, so a verification can
// never be applied to a destination the operator did not actually see. The
// operator recording the decision must differ from the actor that created the
// version, which keeps a beneficiary from verifying its own destination.
func HandleVerifyCanonicalPayoutDestination(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		operatorContextID, ok := requirePayoutOperatorContext(w, r)
		if !ok {
			return
		}
		actorType, actorID, err := normalizeGovernedOwner(r.PathValue("actorType"), r.PathValue("actorId"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		correlationID, err := governedCorrelationID(r)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "CORRELATION_REQUIRED", err.Error())
			return
		}
		var input destinationVerificationInput
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "destination verification body is invalid")
			return
		}
		input.Decision = strings.ToLower(strings.TrimSpace(input.Decision))
		input.OperatorID = strings.TrimSpace(input.OperatorID)
		if input.Decision != verificationVerified && input.Decision != verificationRejected {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "decision must be verified or rejected")
			return
		}
		if input.OperatorID == "" {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "operatorId is required to record a destination verification decision")
			return
		}
		if input.DestinationVersion <= 0 {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "destinationVersion is required")
			return
		}

		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to start verification transaction")
			return
		}
		defer tx.Rollback() //nolint:errcheck

		current, _, err := currentOfficialWalletDestination(r.Context(), tx, operatorContextID, actorType, actorID)
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to read payout destination")
			return
		}
		if current == nil {
			shared.SendError(w, http.StatusNotFound, "PAYOUT_DESTINATION_NOT_FOUND", "no active payout destination found")
			return
		}
		if current.DestinationVersion != input.DestinationVersion {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_SUPERSEDED", "a newer destination version has replaced the reviewed version")
			return
		}
		if current.DestinationVerificationStatus == verificationVerified && input.Decision == verificationVerified {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_ALREADY_VERIFIED", "destination version is already verified")
			return
		}
		if input.OperatorID == current.OwnerActorID {
			shared.SendError(w, http.StatusForbidden, "SEPARATION_OF_DUTIES_VIOLATION", "a beneficiary cannot verify its own payout destination")
			return
		}

		// Verification attribution is written only for a verified decision, so
		// a rejection cannot leave a stale verifier on the row.
		verified := input.Decision == verificationVerified
		row := tx.QueryRowContext(r.Context(), `
			UPDATE wlt_payout_destinations
			SET destination_verification_status=$4,
			    destination_verified_at = CASE WHEN $6 THEN now() ELSE NULL END,
			    destination_verified_by_operator_id = CASE WHEN $6 THEN $5 ELSE NULL END,
			    updated_at=now()
			WHERE operator_context_id=$1 AND id=$2 AND destination_version=$3 AND active=true
			RETURNING `+governedDestinationReturning+`, material_identity_hash`,
			operatorContextID, current.ID, input.DestinationVersion, input.Decision, input.OperatorID, verified)
		updated, err := scanGovernedDestination(row)
		if errors.Is(err, sql.ErrNoRows) {
			shared.SendError(w, http.StatusConflict, "PAYOUT_DESTINATION_SUPERSEDED", "destination version changed before the decision was applied")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to persist destination verification")
			return
		}
		if err := appendPayoutAudit(r.Context(), tx, "payout_destination", updated.ID, "destination."+input.Decision, input.OperatorID, "operator", strings.TrimSpace(input.Reason), correlationID, map[string]any{
			"ownerActorId":              actorID,
			"ownerActorType":            actorType,
			"officialWalletProviderKey": updated.OfficialWalletProviderKey,
			"destinationVersion":        updated.DestinationVersion,
			"verificationStatus":        updated.DestinationVerificationStatus,
		}); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to audit destination verification")
			return
		}
		if err := tx.Commit(); err != nil {
			shared.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to commit destination verification")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"payoutDestination": updated})
	}
}
