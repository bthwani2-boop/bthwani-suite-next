package notifications

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound = errors.New("notification not found")
	ErrInvalid  = errors.New("invalid input")
)

type Notification struct {
	ID        string     `json:"id"`
	ActorID   string     `json:"actorId"`
	ActorType string     `json:"actorType"`
	Topic     string     `json:"topic"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	ActionURL string     `json:"actionUrl"`
	IsRead    bool       `json:"isRead"`
	CreatedAt time.Time  `json:"createdAt"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
}

type NotificationPreference struct {
	ActorID   string    `json:"actorId"`
	ActorType string    `json:"actorType"`
	Topic     string    `json:"topic"`
	Enabled   bool      `json:"enabled"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PlatformNotificationConfig struct {
	ID          string    `json:"id"`
	Topic       string    `json:"topic"`
	ActorTypes  []string  `json:"actorTypes"`
	IsEnabled   bool      `json:"isEnabled"`
	Description string    `json:"description"`
	UpdatedBy   string    `json:"updatedBy"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func ListActorNotifications(db *sql.DB, actorID, actorType string, limit int) ([]Notification, int, error) {
	rows, err := db.Query(`
		SELECT id, actor_id, actor_type, topic, title, body,
		       COALESCE(action_url,''), is_read, created_at, read_at
		FROM dsh_notifications
		WHERE actor_id = $1 AND actor_type = $2
		ORDER BY created_at DESC
		LIMIT $3`, actorID, actorType, limit)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.ActorID, &n.ActorType, &n.Topic,
			&n.Title, &n.Body, &n.ActionURL, &n.IsRead, &n.CreatedAt, &n.ReadAt); err != nil {
			return nil, 0, err
		}
		out = append(out, n)
	}
	if out == nil {
		out = []Notification{}
	}

	var unread int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_notifications WHERE actor_id=$1 AND actor_type=$2 AND is_read=FALSE`,
		actorID, actorType).Scan(&unread); err != nil {
		return out, 0, err
	}
	return out, unread, rows.Err()
}

func MarkNotificationRead(db *sql.DB, notificationID, actorID string) (Notification, error) {
	now := time.Now().UTC()
	var n Notification
	err := db.QueryRow(`
		UPDATE dsh_notifications
		SET is_read=TRUE, read_at=$1
		WHERE id=$2 AND actor_id=$3
		RETURNING id, actor_id, actor_type, topic, title, body,
		          COALESCE(action_url,''), is_read, created_at, read_at`,
		now, notificationID, actorID).Scan(
		&n.ID, &n.ActorID, &n.ActorType, &n.Topic,
		&n.Title, &n.Body, &n.ActionURL, &n.IsRead, &n.CreatedAt, &n.ReadAt)
	if errors.Is(err, sql.ErrNoRows) {
		return n, ErrNotFound
	}
	return n, err
}

func MarkAllNotificationsRead(db *sql.DB, actorID, actorType string) (int64, error) {
	now := time.Now().UTC()
	result, err := db.Exec(`
		UPDATE dsh_notifications
		SET is_read=TRUE, read_at=$1
		WHERE actor_id=$2 AND actor_type=$3 AND is_read=FALSE`,
		now, actorID, actorType)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func UpsertNotificationPreferences(db *sql.DB, actorID, actorType, topic string, enabled bool) (NotificationPreference, error) {
	if actorID == "" || actorType == "" || topic == "" {
		return NotificationPreference{}, ErrInvalid
	}
	now := time.Now().UTC()
	var p NotificationPreference
	err := db.QueryRow(`
		INSERT INTO dsh_notification_preferences (actor_id, actor_type, topic, enabled, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (actor_id, actor_type, topic)
		DO UPDATE SET enabled=EXCLUDED.enabled, updated_at=EXCLUDED.updated_at
		RETURNING actor_id, actor_type, topic, enabled, updated_at`,
		actorID, actorType, topic, enabled, now).Scan(
		&p.ActorID, &p.ActorType, &p.Topic, &p.Enabled, &p.UpdatedAt)
	return p, err
}

func ListPlatformNotificationConfigs(db *sql.DB) ([]PlatformNotificationConfig, error) {
	rows, err := db.Query(`
		SELECT id, topic, actor_types, is_enabled,
		       COALESCE(description,''), COALESCE(updated_by,''), updated_at
		FROM dsh_platform_notification_config
		ORDER BY topic`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PlatformNotificationConfig
	for rows.Next() {
		var c PlatformNotificationConfig
		if err := rows.Scan(&c.ID, &c.Topic, pq_TextArray(&c.ActorTypes),
			&c.IsEnabled, &c.Description, &c.UpdatedBy, &c.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	if out == nil {
		out = []PlatformNotificationConfig{}
	}
	return out, rows.Err()
}

func formatPgTextArray(vals []string) string {
	if len(vals) == 0 {
		return "{}"
	}
	quoted := make([]string, len(vals))
	for i, v := range vals {
		quoted[i] = fmt.Sprintf("%q", v)
	}
	return "{" + strings.Join(quoted, ",") + "}"
}

func UpsertPlatformNotificationConfig(db *sql.DB, topic string, actorTypes []string, isEnabled bool, description, updatedBy string) (PlatformNotificationConfig, error) {
	if topic == "" {
		return PlatformNotificationConfig{}, ErrInvalid
	}
	now := time.Now().UTC()
	var c PlatformNotificationConfig
	err := db.QueryRow(`
		INSERT INTO dsh_platform_notification_config
		       (topic, actor_types, is_enabled, description, updated_by, updated_at)
		VALUES ($1, $2::TEXT[], $3, $4, $5, $6)
		ON CONFLICT (topic) DO UPDATE
		SET actor_types=EXCLUDED.actor_types,
		    is_enabled=EXCLUDED.is_enabled,
		    description=EXCLUDED.description,
		    updated_by=EXCLUDED.updated_by,
		    updated_at=EXCLUDED.updated_at
		RETURNING id, topic, actor_types, is_enabled,
		          COALESCE(description,''), COALESCE(updated_by,''), updated_at`,
		topic, formatPgTextArray(actorTypes), isEnabled, description, updatedBy, now).Scan(
		&c.ID, &c.Topic, pq_TextArray(&c.ActorTypes),
		&c.IsEnabled, &c.Description, &c.UpdatedBy, &c.UpdatedAt)
	return c, err
}

// pq_TextArray wraps []string for pq driver TEXT[] scanning/inserting.
type textArray []string

func pq_TextArray(v *[]string) interface {
	Scan(src interface{}) error
} {
	return &pqTextArray{v}
}

type pqTextArray struct{ v *[]string }

func (a *pqTextArray) Scan(src interface{}) error {
	if src == nil {
		*a.v = []string{}
		return nil
	}
	switch v := src.(type) {
	case []byte:
		s := string(v)
		if s == "{}" || s == "" {
			*a.v = []string{}
			return nil
		}
		s = s[1 : len(s)-1]
		if s == "" {
			*a.v = []string{}
			return nil
		}
		parts := splitPgArray(s)
		*a.v = parts
		return nil
	case string:
		if v == "{}" || v == "" {
			*a.v = []string{}
			return nil
		}
		v = v[1 : len(v)-1]
		*a.v = splitPgArray(v)
		return nil
	}
	*a.v = []string{}
	return nil
}

func splitPgArray(s string) []string {
	var result []string
	var cur strings.Builder
	inQuotes := false
	escaped := false

	flush := func() {
		if cur.Len() == 0 {
			return
		}
		result = append(result, cur.String())
		cur.Reset()
	}

	for i := 0; i < len(s); i++ {
		ch := s[i]
		if escaped {
			cur.WriteByte(ch)
			escaped = false
			continue
		}
		if ch == '\\' && inQuotes {
			escaped = true
			continue
		}
		if ch == '"' {
			inQuotes = !inQuotes
			continue
		}
		if ch == ',' && !inQuotes {
			flush()
			continue
		}
		cur.WriteByte(ch)
	}
	flush()
	return result
}
