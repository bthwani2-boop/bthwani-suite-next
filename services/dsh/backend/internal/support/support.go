package support

import (
	"database/sql"
	"errors"
	"time"
)

var (
	ErrNotFound  = errors.New("support record not found")
	ErrInvalid   = errors.New("invalid support input")
	ErrForbidden = errors.New("support access forbidden")
)

type TicketStatus string
type TicketPriority string
type TicketCategory string
type ReporterRole string
type IncidentStatus string
type IncidentSeverity string
type IncidentScope string

const (
	StatusOpen        TicketStatus = "open"
	StatusInReview    TicketStatus = "in_review"
	StatusPendingUser TicketStatus = "pending_user"
	StatusResolved    TicketStatus = "resolved"
	StatusClosed      TicketStatus = "closed"

	PriorityLow    TicketPriority = "low"
	PriorityNormal TicketPriority = "normal"
	PriorityHigh   TicketPriority = "high"
	PriorityUrgent TicketPriority = "urgent"

	CategoryOrderIssue      TicketCategory = "order_issue"
	CategoryDeliveryIssue   TicketCategory = "delivery_issue"
	CategoryStoreQuality    TicketCategory = "store_quality"
	CategoryPaymentRef      TicketCategory = "payment_reference"
	CategoryAccountAccess   TicketCategory = "account_access"
	CategoryAppBug          TicketCategory = "app_bug"
	CategoryOther           TicketCategory = "other"

	RoleClient   ReporterRole = "client"
	RolePartner  ReporterRole = "partner"
	RoleCaptain  ReporterRole = "captain"
	RoleOperator ReporterRole = "operator"

	IncidentOpen       IncidentStatus = "open"
	IncidentMonitoring IncidentStatus = "monitoring"
	IncidentResolved   IncidentStatus = "resolved"

	SeverityLow      IncidentSeverity = "low"
	SeverityMedium   IncidentSeverity = "medium"
	SeverityHigh     IncidentSeverity = "high"
	SeverityCritical IncidentSeverity = "critical"

	ScopeDelivery IncidentScope = "delivery"
	ScopeStores   IncidentScope = "stores"
	ScopePayments IncidentScope = "payments"
	ScopePlatform IncidentScope = "platform"
	ScopeUnknown  IncidentScope = "unknown"
)

