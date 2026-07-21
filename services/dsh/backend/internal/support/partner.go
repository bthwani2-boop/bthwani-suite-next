package support

import (
	"database/sql"
	"errors"
	"strings"
)

const maxPartnerSupportMessageLength = 4000

type PartnerCreateTicketInput struct {
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

type PartnerAddMessageInput struct {
	ActorID        string
	TicketID       string
	Body           string
	IdempotencyKey string
	CorrelationID  string
}

func validTicketCategory(value TicketCategory) bool {
	switch value {
	case CategoryOrderIssue, CategoryDeliveryIssue, CategoryStoreQuality,
		CategoryPaymentRef, CategoryAccountAccess, CategoryAppBug, CategoryOther:
		return true
	default:
		return false
	}
}

func validTicketPriority(value TicketPriority) bool {
	switch value {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	default:
		return false
	}
}

func partnerOwnsStoreTx(tx *sql.Tx, actorID, storeID string) (bool, error) {
	if strings.TrimSpace(storeID) == "" {
		return true, nil
	}
	var allowed bool
	err := tx.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM dsh_store_actor_scopes
			WHERE actor_id = $1
			  AND actor_role = 'partner'
			  AND store_id = $2
			  AND active = TRUE
		)`, actorID, storeID).Scan(&allowed)
	return allowed, err
}

func resolvePartnerTicketStoreTx(tx *sql.Tx, actorID, requestedStoreID, orderID string) (string, error) {
	storeID := strings.TrimSpace(requestedStoreID)
	orderID = strings.TrimSpace(orderID)
	if orderID != "" {
		var orderStoreID string
		err := tx.QueryRow(`SELECT store_id FROM dsh_orders WHERE id = $1`, orderID).Scan(&orderStoreID)
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrNotFound
		}
		if err != nil {
			return "", err
		}
		if storeID != "" && storeID != orderStoreID {
			return "", ErrForbidden
		}
		storeID = orderStoreID
	}
	allowed, err := partnerOwnsStoreTx(tx, actorID, storeID)
	if err != nil {
		return "", err
	}
	if !allowed {
		return "", ErrForbidden
	}
	return storeID, nil
}

func writePartnerTicketEventTx(
	tx *sql.Tx,
	ticketID, reporterID, actorID, eventType, correlationID string,
) error {
	_, err := tx.Exec(`
		INSERT INTO dsh_support_ticket_events (
			ticket_id, reporter_id, actor_id, actor_role, event_type, correlation_id
		) VALUES ($1, $2, $3, 'partner', $4, $5)`,
		ticketID, reporterID, actorID, eventType, correlationID,
	)
	return err
}

func CreatePartnerTicket(db *sql.DB, input PartnerCreateTicketInput) (Ticket, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Description = strings.TrimSpace(input.Description)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.CorrelationID == "" {
		input.CorrelationID = input.IdempotencyKey
	}
	if input.Priority == "" {
		input.Priority = PriorityNormal
	}
	if input.ActorID == "" || input.IdempotencyKey == "" || input.CorrelationID == "" ||
		len(input.Subject) < 3 || len(input.Subject) > 160 ||
		len(input.Description) < 5 || len(input.Description) > 4000 ||
		!validTicketCategory(input.Category) || !validTicketPriority(input.Priority) {
		return Ticket{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return Ticket{}, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, input.IdempotencyKey); err != nil {
		return Ticket{}, err
	}

	row := tx.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE reporter_id = $1 AND reporter_role = 'partner' AND create_idempotency_key = $2`,
		input.ActorID, input.IdempotencyKey,
	)
	if existing, scanErr := scanTicket(row); scanErr == nil {
		if err := tx.Commit(); err != nil {
			return Ticket{}, err
		}
		return existing, nil
	} else if !errors.Is(scanErr, sql.ErrNoRows) {
		return Ticket{}, scanErr
	}

	storeID, err := resolvePartnerTicketStoreTx(tx, input.ActorID, input.StoreID, input.OrderID)
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
		) VALUES ($1, $2, 'partner', $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		          status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at`,
		nullableStoreID, input.ActorID, input.Subject, input.Description, input.Category,
		input.Priority, nullableOrderID, input.IdempotencyKey, input.CorrelationID,
	))
	if err != nil {
		return Ticket{}, err
	}
	if err := writePartnerTicketEventTx(tx, created.ID, input.ActorID, input.ActorID, "created", input.CorrelationID); err != nil {
		return Ticket{}, err
	}
	if err := tx.Commit(); err != nil {
		return Ticket{}, err
	}
	return created, nil
}

func ListPartnerTickets(db *sql.DB, actorID string, limit int) ([]Ticket, error) {
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
		WHERE reporter_id = $1 AND reporter_role = 'partner'
		ORDER BY created_at DESC
		LIMIT $2`, actorID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTickets(rows)
}

