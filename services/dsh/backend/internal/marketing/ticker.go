package marketing

import (
	"database/sql"
	"encoding/json"
	"errors"
)

// ErrInvalidTransition rejects ticker status moves that leave the governed
// lifecycle: draft -> published|paused, published <-> paused. Once a ticker
// has left draft it can never return to draft.
var ErrInvalidTransition = errors.New("invalid status transition")

// ── Tickers ──────────────────────────────────────────────────────────────────

type Ticker struct {
	ID               string  `json:"id"`
	Message          string  `json:"message"`
	Kind             string  `json:"kind"`
	Status           string  `json:"status"`
	Source           string  `json:"source"`
	Audience         string  `json:"audience"`
	DeliveryMode     string  `json:"deliveryMode"`
	Priority         string  `json:"priority"`
	Pinned           bool    `json:"pinned"`
	ActionType       string  `json:"actionType"`
	ActionTarget     string  `json:"actionTarget"`
	Clicks           int     `json:"clicks"`
	Impressions      int     `json:"impressions"`
	OpenHour         *int    `json:"openHour,omitempty"`
	CloseHour        *int    `json:"closeHour,omitempty"`
	CooldownMinutes  *int    `json:"cooldownMinutes,omitempty"`
	RepeatGapMinutes *int    `json:"repeatGapMinutes,omitempty"`
	CreatedBy        string  `json:"createdBy"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

func tickerJSON(t Ticker) []byte {
	b, _ := json.Marshal(t)
	return b
}

var tickerKinds = map[string]bool{"alert": true, "news": true, "promo": true}
var tickerStatuses = map[string]bool{"draft": true, "published": true, "paused": true}
var tickerSources = map[string]bool{"system": true, "ops": true, "partner": true}
var tickerAudiences = map[string]bool{"all": true, "client": true, "partner": true, "captain": true}
var tickerDeliveryModes = map[string]bool{"scroll": true, "toast": true, "overlay": true}
var tickerPriorities = map[string]bool{"low": true, "normal": true, "high": true, "critical": true}

func validHour(h *int) bool      { return h == nil || (*h >= 0 && *h <= 23) }
func validNonNegative(m *int) bool { return m == nil || *m >= 0 }

var tickerSelectCols = `id, message, kind, status, source, audience, delivery_mode, priority,
	       pinned, COALESCE(action_type,''), COALESCE(action_target,''), clicks, impressions,
	       open_hour, close_hour, cooldown_minutes, repeat_gap_minutes,
	       COALESCE(created_by,''), created_at::TEXT, updated_at::TEXT`

func scanTicker(row interface{ Scan(dest ...any) error }) (Ticker, error) {
	var t Ticker
	err := row.Scan(&t.ID, &t.Message, &t.Kind, &t.Status, &t.Source, &t.Audience,
		&t.DeliveryMode, &t.Priority, &t.Pinned, &t.ActionType, &t.ActionTarget,
		&t.Clicks, &t.Impressions, &t.OpenHour, &t.CloseHour,
		&t.CooldownMinutes, &t.RepeatGapMinutes, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt)
	return t, err
}

func ListTickers(db *sql.DB) ([]Ticker, error) {
	rows, err := db.Query(`
		SELECT ` + tickerSelectCols + `
		FROM dsh_marketing_tickers
		WHERE deleted_at IS NULL
		ORDER BY pinned DESC, created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tickers := []Ticker{}
	for rows.Next() {
		t, err := scanTicker(rows)
		if err != nil {
			return nil, err
		}
		tickers = append(tickers, t)
	}
	return tickers, rows.Err()
}

type CreateTickerInput struct {
	Message          string
	Kind             string
	Status           string
	Source           string
	Audience         string
	DeliveryMode     string
	Priority         string
	Pinned           bool
	ActionType       string
	ActionTarget     string
	OpenHour         *int
	CloseHour        *int
	CooldownMinutes  *int
	RepeatGapMinutes *int
	CreatedBy        string
	CorrelationID    string
}

