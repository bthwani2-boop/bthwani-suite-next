package support

import (
	"database/sql"
	"errors"
	"strings"
	"time"
)

var ErrConflict = errors.New("support state conflict")

type ClientCreateTicketInput struct {
	ActorID        string
	StoreID        string
	OrderID        string
	Subject        string
	Description    string
	Category       TicketCategory
	Priority       TicketPriority
	IdempotencyKey string
	CorrelationID  string
}

type GovernedMessageInput struct {
	ActorID        string
	TicketID       string
	Body           string
	IsInternal     bool
	IdempotencyKey string
	CorrelationID  string
}

type OperatorTicketTransitionInput struct {
	ActorID        string
	TicketID       string
	ExpectedStatus TicketStatus
	Status         TicketStatus
	AssignedTo     string
	IdempotencyKey string
	CorrelationID  string
}

type TicketEvent struct {
	ID            string
	TicketID      string
	ReporterID    string
	ActorID       string
	ActorRole     string
	EventType     string
	CorrelationID string
	CreatedAt     time.Time
}

func normalizeMutationContext(idempotencyKey, correlationID string) (string, string, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if idempotencyKey == "" {
		return "", "", ErrInvalid
	}
	if correlationID == "" {
		correlationID = idempotencyKey
	}
	return idempotencyKey, correlationID, nil
}

func writeTicketEventTx(
	tx *sql.Tx,
	ticketID, reporterID, actorID, actorRole, eventType, correlationID string,
) error {
	_, err := tx.Exec(`
		INSERT INTO dsh_support_ticket_events (
			ticket_id, reporter_id, actor_id, actor_role, event_type, correlation_id
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (ticket_id, event_type, correlation_id) DO NOTHING`,
		ticketID, reporterID, actorID, actorRole, eventType, correlationID,
	)
	return err
}

func resolveClientTicketStoreTx(tx *sql.Tx, actorID, requestedStoreID, orderID string) (string, error) {
	storeID := strings.TrimSpace(requestedStoreID)
	orderID = strings.TrimSpace(orderID)
	if orderID != "" {
		var orderStoreID string
		err := tx.QueryRow(`
			SELECT store_id
			FROM dsh_orders
			WHERE id = $1 AND client_id = $2`, orderID, actorID).Scan(&orderStoreID)
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrForbidden
		}
		if err != nil {
			return "", err
		}
		if storeID != "" && storeID != orderStoreID {
			return "", ErrForbidden
		}
		return orderStoreID, nil
	}
	if storeID == "" {
		return "", nil
	}
	var exists bool
	if err := tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM dsh_stores WHERE id = $1)`, storeID).Scan(&exists); err != nil {
		return "", err
	}
	if !exists {
		return "", ErrNotFound
	}
	return storeID, nil
}

func CreateClientTicket(db *sql.DB, input ClientCreateTicketInput) (Ticket, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Description = strings.TrimSpace(input.Description)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || len(input.Subject) < 3 || len(input.Subject) > 160 ||
		len(input.Description) < 5 || len(input.Description) > 4000 ||
		!validTicketCategory(input.Category) || !validTicketPriority(input.Priority) {
		return Ticket{}, ErrInvalid
	}
	if input.Priority == "" {
		input.Priority = PriorityNormal
	}

	tx, err := db.Begin()
	if err != nil {
		return Ticket{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Ticket{}, err
	}

	existing, err := scanTicket(tx.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE reporter_id = $1 AND reporter_role = 'client' AND create_idempotency_key = $2`,
		input.ActorID, idempotencyKey,
	))
	if err == nil {
		if commitErr := tx.Commit(); commitErr != nil {
			return Ticket{}, commitErr
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, err
	}

	storeID, err := resolveClientTicketStoreTx(tx, input.ActorID, input.StoreID, input.OrderID)
	if err != nil {
		return Ticket{}, err
	}
	var nullableStoreID, nullableOrderID sql.NullString
	if storeID != "" {
		nullableStoreID = sql.NullString{String: storeID, Valid: true}
	}
	if strings.TrimSpace(input.OrderID) != "" {
		nullableOrderID = sql.NullString{String: strings.TrimSpace(input.OrderID), Valid: true}
	}
	created, err := scanTicket(tx.QueryRow(`
		INSERT INTO dsh_support_tickets (
			store_id, reporter_id, reporter_role, subject, description, category, priority,
			order_id, create_idempotency_key, correlation_id
		) VALUES ($1, $2, 'client', $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		          status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at`,
		nullableStoreID, input.ActorID, input.Subject, input.Description, input.Category,
		input.Priority, nullableOrderID, idempotencyKey, correlationID,
	))
	if err != nil {
		return Ticket{}, err
	}
	if err := writeTicketEventTx(tx, created.ID, input.ActorID, input.ActorID, "client", "created", correlationID); err != nil {
		return Ticket{}, err
	}
	if err := tx.Commit(); err != nil {
		return Ticket{}, err
	}
	return created, nil
}

