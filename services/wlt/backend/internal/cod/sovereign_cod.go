package cod

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

var (
	ErrCodEvidenceConflict = errors.New("COD custody evidence conflicts with the persisted event")
	ErrCodActorMismatch    = errors.New("actor is not authorized for this COD custody transition")
)

type CodCustodyEvidence struct {
	ID                       string `json:"id"`
	CodRecordID              string `json:"codRecordId"`
	EventType                 string `json:"eventType"`
	ExpectedAmountMinorUnits int64  `json:"expectedAmountMinorUnits"`
	ActualAmountMinorUnits   int64  `json:"actualAmountMinorUnits"`
	DifferenceMinorUnits     int64  `json:"differenceMinorUnits"`
	Currency                 string `json:"currency"`
	ProofReference           string `json:"proofReference"`
	ActorID                  string `json:"actorId"`
	ActorType                string `json:"actorType"`
	Note                     string `json:"note"`
	CorrelationID            string `json:"correlationId"`
	IdempotencyKey           string `json:"idempotencyKey"`
	LedgerTransactionID      string `json:"ledgerTransactionId"`
	CreatedAt                string `json:"createdAt"`
}

type CodReconciliationCase struct {
	ID                       string  `json:"id"`
	CodRecordID              string  `json:"codRecordId"`
	CustodyEvidenceID        string  `json:"custodyEvidenceId"`
	ExpectedAmountMinorUnits int64   `json:"expectedAmountMinorUnits"`
	ActualAmountMinorUnits   int64   `json:"actualAmountMinorUnits"`
	DifferenceMinorUnits     int64   `json:"differenceMinorUnits"`
	Currency                 string  `json:"currency"`
	TriggerReason            string  `json:"triggerReason"`
	Status                   string  `json:"status"`
	AssignedToOperatorID     *string `json:"assignedToOperatorId"`
	AssignedAt               *string `json:"assignedAt"`
	InvestigationNote        string  `json:"investigationNote"`
	ResolvedByOperatorID     *string `json:"resolvedByOperatorId"`
	ResolutionAction         *string `json:"resolutionAction"`
	ResolutionNote           string  `json:"resolutionNote"`
	ResolvedAt               *string `json:"resolvedAt"`
	CreatedAt                string  `json:"createdAt"`
	UpdatedAt                string  `json:"updatedAt"`
}

type CollectCodInput struct {
	ActualAmountMinorUnits int64  `json:"actualAmountMinorUnits"`
	ProofReference         string `json:"proofReference"`
	ActorID                string `json:"actorId"`
	ActorType              string `json:"actorType"`
	Note                   string `json:"note"`
	CorrelationID          string `json:"-"`
	IdempotencyKey         string `json:"-"`
}

type RemitCodInput struct {
	ProofReference string `json:"proofReference"`
	ActorID        string `json:"actorId"`
	ActorType      string `json:"actorType"`
	Note           string `json:"note"`
	CorrelationID  string `json:"-"`
	IdempotencyKey string `json:"-"`
}

type CodCustodyMutationResult struct {
	CodRecord           *CodRecord             `json:"codRecord"`
	CustodyEvidence     *CodCustodyEvidence    `json:"custodyEvidence"`
	ReconciliationCase *CodReconciliationCase `json:"reconciliationCase,omitempty"`
	Replayed            bool                   `json:"replayed"`
}

const codCustodyEvidenceCols = `id, cod_record_id, event_type, expected_amount_minor_units,
	actual_amount_minor_units, difference_minor_units, currency, proof_reference,
	actor_id, actor_type, note, correlation_id, idempotency_key,
	ledger_transaction_id, created_at`