func GetPartnerTicket(db *sql.DB, actorID, ticketID string) (Ticket, error) {
	ticket, err := scanTicket(db.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE id = $1 AND reporter_id = $2 AND reporter_role = 'partner'`, ticketID, actorID))
	if errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	}
	return ticket, err
}

func AddPartnerMessage(db *sql.DB, input PartnerAddMessageInput) (Message, error) {
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.TicketID = strings.TrimSpace(input.TicketID)
	input.Body = strings.TrimSpace(input.Body)
	input.IdempotencyKey = strings.TrimSpace(input.IdempotencyKey)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	if input.CorrelationID == "" {
		input.CorrelationID = input.IdempotencyKey
	}
	if input.ActorID == "" || input.TicketID == "" || input.IdempotencyKey == "" ||
		input.CorrelationID == "" || input.Body == "" || len(input.Body) > maxPartnerSupportMessageLength {
		return Message{}, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return Message{}, err
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, input.IdempotencyKey); err != nil {
		return Message{}, err
	}
	var reporterID string
	if err = tx.QueryRow(`
		SELECT reporter_id
		FROM dsh_support_tickets
		WHERE id = $1 AND reporter_id = $2 AND reporter_role = 'partner'
		FOR UPDATE`, input.TicketID, input.ActorID).Scan(&reporterID); errors.Is(err, sql.ErrNoRows) {
		return Message{}, ErrNotFound
	} else if err != nil {
		return Message{}, err
	}

	var existing Message
	err = tx.QueryRow(`
		SELECT id, ticket_id, sender_id, sender_role, body, is_internal, created_at
		FROM dsh_support_messages
		WHERE ticket_id = $1 AND sender_id = $2 AND create_idempotency_key = $3`,
		input.TicketID, input.ActorID, input.IdempotencyKey,
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
		) VALUES ($1, $2, 'partner', $3, FALSE, $4, $5)
		RETURNING id, ticket_id, sender_id, sender_role, body, is_internal, created_at`,
		input.TicketID, input.ActorID, input.Body, input.IdempotencyKey, input.CorrelationID,
	).Scan(&message.ID, &message.TicketID, &message.SenderID, &message.SenderRole, &message.Body, &message.IsInternal, &message.CreatedAt)
	if err != nil {
		return Message{}, err
	}
	if err := writePartnerTicketEventTx(tx, input.TicketID, reporterID, input.ActorID, "message_added", input.CorrelationID); err != nil {
		return Message{}, err
	}
	if err := tx.Commit(); err != nil {
		return Message{}, err
	}
	return message, nil
}

func ListPartnerMessages(db *sql.DB, actorID, ticketID string) ([]Message, error) {
	rows, err := db.Query(`
		SELECT m.id, m.ticket_id, m.sender_id, m.sender_role, m.body, m.is_internal, m.created_at
		FROM dsh_support_messages m
		JOIN dsh_support_tickets t ON t.id = m.ticket_id
		WHERE t.id = $1
		  AND t.reporter_id = $2
		  AND t.reporter_role = 'partner'
		  AND m.is_internal = FALSE
		ORDER BY m.created_at ASC`, ticketID, actorID)
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