func ListClientTickets(db *sql.DB, actorID string, limit int) ([]Ticket, error) {
	if strings.TrimSpace(actorID) == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE reporter_id = $1 AND reporter_role = 'client'
		ORDER BY created_at DESC LIMIT $2`, actorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTickets(rows)
}

func GetClientTicket(db *sql.DB, actorID, ticketID string) (Ticket, error) {
	ticket, err := scanTicket(db.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE id = $1 AND reporter_id = $2 AND reporter_role = 'client'`, ticketID, actorID))
	if errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	}
	return ticket, err
}

func addOwnedMessage(
	db *sql.DB,
	input GovernedMessageInput,
	ownerRole, senderRole string,
) (Message, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.Body = strings.TrimSpace(input.Body)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.TicketID == "" || input.Body == "" || len(input.Body) > 4000 {
		return Message{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return Message{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Message{}, err
	}
	var reporterID string
	if err = tx.QueryRow(`
		SELECT reporter_id FROM dsh_support_tickets
		WHERE id = $1 AND reporter_id = $2 AND reporter_role = $3
		FOR UPDATE`, input.TicketID, input.ActorID, ownerRole).Scan(&reporterID); errors.Is(err, sql.ErrNoRows) {
		return Message{}, ErrNotFound
	} else if err != nil {
		return Message{}, err
	}
	return insertGovernedMessageTx(tx, input, reporterID, senderRole, idempotencyKey, correlationID)
}

func insertGovernedMessageTx(
	tx *sql.Tx,
	input GovernedMessageInput,
	reporterID, senderRole, idempotencyKey, correlationID string,
) (Message, error) {
	var existing Message
	err := tx.QueryRow(`
		SELECT id, ticket_id, sender_id, sender_role, body, is_internal, created_at
		FROM dsh_support_messages
		WHERE ticket_id = $1 AND sender_id = $2 AND create_idempotency_key = $3`,
		input.TicketID, input.ActorID, idempotencyKey,
	).Scan(&existing.ID, &existing.TicketID, &existing.SenderID, &existing.SenderRole, &existing.Body, &existing.IsInternal, &existing.CreatedAt)
	if err == nil {
		if commitErr := tx.Commit(); commitErr != nil {
			return Message{}, commitErr
		}
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return Message{}, err
	}
	var message Message
	err = tx.QueryRow(`
		INSERT INTO dsh_support_messages (
			ticket_id, sender_id, sender_role, body, is_internal,
			create_idempotency_key, correlation_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, ticket_id, sender_id, sender_role, body, is_internal, created_at`,
		input.TicketID, input.ActorID, senderRole, input.Body, input.IsInternal, idempotencyKey, correlationID,
	).Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt)
	if err != nil {
		return Message{}, err
	}
	if err := writeTicketEventTx(tx, input.TicketID, reporterID, input.ActorID, senderRole, "message_added", correlationID); err != nil {
		return Message{}, err
	}
	if err := tx.Commit(); err != nil {
		return Message{}, err
	}
	return message, nil
}

func AddClientMessage(db *sql.DB, input GovernedMessageInput) (Message, error) {
	input.IsInternal = false
	return addOwnedMessage(db, input, "client", "client")
}

func listOwnedMessages(db *sql.DB, actorID, ticketID, ownerRole string) ([]Message, error) {
	rows, err := db.Query(`
		SELECT m.id, m.ticket_id, m.sender_id, m.sender_role, m.body, m.is_internal, m.created_at
		FROM dsh_support_messages m
		JOIN dsh_support_tickets t ON t.id = m.ticket_id
		WHERE t.id = $1 AND t.reporter_id = $2 AND t.reporter_role = $3 AND m.is_internal = FALSE
		ORDER BY m.created_at ASC`, ticketID, actorID, ownerRole)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	messages := []Message{}
	for rows.Next() {
		var message Message
		if err := rows.Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	return messages, rows.Err()
}

func ListClientMessages(db *sql.DB, actorID, ticketID string) ([]Message, error) {
	return listOwnedMessages(db, actorID, ticketID, "client")
}

func GetOperatorTicket(db *sql.DB, ticketID string) (Ticket, error) {
	return GetTicket(db, ticketID)
}

func ListOperatorMessages(db *sql.DB, ticketID string) ([]Message, error) {
	return ListTicketMessages(db, ticketID, true)
}

func AddOperatorMessage(db *sql.DB, input GovernedMessageInput) (Message, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.Body = strings.TrimSpace(input.Body)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.TicketID == "" || input.Body == "" || len(input.Body) > 4000 {
		return Message{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return Message{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Message{}, err
	}
	var reporterID string
	if err = tx.QueryRow(`SELECT reporter_id FROM dsh_support_tickets WHERE id = $1 FOR UPDATE`, input.TicketID).Scan(&reporterID); errors.Is(err, sql.ErrNoRows) {
		return Message{}, ErrNotFound
	} else if err != nil {
		return Message{}, err
	}
	return insertGovernedMessageTx(tx, input, reporterID, "operator", idempotencyKey, correlationID)
}

func validStatusTransition(from, to TicketStatus) bool {
	if from == to {
		return true
	}
	switch from {
	case StatusOpen:
		return to == StatusInReview || to == StatusPendingUser || to == StatusResolved || to == StatusClosed
	case StatusInReview:
		return to == StatusPendingUser || to == StatusResolved || to == StatusClosed
	case StatusPendingUser:
		return to == StatusInReview || to == StatusResolved || to == StatusClosed
	case StatusResolved:
		return to == StatusInReview || to == StatusClosed
	case StatusClosed:
		return false
	default:
		return false
	}
}

func UpdateOperatorTicketGoverned(db *sql.DB, input OperatorTicketTransitionInput) (Ticket, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.AssignedTo = strings.TrimSpace(input.AssignedTo)
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || input.TicketID == "" || input.Status == "" {
		return Ticket{}, ErrInvalid
	}
	tx, err := db.Begin()
	if err != nil {
		return Ticket{}, err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Ticket{}, err
	}
	var reporterID string
	var currentStatus TicketStatus
	var currentAssignee string
	if err = tx.QueryRow(`
		SELECT reporter_id, status, COALESCE(assigned_to,'')
		FROM dsh_support_tickets WHERE id = $1 FOR UPDATE`, input.TicketID,
	).Scan(&reporterID, &currentStatus, &currentAssignee); errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	} else if err != nil {
		return Ticket{}, err
	}
	if input.ExpectedStatus != "" && input.ExpectedStatus != currentStatus {
		return Ticket{}, ErrConflict
	}
	if !validStatusTransition(currentStatus, input.Status) {
		return Ticket{}, ErrConflict
	}
	assignee := input.AssignedTo
	if assignee == "" {
		assignee = currentAssignee
	}
	if assignee == "" {
		assignee = input.ActorID
	}
	if currentStatus != input.Status || currentAssignee != assignee {
		_, err = tx.Exec(`
			UPDATE dsh_support_tickets
			SET status = $2,
			    assigned_to = $3,
			    version = version + 1,
			    resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, NOW()) WHEN $2 <> 'closed' THEN NULL ELSE resolved_at END,
			    closed_at = CASE WHEN $2 = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
			    updated_at = NOW()
			WHERE id = $1`, input.TicketID, input.Status, assignee)
		if err != nil {
			return Ticket{}, err
		}
		eventType := "status_changed"
		if input.Status == StatusClosed {
			eventType = "closed"
		}
		if err := writeTicketEventTx(tx, input.TicketID, reporterID, input.ActorID, "operator", eventType, correlationID); err != nil {
			return Ticket{}, err
		}
	}
	updated, err := scanTicket(tx.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets WHERE id = $1`, input.TicketID))
	if err != nil {
		return Ticket{}, err
	}
	if err := tx.Commit(); err != nil {
		return Ticket{}, err
	}
	return updated, nil
}

func ListTicketEvents(db *sql.DB, ticketID string, limit int) ([]TicketEvent, error) {
	if strings.TrimSpace(ticketID) == "" {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	rows, err := db.Query(`
		SELECT id, ticket_id, reporter_id, actor_id, actor_role, event_type, correlation_id, created_at
		FROM dsh_support_ticket_events
		WHERE ticket_id = $1
		ORDER BY created_at ASC LIMIT $2`, ticketID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []TicketEvent{}
	for rows.Next() {
		var event TicketEvent
		if err := rows.Scan(
			&event.ID, &event.TicketID, &event.ReporterID, &event.ActorID,
			&event.ActorRole, &event.EventType, &event.CorrelationID, &event.CreatedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}