const codReconciliationCols = `id, cod_record_id, custody_evidence_id,
	expected_amount_minor_units, actual_amount_minor_units, difference_minor_units,
	currency, trigger_reason, status, assigned_to_operator_id, assigned_at,
	investigation_note, resolved_by_operator_id, resolution_action,
	resolution_note, resolved_at, created_at, updated_at`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCodCustodyEvidence(row rowScanner) (*CodCustodyEvidence, error) {
	var evidence CodCustodyEvidence
	if err := row.Scan(
		&evidence.ID,
		&evidence.CodRecordID,
		&evidence.EventType,
		&evidence.ExpectedAmountMinorUnits,
		&evidence.ActualAmountMinorUnits,
		&evidence.DifferenceMinorUnits,
		&evidence.Currency,
		&evidence.ProofReference,
		&evidence.ActorID,
		&evidence.ActorType,
		&evidence.Note,
		&evidence.CorrelationID,
		&evidence.IdempotencyKey,
		&evidence.LedgerTransactionID,
		&evidence.CreatedAt,
	); err != nil {
		return nil, err
	}
	return &evidence, nil
}

func scanCodReconciliationCase(row rowScanner) (*CodReconciliationCase, error) {
	var result CodReconciliationCase
	var assignedTo, resolvedBy, resolutionAction sql.NullString
	var assignedAt, resolvedAt sql.NullTime
	if err := row.Scan(
		&result.ID,
		&result.CodRecordID,
		&result.CustodyEvidenceID,
		&result.ExpectedAmountMinorUnits,
		&result.ActualAmountMinorUnits,
		&result.DifferenceMinorUnits,
		&result.Currency,
		&result.TriggerReason,
		&result.Status,
		&assignedTo,
		&assignedAt,
		&result.InvestigationNote,
		&resolvedBy,
		&resolutionAction,
		&result.ResolutionNote,
		&resolvedAt,
		&result.CreatedAt,
		&result.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if assignedTo.Valid {
		result.AssignedToOperatorID = &assignedTo.String
	}
	if assignedAt.Valid {
		value := assignedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		result.AssignedAt = &value
	}
	if resolvedBy.Valid {
		result.ResolvedByOperatorID = &resolvedBy.String
	}
	if resolutionAction.Valid {
		result.ResolutionAction = &resolutionAction.String
	}
	if resolvedAt.Valid {
		value := resolvedAt.Time.Format("2006-01-02T15:04:05.999999999Z07:00")
		result.ResolvedAt = &value
	}
	return &result, nil
}

func normalizeCustodyInput(proofReference, actorID, actorType, correlationID, idempotencyKey string) (string, string, string, string, string, error) {
	proofReference = strings.TrimSpace(proofReference)
	actorID = strings.TrimSpace(actorID)
	actorType = strings.TrimSpace(actorType)
	correlationID = strings.TrimSpace(correlationID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if len(proofReference) < 3 {
		return "", "", "", "", "", fmt.Errorf("proofReference is required")
	}
	if actorID == "" || actorType == "" {
		return "", "", "", "", "", fmt.Errorf("actorId and actorType are required")
	}
	switch actorType {
	case "captain", "store_courier", "partner_store", "partner", "operator":
	default:
		return "", "", "", "", "", fmt.Errorf("unsupported actorType %q", actorType)
	}
	if len(correlationID) < 3 {
		return "", "", "", "", "", fmt.Errorf("X-Correlation-ID is required")
	}
	if len(idempotencyKey) < 3 {
		return "", "", "", "", "", fmt.Errorf("Idempotency-Key is required")
	}
	return proofReference, actorID, actorType, correlationID, idempotencyKey, nil
}

func actorMatchesCollector(record *CodRecord, actorID, actorType string) bool {
	collectorID := strings.TrimSpace(record.CollectorID)
	collectorType := strings.TrimSpace(record.CollectorType)
	if collectorID == "" {
		collectorID = strings.TrimSpace(record.CaptainID)
		collectorType = "captain"
	}
	return actorID == collectorID && actorType == collectorType
}

func actorMayRemit(record *CodRecord, actorID, actorType string) bool {
	if actorMatchesCollector(record, actorID, actorType) {
		return true
	}
	if actorType == "operator" {
		return true
	}
	return actorType == "partner" && actorID == record.PartnerID
}

func getCodRecordForUpdate(ctx context.Context, tx *sql.Tx, codRecordID string) (*CodRecord, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+codCols+` FROM wlt_cod_records WHERE id = $1 FOR UPDATE`, codRecordID)
	record, err := scanCodRecord(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return record, err
}

func getCustodyEvidenceTx(ctx context.Context, tx *sql.Tx, codRecordID, eventType string) (*CodCustodyEvidence, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+codCustodyEvidenceCols+`
		FROM wlt_cod_custody_evidence WHERE cod_record_id = $1 AND event_type = $2`, codRecordID, eventType)
	evidence, err := scanCodCustodyEvidence(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return evidence, err
}

func getCodReconciliationCaseTx(ctx context.Context, tx *sql.Tx, codRecordID string) (*CodReconciliationCase, error) {
	row := tx.QueryRowContext(ctx, `SELECT `+codReconciliationCols+`
		FROM wlt_cod_reconciliation_cases WHERE cod_record_id = $1`, codRecordID)
	result, err := scanCodReconciliationCase(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return result, err
}

func assertEvidenceReplay(evidence *CodCustodyEvidence, actualAmount int64, proofReference, actorID, actorType, idempotencyKey string) error {
	if evidence.ActualAmountMinorUnits != actualAmount ||
		evidence.ProofReference != proofReference ||
		evidence.ActorID != actorID ||
		evidence.ActorType != actorType ||
		evidence.IdempotencyKey != idempotencyKey {
		return ErrCodEvidenceConflict
	}
	return nil
}

// MarkCodCollectedSovereign records the actual cash accepted by the governed
// collector. State, immutable proof, the double-entry posting and any variance
// reconciliation case commit or roll back together.
func MarkCodCollectedSovereign(ctx context.Context, db *sql.DB, codRecordID string, input CollectCodInput) (*CodCustodyMutationResult, error) {
	if strings.TrimSpace(codRecordID) == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	if input.ActualAmountMinorUnits <= 0 {
		return nil, fmt.Errorf("actualAmountMinorUnits must be positive")
	}
	proofReference, actorID, actorType, correlationID, idempotencyKey, err := normalizeCustodyInput(
		input.ProofReference, input.ActorID, input.ActorType, input.CorrelationID, input.IdempotencyKey,
	)
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	record, err := getCodRecordForUpdate(ctx, tx, codRecordID)
	if err != nil || record == nil {
		return nil, err
	}
	if !actorMatchesCollector(record, actorID, actorType) {
		return nil, ErrCodActorMismatch
	}
	if record.AmountMinorUnits <= 0 || strings.TrimSpace(record.Currency) == "" {
		return nil, fmt.Errorf("COD record %s has invalid accounting amount/currency", record.ID)
	}

	if record.Status != "pending_collection" {
		existing, evidenceErr := getCustodyEvidenceTx(ctx, tx, record.ID, "collection")
		if evidenceErr != nil {
			return nil, evidenceErr
		}
		if existing == nil {
			return nil, ErrCodStateConflict
		}
		if err := assertEvidenceReplay(existing, input.ActualAmountMinorUnits, proofReference, actorID, actorType, idempotencyKey); err != nil {
			return nil, err
		}
		reconciliationCase, caseErr := getCodReconciliationCaseTx(ctx, tx, record.ID)
		if caseErr != nil {
			return nil, caseErr
		}
		return &CodCustodyMutationResult{CodRecord: record, CustodyEvidence: existing, ReconciliationCase: reconciliationCase, Replayed: true}, nil
	}

	lines := []ledger.LedgerLine{
		{AccountType: "cash_in_transit", DebitCredit: "debit", AmountMinorUnits: input.ActualAmountMinorUnits, Currency: record.Currency},
		{AccountType: "platform_payable", DebitCredit: "credit", AmountMinorUnits: input.ActualAmountMinorUnits, Currency: record.Currency},
	}
	ledgerTransactionID, err := ledger.PostLedgerTransaction(ctx, tx, "cod_collected", "cod_record", record.ID, lines, ledger.Actor{ID: actorID, Type: actorType})
	if err != nil {
		return nil, fmt.Errorf("post COD collection journal: %w", err)
	}

	difference := input.ActualAmountMinorUnits - record.AmountMinorUnits
	evidence, err := scanCodCustodyEvidence(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_cod_custody_evidence
			(cod_record_id, event_type, expected_amount_minor_units, actual_amount_minor_units,
			 difference_minor_units, currency, proof_reference, actor_id, actor_type,
			 note, correlation_id, idempotency_key, ledger_transaction_id)
		VALUES ($1, 'collection', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING `+codCustodyEvidenceCols,
		record.ID, record.AmountMinorUnits, input.ActualAmountMinorUnits, difference,
		record.Currency, proofReference, actorID, actorType, strings.TrimSpace(input.Note),
		correlationID, idempotencyKey, ledgerTransactionID,
	))
	if err != nil {
		return nil, fmt.Errorf("persist COD collection evidence: %w", err)
	}

	updated, err := scanCodRecord(tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_records
		SET status = 'collected', collected_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'pending_collection'
		RETURNING `+codCols, record.ID))
	if err != nil {
		return nil, fmt.Errorf("transition COD record to collected: %w", err)
	}

	var reconciliationCase *CodReconciliationCase
	if difference != 0 {
		reconciliationCase, err = scanCodReconciliationCase(tx.QueryRowContext(ctx, `
			INSERT INTO wlt_cod_reconciliation_cases
				(cod_record_id, custody_evidence_id, expected_amount_minor_units,
				 actual_amount_minor_units, difference_minor_units, currency)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING `+codReconciliationCols,
			updated.ID, evidence.ID, evidence.ExpectedAmountMinorUnits,
			evidence.ActualAmountMinorUnits, evidence.DifferenceMinorUnits, evidence.Currency,
		))
		if err != nil {
			return nil, fmt.Errorf("open COD reconciliation case: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &CodCustodyMutationResult{CodRecord: updated, CustodyEvidence: evidence, ReconciliationCase: reconciliationCase, Replayed: false}, nil
}

// MarkCodRemittedSovereign records transfer of the actually collected amount
// from cash-in-transit into provider clearing. The collection proof is the
// amount source; the caller cannot change it during remittance.
func MarkCodRemittedSovereign(ctx context.Context, db *sql.DB, codRecordID string, input RemitCodInput) (*CodCustodyMutationResult, error) {
	if strings.TrimSpace(codRecordID) == "" {
		return nil, fmt.Errorf("codRecordId is required")
	}
	proofReference, actorID, actorType, correlationID, idempotencyKey, err := normalizeCustodyInput(
		input.ProofReference, input.ActorID, input.ActorType, input.CorrelationID, input.IdempotencyKey,
	)
	if err != nil {
		return nil, err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	record, err := getCodRecordForUpdate(ctx, tx, codRecordID)
	if err != nil || record == nil {
		return nil, err
	}
	if !actorMayRemit(record, actorID, actorType) {
		return nil, ErrCodActorMismatch
	}
	collectionEvidence, err := getCustodyEvidenceTx(ctx, tx, record.ID, "collection")
	if err != nil {
		return nil, err
	}
	if collectionEvidence == nil || collectionEvidence.ActualAmountMinorUnits <= 0 {
		return nil, fmt.Errorf("collection evidence is required before remittance")
	}

	if record.Status != "collected" {
		existing, evidenceErr := getCustodyEvidenceTx(ctx, tx, record.ID, "remittance")
		if evidenceErr != nil {
			return nil, evidenceErr
		}
		if existing == nil {
			return nil, ErrCodStateConflict
		}
		if err := assertEvidenceReplay(existing, collectionEvidence.ActualAmountMinorUnits, proofReference, actorID, actorType, idempotencyKey); err != nil {
			return nil, err
		}
		reconciliationCase, caseErr := getCodReconciliationCaseTx(ctx, tx, record.ID)
		if caseErr != nil {
			return nil, caseErr
		}
		return &CodCustodyMutationResult{CodRecord: record, CustodyEvidence: existing, ReconciliationCase: reconciliationCase, Replayed: true}, nil
	}

	lines := []ledger.LedgerLine{
		{AccountType: "provider_clearing", DebitCredit: "debit", AmountMinorUnits: collectionEvidence.ActualAmountMinorUnits, Currency: record.Currency},
		{AccountType: "cash_in_transit", DebitCredit: "credit", AmountMinorUnits: collectionEvidence.ActualAmountMinorUnits, Currency: record.Currency},
	}
	ledgerTransactionID, err := ledger.PostLedgerTransaction(ctx, tx, "cod_remitted", "cod_record", record.ID, lines, ledger.Actor{ID: actorID, Type: actorType})
	if err != nil {
		return nil, fmt.Errorf("post COD remittance journal: %w", err)
	}

	evidence, err := scanCodCustodyEvidence(tx.QueryRowContext(ctx, `
		INSERT INTO wlt_cod_custody_evidence
			(cod_record_id, event_type, expected_amount_minor_units, actual_amount_minor_units,
			 difference_minor_units, currency, proof_reference, actor_id, actor_type,
			 note, correlation_id, idempotency_key, ledger_transaction_id)
		VALUES ($1, 'remittance', $2, $2, 0, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING `+codCustodyEvidenceCols,
		record.ID, collectionEvidence.ActualAmountMinorUnits, record.Currency,
		proofReference, actorID, actorType, strings.TrimSpace(input.Note),
		correlationID, idempotencyKey, ledgerTransactionID,
	))
	if err != nil {
		return nil, fmt.Errorf("persist COD remittance evidence: %w", err)
	}

	updated, err := scanCodRecord(tx.QueryRowContext(ctx, `
		UPDATE wlt_cod_records
		SET status = 'remitted', remitted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'collected'
		RETURNING `+codCols, record.ID))
	if err != nil {
		return nil, fmt.Errorf("transition COD record to remitted: %w", err)
	}
	reconciliationCase, err := getCodReconciliationCaseTx(ctx, tx, record.ID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &CodCustodyMutationResult{CodRecord: updated, CustodyEvidence: evidence, ReconciliationCase: reconciliationCase, Replayed: false}, nil
}

func ListCodReconciliationCases(db *sql.DB, status string) ([]*CodReconciliationCase, error) {
	status = strings.TrimSpace(status)
	query := `SELECT ` + codReconciliationCols + ` FROM wlt_cod_reconciliation_cases`
	args := []any{}
	if status != "" {
		switch status {
		case "open", "investigating", "resolved":
		default:
			return nil, fmt.Errorf("unsupported status %q", status)
		}
		query += ` WHERE status = $1`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC LIMIT 200`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]*CodReconciliationCase, 0)
	for rows.Next() {
		item, scanErr := scanCodReconciliationCase(rows)
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func AssignCodReconciliationCase(db *sql.DB, caseID, operatorID, investigationNote string) (*CodReconciliationCase, error) {
	caseID = strings.TrimSpace(caseID)
	operatorID = strings.TrimSpace(operatorID)
	investigationNote = strings.TrimSpace(investigationNote)
	if caseID == "" || operatorID == "" {
		return nil, fmt.Errorf("caseId and operatorId are required")
	}
	row := db.QueryRow(`
		UPDATE wlt_cod_reconciliation_cases
		SET status = 'investigating', assigned_to_operator_id = $2,
		    assigned_at = COALESCE(assigned_at, NOW()), investigation_note = $3,
		    updated_at = NOW()
		WHERE id = $1 AND status IN ('open', 'investigating')
		RETURNING `+codReconciliationCols, caseID, operatorID, investigationNote)
	result, err := scanCodReconciliationCase(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCodStateConflict
	}
	return result, err
}

func ResolveCodReconciliationCase(db *sql.DB, caseID, operatorID, action, note string) (*CodReconciliationCase, error) {
	caseID = strings.TrimSpace(caseID)
	operatorID = strings.TrimSpace(operatorID)
	action = strings.TrimSpace(action)
	note = strings.TrimSpace(note)
	if caseID == "" || operatorID == "" || note == "" {
		return nil, fmt.Errorf("caseId, operatorId and resolutionNote are required")
	}
	switch action {
	case "confirmed_variance", "cash_adjustment", "collector_recovery", "write_off":
	default:
		return nil, fmt.Errorf("unsupported resolutionAction %q", action)
	}
	row := db.QueryRow(`
		UPDATE wlt_cod_reconciliation_cases
		SET status = 'resolved', resolved_by_operator_id = $2,
		    resolution_action = $3, resolution_note = $4,
		    resolved_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND status = 'investigating'
		  AND assigned_to_operator_id = $2
		RETURNING `+codReconciliationCols, caseID, operatorID, action, note)
	result, err := scanCodReconciliationCase(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCodStateConflict
	}
	return result, err
}

func decodeStrictJSON(w http.ResponseWriter, r *http.Request, target any) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("request body is invalid: %w", err)
	}
	return nil
}

func HandleCollectCodSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input CollectCodInput
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		result, err := MarkCodCollectedSovereign(r.Context(), db, r.PathValue("codRecordId"), input)
		switch {
		case errors.Is(err, ErrCodActorMismatch):
			shared.SendError(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		case errors.Is(err, ErrCodStateConflict), errors.Is(err, ErrCodEvidenceConflict):
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		case result == nil || result.CodRecord == nil:
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD record not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, result)
	}
}

func HandleRemitCodSovereign(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input RemitCodInput
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		input.CorrelationID = r.Header.Get("X-Correlation-ID")
		input.IdempotencyKey = r.Header.Get("Idempotency-Key")
		result, err := MarkCodRemittedSovereign(r.Context(), db, r.PathValue("codRecordId"), input)
		switch {
		case errors.Is(err, ErrCodActorMismatch):
			shared.SendError(w, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		case errors.Is(err, ErrCodStateConflict), errors.Is(err, ErrCodEvidenceConflict):
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", err.Error())
			return
		case err != nil:
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		case result == nil || result.CodRecord == nil:
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "COD record not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, result)
	}
}

func HandleListCodReconciliationCases(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cases, err := ListCodReconciliationCases(db, r.URL.Query().Get("status"))
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReconciliationCases": cases})
	}
}

func HandleAssignCodReconciliationCase(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID       string `json:"operatorId"`
			InvestigationNote string `json:"investigationNote"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		result, err := AssignCodReconciliationCase(db, r.PathValue("caseId"), input.OperatorID, input.InvestigationNote)
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "COD reconciliation case is not assignable")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReconciliationCase": result})
	}
}

func HandleResolveCodReconciliationCase(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			OperatorID       string `json:"operatorId"`
			ResolutionAction string `json:"resolutionAction"`
			ResolutionNote   string `json:"resolutionNote"`
		}
		if err := decodeStrictJSON(w, r, &input); err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		result, err := ResolveCodReconciliationCase(db, r.PathValue("caseId"), input.OperatorID, input.ResolutionAction, input.ResolutionNote)
		if errors.Is(err, ErrCodStateConflict) {
			shared.SendError(w, http.StatusConflict, "INVALID_STATE", "case must be assigned to this operator before resolution")
			return
		}
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"codReconciliationCase": result})
	}
}