func CreateTicker(db *sql.DB, in CreateTickerInput) (Ticker, error) {
	if in.Message == "" {
		return Ticker{}, ErrInvalid
	}
	if in.Kind == "" {
		in.Kind = "news"
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	if in.Source == "" {
		in.Source = "ops"
	}
	if in.Audience == "" {
		in.Audience = "all"
	}
	if in.DeliveryMode == "" {
		in.DeliveryMode = "scroll"
	}
	if in.Priority == "" {
		in.Priority = "normal"
	}
	if !tickerKinds[in.Kind] || !tickerStatuses[in.Status] || !tickerSources[in.Source] ||
		!tickerAudiences[in.Audience] || !tickerDeliveryModes[in.DeliveryMode] || !tickerPriorities[in.Priority] ||
		!validHour(in.OpenHour) || !validHour(in.CloseHour) ||
		!validNonNegative(in.CooldownMinutes) || !validNonNegative(in.RepeatGapMinutes) {
		return Ticker{}, ErrInvalid
	}
	t, err := scanTicker(db.QueryRow(`
		INSERT INTO dsh_marketing_tickers
			(message, kind, status, source, audience, delivery_mode, priority, pinned,
			 action_type, action_target, open_hour, close_hour, cooldown_minutes, repeat_gap_minutes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING `+tickerSelectCols,
		in.Message, in.Kind, in.Status, in.Source, in.Audience, in.DeliveryMode, in.Priority, in.Pinned,
		in.ActionType, in.ActionTarget, in.OpenHour, in.CloseHour, in.CooldownMinutes, in.RepeatGapMinutes, in.CreatedBy))
	if err != nil {
		return Ticker{}, err
	}
	_ = WriteAuditEvent(db, "ticker", t.ID, in.CreatedBy, "operator", "create", "", in.CorrelationID, nil, tickerJSON(t))
	return t, nil
}

type UpdateTickerInput struct {
	Message          *string
	Kind             *string
	Status           *string
	Source           *string
	Audience         *string
	DeliveryMode     *string
	Priority         *string
	Pinned           *bool
	ActionType       *string
	ActionTarget     *string
	OpenHour         *int
	CloseHour        *int
	CooldownMinutes  *int
	RepeatGapMinutes *int
	ActorID          string
	CorrelationID    string
}

func getTicker(db *sql.DB, id string) (Ticker, error) {
	t, err := scanTicker(db.QueryRow(`
		SELECT `+tickerSelectCols+`
		FROM dsh_marketing_tickers
		WHERE id::TEXT = $1 AND deleted_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Ticker{}, ErrNotFound
	}
	return t, err
}

func UpdateTicker(db *sql.DB, id string, in UpdateTickerInput) (Ticker, error) {
	before, err := getTicker(db, id)
	if err != nil {
		return Ticker{}, err
	}
	next := before
	if in.Message != nil {
		if *in.Message == "" {
			return Ticker{}, ErrInvalid
		}
		next.Message = *in.Message
	}
	if in.Kind != nil {
		next.Kind = *in.Kind
	}
	if in.Status != nil {
		if !tickerStatuses[*in.Status] {
			return Ticker{}, ErrInvalid
		}
		// Governed lifecycle: once published or paused, a ticker never returns to draft.
		if *in.Status == "draft" && before.Status != "draft" {
			return Ticker{}, ErrInvalidTransition
		}
		next.Status = *in.Status
	}
	if in.Source != nil {
		next.Source = *in.Source
	}
	if in.Audience != nil {
		next.Audience = *in.Audience
	}
	if in.DeliveryMode != nil {
		next.DeliveryMode = *in.DeliveryMode
	}
	if in.Priority != nil {
		next.Priority = *in.Priority
	}
	if in.Pinned != nil {
		next.Pinned = *in.Pinned
	}
	if in.ActionType != nil {
		next.ActionType = *in.ActionType
	}
	if in.ActionTarget != nil {
		next.ActionTarget = *in.ActionTarget
	}
	if in.OpenHour != nil {
		next.OpenHour = in.OpenHour
	}
	if in.CloseHour != nil {
		next.CloseHour = in.CloseHour
	}
	if in.CooldownMinutes != nil {
		next.CooldownMinutes = in.CooldownMinutes
	}
	if in.RepeatGapMinutes != nil {
		next.RepeatGapMinutes = in.RepeatGapMinutes
	}
	if !tickerKinds[next.Kind] || !tickerSources[next.Source] || !tickerAudiences[next.Audience] ||
		!tickerDeliveryModes[next.DeliveryMode] || !tickerPriorities[next.Priority] ||
		!validHour(next.OpenHour) || !validHour(next.CloseHour) ||
		!validNonNegative(next.CooldownMinutes) || !validNonNegative(next.RepeatGapMinutes) {
		return Ticker{}, ErrInvalid
	}
	t, err := scanTicker(db.QueryRow(`
		UPDATE dsh_marketing_tickers SET
			message = $2, kind = $3, status = $4, source = $5, audience = $6,
			delivery_mode = $7, priority = $8, pinned = $9,
			action_type = $10, action_target = $11,
			open_hour = $12, close_hour = $13, cooldown_minutes = $14, repeat_gap_minutes = $15,
			updated_at = NOW()
		WHERE id::TEXT = $1 AND deleted_at IS NULL
		RETURNING `+tickerSelectCols,
		id, next.Message, next.Kind, next.Status, next.Source, next.Audience,
		next.DeliveryMode, next.Priority, next.Pinned, next.ActionType, next.ActionTarget,
		next.OpenHour, next.CloseHour, next.CooldownMinutes, next.RepeatGapMinutes))
	if errors.Is(err, sql.ErrNoRows) {
		return Ticker{}, ErrNotFound
	}
	if err != nil {
		return Ticker{}, err
	}
	_ = WriteAuditEvent(db, "ticker", t.ID, in.ActorID, "operator", "update", "", in.CorrelationID, tickerJSON(before), tickerJSON(t))
	return t, nil
}

// DeleteTicker is a soft delete (deleted_at recorded) so rows that were already
// delivered to a surface keep an auditable history.
func DeleteTicker(db *sql.DB, id, actorID, correlationID string) error {
	before, err := getTicker(db, id)
	if err != nil {
		return err
	}
	res, err := db.Exec(`
		UPDATE dsh_marketing_tickers SET deleted_at = NOW(), updated_at = NOW()
		WHERE id::TEXT = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return WriteAuditEvent(db, "ticker", id, actorID, "operator", "delete", "", correlationID, tickerJSON(before), nil)
}
