package payment

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrReconciliationCaseNotFound      = errors.New("reconciliation case not found")
	ErrReconciliationCaseNotOpen       = errors.New("reconciliation case is not open")
	ErrReconciliationSubjectConflict   = errors.New("reconciliation subject is not in provider_result_unknown state")
	ErrUnsupportedReconciliationAction = errors.New("reconciliation action cannot establish financial truth")
)

// ResolveReconciliationCase is the only WLT entry point for resolving an
// ambiguous payment-provider outcome. The reconciliation row is a workflow
// projection: it is updated only in the same transaction as the canonical
// payment-session transition, provider-event attestation, optional capture
// ledger effect, and DSH outbox projection.
func ResolveReconciliationCase(ctx context.Context, db *sql.DB, caseID, operatorContextID, operatorID, resolutionAction, resolutionNote string) error {
	caseID = strings.TrimSpace(caseID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	operatorID = strings.TrimSpace(operatorID)
	resolutionAction = strings.TrimSpace(resolutionAction)
	resolutionNote = strings.TrimSpace(resolutionNote)
	if db == nil || caseID == "" || operatorContextID == "" || operatorID == "" {
		return fmt.Errorf("caseId, operatorContextId and operatorId are required")
	}
	if resolutionNote == "" {
		return fmt.Errorf("resolutionNote is required as operator evidence")
	}
	if resolutionAction != "confirmed_success" && resolutionAction != "confirmed_failed" {
		return ErrUnsupportedReconciliationAction
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var sessionID, operation, caseStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT payment_session_id, operation, status
		FROM wlt_reconciliation_cases
		WHERE id=$1 AND operator_context_id=$2
		FOR UPDATE`, caseID, operatorContextID).Scan(&sessionID, &operation, &caseStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrReconciliationCaseNotFound
	}
	if err != nil {
		return err
	}
	if caseStatus != "open" {
		return ErrReconciliationCaseNotOpen
	}
	if operation != "authorize" && operation != "capture" {
		return fmt.Errorf("reconciliation operation %q is not a payment operation", operation)
	}

	session, err := scanSessionNullable(tx.QueryRowContext(ctx, `
		SELECT `+sessionCols+` FROM wlt_payment_sessions WHERE id=$1 FOR UPDATE`, sessionID))
	if err != nil {
		return err
	}
	if session == nil {
		return ErrReconciliationCaseNotFound
	}
	if session.OperatorContextID != operatorContextID {
		return ErrReconciliationSubjectConflict
	}
	if session.Status != "provider_result_unknown" {
		return ErrReconciliationSubjectConflict
	}

	providerStatus := "failed"
	if resolutionAction == "confirmed_success" {
		providerStatus = "authorized"
		if operation == "capture" {
			providerStatus = "captured"
		}
	}
	eventType := "payment." + providerStatus
	eventID := "reconciliation:" + caseID + ":" + resolutionAction
	payload := strings.Join([]string{caseID, sessionID, operatorContextID, operatorID, operation, resolutionAction, resolutionNote}, "\x00")
	digest := sha256.Sum256([]byte(payload))
	payloadHash := hex.EncodeToString(digest[:])

	var existingHash string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO wlt_payment_provider_events
			(provider_event_id, operator_context_id, payment_session_id, event_type, provider_status,
			 provider_reference, payload_hash, signature_timestamp, occurred_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
		ON CONFLICT (provider_event_id) DO UPDATE SET provider_event_id = EXCLUDED.provider_event_id
		RETURNING payload_hash`,
		eventID, operatorContextID, sessionID, eventType, providerStatus,
		session.ProviderReference, payloadHash,
	).Scan(&existingHash)
	if err != nil {
		return err
	}
	if existingHash != payloadHash {
		return ErrProviderEventConflict
	}

	ledgerTransactionID := ""
	if providerStatus == "captured" {
		ledgerTransactionID, err = postCapturedProviderResult(ctx, tx, session, session.ProviderReference, eventID)
		if err != nil {
			return err
		}
	} else {
		if _, err = updateAuthoritativeSessionState(ctx, tx, session, providerStatus, session.ProviderReference, eventID); err != nil {
			return err
		}
	}

	resolution := "operator-confirmed provider status: " + providerStatus
	if _, err = tx.ExecContext(ctx, `
		UPDATE wlt_reconciliation_cases
		SET status='resolved', resolved_by_operator_id=$3, resolution_action=$4,
		    resolution_note=$5, resolution=$6, resolved_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND operator_context_id=$2 AND status='open'`,
		caseID, operatorContextID, operatorID, resolutionAction, resolutionNote, resolution); err != nil {
		return err
	}

	if _, err = tx.ExecContext(ctx, `
		UPDATE wlt_payment_provider_events
		SET processing_state='applied', processing_result=$2, processed_at=NOW()
		WHERE provider_event_id=$1`, eventID, "reconciliation case "+caseID+" resolved"); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	_ = ledgerTransactionID
	return nil
}
