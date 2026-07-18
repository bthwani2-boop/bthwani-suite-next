package support

import (
	"database/sql"
	"errors"
	"strings"
)

type ActorCreateTicketInput struct {
	ActorID        string
	ActorRole      ReporterRole
	StoreID        string
	OrderID        string
	Subject        string
	Description    string
	Category       TicketCategory
	Priority       TicketPriority
	IdempotencyKey string
	CorrelationID  string
}

func validReporterRole(role ReporterRole) bool {
	switch role {
	case RoleClient, RolePartner, RoleCaptain, RoleOperator:
		return true
	default:
		return false
	}
}

func resolveActorTicketStoreTx(
	tx *sql.Tx,
	actorID string,
	role ReporterRole,
	requestedStoreID string,
	orderID string,
) (string, error) {
	requestedStoreID = strings.TrimSpace(requestedStoreID)
	orderID = strings.TrimSpace(orderID)
	switch role {
	case RoleClient:
		return resolveClientTicketStoreTx(tx, actorID, requestedStoreID, orderID)
	case RolePartner:
		return resolvePartnerTicketStoreTx(tx, actorID, requestedStoreID, orderID)
	case RoleCaptain:
		if orderID == "" {
			if requestedStoreID != "" {
				return "", ErrForbidden
			}
			return "", nil
		}
		var storeID string
		err := tx.QueryRow(`
			SELECT o.store_id
			FROM dsh_orders o
			JOIN dsh_assignments a ON a.order_id = o.id
			WHERE o.id = $1
			  AND a.captain_id = $2
			  AND a.status IN ('offered', 'accepted', 'completed')
			ORDER BY a.created_at DESC
			LIMIT 1`, orderID, actorID).Scan(&storeID)
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrForbidden
		}
		if err != nil {
			return "", err
		}
		if requestedStoreID != "" && requestedStoreID != storeID {
			return "", ErrForbidden
		}
		return storeID, nil
	case RoleOperator:
		if orderID != "" {
			var storeID string
			err := tx.QueryRow(`SELECT store_id FROM dsh_orders WHERE id = $1`, orderID).Scan(&storeID)
			if errors.Is(err, sql.ErrNoRows) {
				return "", ErrNotFound
			}
			if err != nil {
				return "", err
			}
			if requestedStoreID != "" && requestedStoreID != storeID {
				return "", ErrConflict
			}
			return storeID, nil
		}
		if requestedStoreID == "" {
			return "", nil
		}
		var exists bool
		if err := tx.QueryRow(`SELECT EXISTS (SELECT 1 FROM dsh_stores WHERE id = $1)`, requestedStoreID).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return "", ErrNotFound
		}
		return requestedStoreID, nil
	default:
		return "", ErrForbidden
	}
}

func CreateActorTicket(db *sql.DB, input ActorCreateTicketInput) (Ticket, error) {
	if input.ActorRole == RoleClient {
		return CreateClientTicket(db, ClientCreateTicketInput{
			ActorID: input.ActorID, StoreID: input.StoreID, OrderID: input.OrderID,
			Subject: input.Subject, Description: input.Description, Category: input.Category,
			Priority: input.Priority, IdempotencyKey: input.IdempotencyKey, CorrelationID: input.CorrelationID,
		})
	}
	if input.ActorRole == RolePartner {
		return CreatePartnerTicket(db, PartnerCreateTicketInput{
			ActorID: input.ActorID, StoreID: input.StoreID, OrderID: input.OrderID,
			Subject: input.Subject, Description: input.Description, Category: input.Category,
			Priority: input.Priority, IdempotencyKey: input.IdempotencyKey, CorrelationID: input.CorrelationID,
		})
	}

	input.ActorID = strings.TrimSpace(input.ActorID)
	input.Subject = strings.TrimSpace(input.Subject)
	input.Description = strings.TrimSpace(input.Description)
	if input.Priority == "" {
		input.Priority = PriorityNormal
	}
	idempotencyKey, correlationID, err := normalizeMutationContext(input.IdempotencyKey, input.CorrelationID)
	if err != nil || input.ActorID == "" || !validReporterRole(input.ActorRole) ||
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
	if _, err = tx.Exec(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, input.ActorID, idempotencyKey); err != nil {
		return Ticket{}, err
	}

	existing, err := scanTicket(tx.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE reporter_id = $1 AND reporter_role = $2 AND create_idempotency_key = $3`,
		input.ActorID, input.ActorRole, idempotencyKey,
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

	storeID, err := resolveActorTicketStoreTx(tx, input.ActorID, input.ActorRole, input.StoreID, input.OrderID)
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
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		          status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at`,
		nullableStoreID, input.ActorID, input.ActorRole, input.Subject, input.Description,
		input.Category, input.Priority, nullableOrderID, idempotencyKey, correlationID,
	))
	if err != nil {
		return Ticket{}, err
	}
	if err := writeTicketEventTx(tx, created.ID, input.ActorID, input.ActorID, string(input.ActorRole), "created", correlationID); err != nil {
		return Ticket{}, err
	}
	if err := tx.Commit(); err != nil {
		return Ticket{}, err
	}
	return created, nil
}

func ListActorTickets(db *sql.DB, actorID string, role ReporterRole, limit int) ([]Ticket, error) {
	if strings.TrimSpace(actorID) == "" || !validReporterRole(role) {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := db.Query(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE reporter_id = $1 AND reporter_role = $2
		ORDER BY created_at DESC LIMIT $3`, actorID, role, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTickets(rows)
}

func GetActorTicket(db *sql.DB, actorID string, role ReporterRole, ticketID string) (Ticket, error) {
	ticket, err := scanTicket(db.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets
		WHERE id = $1 AND reporter_id = $2 AND reporter_role = $3`, ticketID, actorID, role))
	if errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	}
	return ticket, err
}

func AddActorMessage(db *sql.DB, actorID string, role ReporterRole, input GovernedMessageInput) (Message, error) {
	if role == RoleClient {
		input.ActorID = actorID
		return AddClientMessage(db, input)
	}
	if role == RolePartner {
		input.ActorID = actorID
		return AddPartnerMessage(db, PartnerAddMessageInput{
			ActorID: actorID, TicketID: input.TicketID, Body: input.Body,
			IdempotencyKey: input.IdempotencyKey, CorrelationID: input.CorrelationID,
		})
	}
	if !validReporterRole(role) || strings.TrimSpace(actorID) == "" {
		return Message{}, ErrInvalid
	}
	input.ActorID = actorID
	input.IsInternal = false
	return addOwnedMessage(db, input, string(role), string(role))
}

func ListActorMessages(db *sql.DB, actorID string, role ReporterRole, ticketID string) ([]Message, error) {
	if role == RoleClient {
		return ListClientMessages(db, actorID, ticketID)
	}
	if role == RolePartner {
		return ListPartnerMessages(db, actorID, ticketID)
	}
	if !validReporterRole(role) || strings.TrimSpace(actorID) == "" {
		return nil, ErrInvalid
	}
	return listOwnedMessages(db, actorID, ticketID, string(role))
}
