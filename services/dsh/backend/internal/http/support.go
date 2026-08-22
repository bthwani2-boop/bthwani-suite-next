package http

import (
	"net/http"

	"strings"

	"dsh-api/internal/store"
	"dsh-api/internal/support"
)

// Support permission actions on the control-panel surface. "operator"
// remains a valid fallback role during RBAC data migration.
const (
	SupportPermissionRead   = "support.read"
	SupportPermissionManage = "support.manage"
)

func partnerSupportMutationHeaders(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if idempotencyKey == "" {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key is required")
		return "", "", false
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		correlationID = idempotencyKey
	}
	return idempotencyKey, correlationID, true
}

func marshalTicket(t support.Ticket) map[string]any {
	m := map[string]any{
		"id":           t.ID,
		"storeId":      t.StoreID,
		"reporterId":   t.ReporterID,
		"reporterRole": t.ReporterRole,
		"subject":      t.Subject,
		"description":  t.Description,
		"category":     t.Category,
		"priority":     t.Priority,
		"status":       t.Status,
		"assignedTo":   t.AssignedTo,
		"orderId":      t.OrderID,
		"version":      t.Version,
		"claimedBy":    t.ClaimedBy,
		"escalationReason": t.EscalationReason,
		"createdAt":    t.CreatedAt,
		"updatedAt":    t.UpdatedAt,
	}
	if t.ResolvedAt != nil {
		m["resolvedAt"] = t.ResolvedAt
	}
	if t.ClosedAt != nil {
		m["closedAt"] = t.ClosedAt
	}
	if t.ClaimedAt != nil {
		m["claimedAt"] = t.ClaimedAt
	}
	if t.SlaBreachAt != nil {
		m["slaBreachAt"] = t.SlaBreachAt
	}
	if t.EscalatedAt != nil {
		m["escalatedAt"] = t.EscalatedAt
	}
	return m
}

func marshalMessage(m support.Message) map[string]any {
	return map[string]any{
		"id":              m.ID,
		"ticketId":        m.TicketID,
		"senderId":        m.SenderID,
		"senderRole":      m.SenderRole,
		"body":            m.Body,
		"isInternal":      m.IsInternal,
		"clientMessageId": m.ClientMessageID,
		"sequenceNum":     m.SequenceNum,
		"createdAt":       m.CreatedAt,
	}
}

func marshalIncident(i support.Incident) map[string]any {
	m := map[string]any{
		"id":            i.ID,
		"title":         i.Title,
		"description":   i.Description,
		"severity":      i.Severity,
		"status":        i.Status,
		"affectedScope": i.AffectedScope,
		"raisedBy":      i.RaisedBy,
		"postmortemUrl": i.PostmortemURL,
		"createdAt":     i.CreatedAt,
		"updatedAt":     i.UpdatedAt,
	}
	if i.ResolvedBy != "" {
		m["resolvedBy"] = i.ResolvedBy
	}
	if i.ResolvedAt != nil {
		m["resolvedAt"] = i.ResolvedAt
	}
	return m
}
