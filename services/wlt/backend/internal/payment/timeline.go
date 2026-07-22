package payment

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"wlt-api/internal/shared"
)

type PaymentOperationReceiptView struct {
	ID                string     `json:"id"`
	Operation         string     `json:"operation"`
	State             string     `json:"state"`
	ResponseStatus    string     `json:"responseStatus"`
	ProviderReference string     `json:"providerReference,omitempty"`
	CorrelationID     string     `json:"correlationId,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	CompletedAt       *time.Time `json:"completedAt,omitempty"`
}

type PaymentProviderEventView struct {
	ProviderEventID   string     `json:"providerEventId"`
	EventType         string     `json:"eventType"`
	ProviderStatus    string     `json:"providerStatus"`
	ProviderReference string     `json:"providerReference,omitempty"`
	ProcessingState   string     `json:"processingState"`
	ProcessingResult  string     `json:"processingResult,omitempty"`
	SignatureTime     time.Time  `json:"signatureTime"`
	OccurredAt        *time.Time `json:"occurredAt,omitempty"`
	ReceivedAt        time.Time  `json:"receivedAt"`
	ProcessedAt       *time.Time `json:"processedAt,omitempty"`
}

type PaymentReconciliationView struct {
	ID                   string     `json:"id"`
	Operation            string     `json:"operation"`
	TriggerReason        string     `json:"triggerReason"`
	Status               string     `json:"status"`
	AssignedToOperatorID *string    `json:"assignedToOperatorId,omitempty"`
	Resolution           *string    `json:"resolution,omitempty"`
	ResolutionAction     *string    `json:"resolutionAction,omitempty"`
	ResolutionNote       *string    `json:"resolutionNote,omitempty"`
	ResolvedAt           *time.Time `json:"resolvedAt,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
}

type PaymentSessionTimeline struct {
	PaymentSession             *PaymentSession              `json:"paymentSession"`
	CaptureLedgerTransactionID string                       `json:"captureLedgerTransactionId,omitempty"`
	LastProviderEventID        string                       `json:"lastProviderEventId,omitempty"`
	LastProviderStatus         string                       `json:"lastProviderStatus,omitempty"`
	OperationReceipts          []PaymentOperationReceiptView `json:"operationReceipts"`
	ProviderEvents             []PaymentProviderEventView    `json:"providerEvents"`
	ReconciliationCases        []PaymentReconciliationView   `json:"reconciliationCases"`
}

func ReadPaymentSessionTimeline(db *sql.DB, tenantID, sessionID string) (*PaymentSessionTimeline, error) {
	var session PaymentSession
	var ledgerID, lastEventID, lastProviderStatus string
	err := db.QueryRow(`
		SELECT id, checkout_intent_id, special_request_id, tenant_id, client_id,
		       store_id, payment_method, status, provider_reference,
		       amount_minor_units, currency, captured_at, created_at, updated_at,
		       COALESCE(capture_ledger_transaction_id, ''),
		       COALESCE(last_provider_event_id, ''), last_provider_status
		FROM wlt_payment_sessions
		WHERE id = $1 AND tenant_id = $2`, sessionID, tenantID).Scan(
		&session.ID, &session.CheckoutIntentID, &session.SpecialRequestID,
		&session.TenantID, &session.ClientID, &session.StoreID,
		&session.PaymentMethod, &session.Status, &session.ProviderReference,
		&session.AmountMinorUnits, &session.Currency, &session.CapturedAt,
		&session.CreatedAt, &session.UpdatedAt,
		&ledgerID, &lastEventID, &lastProviderStatus,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	timeline := &PaymentSessionTimeline{
		PaymentSession:             &session,
		CaptureLedgerTransactionID: ledgerID,
		LastProviderEventID:        lastEventID,
		LastProviderStatus:         lastProviderStatus,
		OperationReceipts:          []PaymentOperationReceiptView{},
		ProviderEvents:             []PaymentProviderEventView{},
		ReconciliationCases:        []PaymentReconciliationView{},
	}

	receipts, err := db.Query(`
		SELECT id, operation, state, response_status, provider_reference,
		       correlation_id, created_at, updated_at, completed_at
		FROM wlt_payment_operation_receipts
		WHERE tenant_id = $1 AND payment_session_id = $2
		ORDER BY created_at DESC`, tenantID, sessionID)
	if err != nil {
		return nil, err
	}
	for receipts.Next() {
		var item PaymentOperationReceiptView
		if err := receipts.Scan(&item.ID, &item.Operation, &item.State, &item.ResponseStatus,
			&item.ProviderReference, &item.CorrelationID, &item.CreatedAt, &item.UpdatedAt,
			&item.CompletedAt); err != nil {
			receipts.Close()
			return nil, err
		}
		timeline.OperationReceipts = append(timeline.OperationReceipts, item)
	}
	if err := receipts.Err(); err != nil {
		receipts.Close()
		return nil, err
	}
	receipts.Close()

	events, err := db.Query(`
		SELECT provider_event_id, event_type, provider_status, provider_reference,
		       processing_state, processing_result, signature_timestamp,
		       occurred_at, received_at, processed_at
		FROM wlt_payment_provider_events
		WHERE tenant_id = $1 AND payment_session_id = $2
		ORDER BY received_at DESC`, tenantID, sessionID)
	if err != nil {
		return nil, err
	}
	for events.Next() {
		var item PaymentProviderEventView
		if err := events.Scan(&item.ProviderEventID, &item.EventType, &item.ProviderStatus,
			&item.ProviderReference, &item.ProcessingState, &item.ProcessingResult,
			&item.SignatureTime, &item.OccurredAt, &item.ReceivedAt, &item.ProcessedAt); err != nil {
			events.Close()
			return nil, err
		}
		timeline.ProviderEvents = append(timeline.ProviderEvents, item)
	}
	if err := events.Err(); err != nil {
		events.Close()
		return nil, err
	}
	events.Close()

	cases, err := db.Query(`
		SELECT id, operation, trigger_reason, status, assigned_to_operator_id,
		       resolution, resolution_action, resolution_note, resolved_at,
		       created_at, updated_at
		FROM wlt_reconciliation_cases
		WHERE payment_session_id = $1
		ORDER BY created_at DESC`, sessionID)
	if err != nil {
		return nil, err
	}
	for cases.Next() {
		var item PaymentReconciliationView
		if err := cases.Scan(&item.ID, &item.Operation, &item.TriggerReason, &item.Status,
			&item.AssignedToOperatorID, &item.Resolution, &item.ResolutionAction,
			&item.ResolutionNote, &item.ResolvedAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			cases.Close()
			return nil, err
		}
		timeline.ReconciliationCases = append(timeline.ReconciliationCases, item)
	}
	if err := cases.Err(); err != nil {
		cases.Close()
		return nil, err
	}
	cases.Close()
	return timeline, nil
}

func HandleGetPaymentSessionTimeline(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
		if tenantID == "" {
			shared.SendError(w, http.StatusBadRequest, "MISSING_TENANT_ID", "X-Tenant-ID is required")
			return
		}
		timeline, err := ReadPaymentSessionTimeline(db, tenantID, r.PathValue("paymentSessionId"))
		if err != nil {
			shared.SendError(w, http.StatusInternalServerError, "PAYMENT_TIMELINE_READ_FAILED", "failed to read payment session timeline")
			return
		}
		if timeline == nil {
			shared.SendError(w, http.StatusNotFound, "NOT_FOUND", "payment session not found")
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"paymentTimeline": timeline})
	}
}