type Ticket struct {
	ID           string
	StoreID      string
	ReporterID   string
	ReporterRole ReporterRole
	Subject      string
	Description  string
	Category     TicketCategory
	Priority     TicketPriority
	Status       TicketStatus
	AssignedTo   string
	OrderID      string
	ResolvedAt   *time.Time
	ClosedAt     *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Message struct {
	ID         string
	TicketID   string
	SenderID   string
	SenderRole string
	Body       string
	IsInternal bool
	CreatedAt  time.Time
}

type Incident struct {
	ID            string
	Title         string
	Description   string
	Severity      IncidentSeverity
	Status        IncidentStatus
	AffectedScope IncidentScope
	RaisedBy      string
	ResolvedBy    string
	ResolvedAt    *time.Time
	PostmortemURL string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type CreateTicketInput struct {
	StoreID      string
	ReporterID   string
	ReporterRole ReporterRole
	Subject      string
	Description  string
	Category     TicketCategory
	Priority     TicketPriority
	OrderID      string
}

type UpdateTicketInput struct {
	Status     TicketStatus
	AssignedTo string
}

type AddMessageInput struct {
	SenderID   string
	SenderRole string
	Body       string
	IsInternal bool
}

type CreateIncidentInput struct {
	Title         string
	Description   string
	Severity      IncidentSeverity
	AffectedScope IncidentScope
	RaisedBy      string
}

type UpdateIncidentInput struct {
	Status        IncidentStatus
	ResolvedBy    string
	PostmortemURL string
}

func CreateTicket(db *sql.DB, input CreateTicketInput) (Ticket, error) {
	if input.ReporterID == "" || input.Subject == "" || input.Description == "" {
		return Ticket{}, ErrInvalid
	}
	priority := input.Priority
	if priority == "" {
		priority = PriorityNormal
	}
	var storeID, orderID sql.NullString
	if input.StoreID != "" {
		storeID = sql.NullString{String: input.StoreID, Valid: true}
	}
	if input.OrderID != "" {
		orderID = sql.NullString{String: input.OrderID, Valid: true}
	}
	row := db.QueryRow(`
		INSERT INTO dsh_support_tickets (store_id, reporter_id, reporter_role, subject, description, category, priority, order_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		          status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at`,
		storeID, input.ReporterID, input.ReporterRole, input.Subject, input.Description,
		input.Category, priority, orderID,
	)
	return scanTicket(row)
}

func GetTicket(db *sql.DB, ticketID string) (Ticket, error) {
	row := db.QueryRow(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets WHERE id = $1`, ticketID)
	t, err := scanTicket(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	}
	return t, err
}

func ListReporterTickets(db *sql.DB, reporterID string, limit int) ([]Ticket, error) {
	rows, err := db.Query(`
		SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		       status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
		FROM dsh_support_tickets WHERE reporter_id = $1
		ORDER BY created_at DESC LIMIT $2`, reporterID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTickets(rows)
}

func ListOperatorTickets(db *sql.DB, statusFilter string, limit int) ([]Ticket, error) {
	q := `SELECT id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
	             status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at
	      FROM dsh_support_tickets`
	var args []any
	if statusFilter != "" {
		q += " WHERE status = $1 ORDER BY created_at DESC LIMIT $2"
		args = append(args, statusFilter, limit)
	} else {
		q += " ORDER BY created_at DESC LIMIT $1"
		args = append(args, limit)
	}
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTickets(rows)
}

func UpdateTicket(db *sql.DB, ticketID string, input UpdateTicketInput) (Ticket, error) {
	row := db.QueryRow(`
		UPDATE dsh_support_tickets
		SET status = $2, assigned_to = $3,
		    resolved_at = CASE WHEN $2 = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
		    closed_at = CASE WHEN $2 = 'closed' AND closed_at IS NULL THEN NOW() ELSE closed_at END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, COALESCE(store_id::text,''), reporter_id, reporter_role, subject, description, category, priority,
		          status, COALESCE(assigned_to,''), COALESCE(order_id::text,''), resolved_at, closed_at, created_at, updated_at`,
		ticketID, input.Status, input.AssignedTo,
	)
	t, err := scanTicket(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Ticket{}, ErrNotFound
	}
	return t, err
}

func AddMessage(db *sql.DB, ticketID string, input AddMessageInput) (Message, error) {
	if input.SenderID == "" || input.Body == "" {
		return Message{}, ErrInvalid
	}
	row := db.QueryRow(`
		INSERT INTO dsh_support_messages (ticket_id, sender_id, sender_role, body, is_internal)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, ticket_id, sender_id, sender_role, body, is_internal, created_at`,
		ticketID, input.SenderID, input.SenderRole, input.Body, input.IsInternal,
	)
	var m Message
	err := row.Scan(&m.ID, &m.TicketID, &m.SenderID, &m.SenderRole, &m.Body, &m.IsInternal, &m.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Message{}, ErrNotFound
	}
	return m, err
}

func ListTicketMessages(db *sql.DB, ticketID string, includeInternal bool) ([]Message, error) {
	q := `SELECT id, ticket_id, sender_id, sender_role, body, is_internal, created_at
	      FROM dsh_support_messages WHERE ticket_id = $1`
	if !includeInternal {
		q += " AND is_internal = FALSE"
	}
	q += " ORDER BY created_at ASC"
	rows, err := db.Query(q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.TicketID, &m.SenderID, &m.SenderRole, &m.Body, &m.IsInternal, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func CreateIncident(db *sql.DB, input CreateIncidentInput) (Incident, error) {
	if input.Title == "" || input.RaisedBy == "" {
		return Incident{}, ErrInvalid
	}
	scope := input.AffectedScope
	if scope == "" {
		scope = ScopeUnknown
	}
	row := db.QueryRow(`
		INSERT INTO dsh_incidents (title, description, severity, affected_scope, raised_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, title, description, severity, status, affected_scope, raised_by,
		          COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at`,
		input.Title, input.Description, input.Severity, scope, input.RaisedBy,
	)
	return scanIncident(row)
}

func ListIncidents(db *sql.DB, statusFilter string, limit int) ([]Incident, error) {
	q := `SELECT id, title, description, severity, status, affected_scope, raised_by,
	             COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at
	      FROM dsh_incidents`
	var args []any
	if statusFilter != "" {
		q += " WHERE status = $1 ORDER BY created_at DESC LIMIT $2"
		args = append(args, statusFilter, limit)
	} else {
		q += " ORDER BY created_at DESC LIMIT $1"
		args = append(args, limit)
	}
	rows, err := db.Query(q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Incident
	for rows.Next() {
		i, err := scanIncidentRow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, i)
	}
	return list, rows.Err()
}

func UpdateIncident(db *sql.DB, incidentID string, input UpdateIncidentInput) (Incident, error) {
	row := db.QueryRow(`
		UPDATE dsh_incidents
		SET status = $2, resolved_by = $3, postmortem_url = $4,
		    resolved_at = CASE WHEN $2 = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, description, severity, status, affected_scope, raised_by,
		          COALESCE(resolved_by,''), resolved_at, COALESCE(postmortem_url,''), created_at, updated_at`,
		incidentID, input.Status, input.ResolvedBy, input.PostmortemURL,
	)
	i, err := scanIncident(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Incident{}, ErrNotFound
	}
	return i, err
}

type ticketScanner interface {
	Scan(dest ...any) error
}

func scanTicket(s ticketScanner) (Ticket, error) {
	var t Ticket
	err := s.Scan(
		&t.ID, &t.StoreID, &t.ReporterID, &t.ReporterRole, &t.Subject, &t.Description,
		&t.Category, &t.Priority, &t.Status, &t.AssignedTo, &t.OrderID,
		&t.ResolvedAt, &t.ClosedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	return t, err
}

func scanTickets(rows *sql.Rows) ([]Ticket, error) {
	var list []Ticket
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID, &t.StoreID, &t.ReporterID, &t.ReporterRole, &t.Subject, &t.Description,
			&t.Category, &t.Priority, &t.Status, &t.AssignedTo, &t.OrderID,
			&t.ResolvedAt, &t.ClosedAt, &t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func scanIncident(s ticketScanner) (Incident, error) {
	var i Incident
	err := s.Scan(
		&i.ID, &i.Title, &i.Description, &i.Severity, &i.Status, &i.AffectedScope,
		&i.RaisedBy, &i.ResolvedBy, &i.ResolvedAt, &i.PostmortemURL, &i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}

func scanIncidentRow(rows *sql.Rows) (Incident, error) {
	var i Incident
	err := rows.Scan(
		&i.ID, &i.Title, &i.Description, &i.Severity, &i.Status, &i.AffectedScope,
		&i.RaisedBy, &i.ResolvedBy, &i.ResolvedAt, &i.PostmortemURL, &i.CreatedAt, &i.UpdatedAt,
	)
	return i, err
}
