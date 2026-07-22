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

var supportedNotificationChannels = map[string]struct{}{
	"in_app": {},
	"push":   {},
}

var supportedNotificationLocales = map[string]struct{}{
	"ar": {},
	"en": {},
}

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
	ActorID         string    `json:"actorId"`
	ActorType       string    `json:"actorType"`
	Topic           string    `json:"topic"`
	Enabled         bool      `json:"enabled"`
	Channels        []string  `json:"channels"`
	QuietHoursStart *string   `json:"quietHoursStart,omitempty"`
	QuietHoursEnd   *string   `json:"quietHoursEnd,omitempty"`
	Locale          string    `json:"locale"`
	Timezone        string    `json:"timezone"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type NotificationPreferenceInput struct {
	Topic           string
	Enabled         bool
	Channels        []string
	QuietHoursStart string
	QuietHoursEnd   string
	Locale          string
	Timezone        string
}

type PlatformNotificationConfig struct {
	ID              string    `json:"id"`
	Topic           string    `json:"topic"`
	ActorTypes      []string  `json:"actorTypes"`
	IsEnabled       bool      `json:"isEnabled"`
	Description     string    `json:"description"`
	DefaultChannels []string  `json:"defaultChannels"`
	TitleAR         string    `json:"titleAr"`
	BodyAR          string    `json:"bodyAr"`
	TitleEN         string    `json:"titleEn"`
	BodyEN          string    `json:"bodyEn"`
	Variables       []string  `json:"variables"`
	DeepLinkPattern string    `json:"deepLinkPattern"`
	UpdatedBy       string    `json:"updatedBy"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type PlatformNotificationConfigInput struct {
	Topic           string
	ActorTypes      []string
	IsEnabled       bool
	Description     string
	DefaultChannels []string
	TitleAR         string
	BodyAR          string
	TitleEN         string
	BodyEN          string
	Variables       []string
	DeepLinkPattern string
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

// UpsertNotificationPreferences preserves the original call surface while
// delegating to the governed policy model with safe defaults.
func UpsertNotificationPreferences(db *sql.DB, actorID, actorType, topic string, enabled bool) (NotificationPreference, error) {
	return UpsertNotificationPreferencePolicy(db, actorID, actorType, NotificationPreferenceInput{
		Topic:    topic,
		Enabled:  enabled,
		Channels: []string{"in_app"},
		Locale:   "ar",
		Timezone: "Asia/Aden",
	})
}

func UpsertNotificationPreferencePolicy(db *sql.DB, actorID, actorType string, input NotificationPreferenceInput) (NotificationPreference, error) {
	input.Topic = strings.TrimSpace(input.Topic)
	if actorID == "" || actorType == "" || input.Topic == "" || db == nil {
		return NotificationPreference{}, ErrInvalid
	}
	channels, err := normalizeNotificationChannels(input.Channels)
	if err != nil {
		return NotificationPreference{}, err
	}
	locale := strings.ToLower(strings.TrimSpace(input.Locale))
	if locale == "" {
		locale = "ar"
	}
	if _, ok := supportedNotificationLocales[locale]; !ok {
		return NotificationPreference{}, ErrInvalid
	}
	timezone := strings.TrimSpace(input.Timezone)
	if timezone == "" {
		timezone = "Asia/Aden"
	}
	quietStart, quietEnd, err := normalizeQuietHours(input.QuietHoursStart, input.QuietHoursEnd)
	if err != nil {
		return NotificationPreference{}, err
	}

	now := time.Now().UTC()
	var p NotificationPreference
	var quietStartValue sql.NullString
	var quietEndValue sql.NullString
	err = db.QueryRow(`
		INSERT INTO dsh_notification_preferences
			(actor_id, actor_type, topic, enabled, channels, quiet_hours_start, quiet_hours_end, locale, timezone, updated_at)
		VALUES ($1, $2, $3, $4, $5::TEXT[], NULLIF($6, '')::TIME, NULLIF($7, '')::TIME, $8, $9, $10)
		ON CONFLICT (actor_id, actor_type, topic)
		DO UPDATE SET enabled=EXCLUDED.enabled,
		              channels=EXCLUDED.channels,
		              quiet_hours_start=EXCLUDED.quiet_hours_start,
		              quiet_hours_end=EXCLUDED.quiet_hours_end,
		              locale=EXCLUDED.locale,
		              timezone=EXCLUDED.timezone,
		              updated_at=EXCLUDED.updated_at
		RETURNING actor_id, actor_type, topic, enabled, channels,
		          COALESCE(quiet_hours_start::TEXT, ''), COALESCE(quiet_hours_end::TEXT, ''),
		          locale, timezone, updated_at`,
		actorID, actorType, input.Topic, input.Enabled, formatPgTextArray(channels), quietStart, quietEnd, locale, timezone, now).Scan(
		&p.ActorID, &p.ActorType, &p.Topic, &p.Enabled, pq_TextArray(&p.Channels),
		&quietStartValue, &quietEndValue, &p.Locale, &p.Timezone, &p.UpdatedAt)
	if err != nil {
		return p, err
	}
	p.QuietHoursStart = nullableStringPointer(quietStartValue)
	p.QuietHoursEnd = nullableStringPointer(quietEndValue)
	return p, nil
}

func ListPlatformNotificationConfigs(db *sql.DB) ([]PlatformNotificationConfig, error) {
	rows, err := db.Query(`
		SELECT id, topic, actor_types, is_enabled,
		       COALESCE(description,''), default_channels,
		       title_ar, body_ar, title_en, body_en, variables, deep_link_pattern,
		       COALESCE(updated_by,''), updated_at
		FROM dsh_platform_notification_config
		ORDER BY topic`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []PlatformNotificationConfig
	for rows.Next() {
		var c PlatformNotificationConfig
		if err := rows.Scan(
			&c.ID,
			&c.Topic,
			pq_TextArray(&c.ActorTypes),
			&c.IsEnabled,
			&c.Description,
			pq_TextArray(&c.DefaultChannels),
			&c.TitleAR,
			&c.BodyAR,
			&c.TitleEN,
			&c.BodyEN,
			pq_TextArray(&c.Variables),
			&c.DeepLinkPattern,
			&c.UpdatedBy,
			&c.UpdatedAt,
		); err != nil {
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

// UpsertPlatformNotificationConfig preserves compatibility with existing
// producers while applying governed defaults for templates and channels.
func UpsertPlatformNotificationConfig(db *sql.DB, topic string, actorTypes []string, isEnabled bool, description, updatedBy string) (PlatformNotificationConfig, error) {
	return UpsertPlatformNotificationConfigPolicy(db, PlatformNotificationConfigInput{
		Topic:           topic,
		ActorTypes:      actorTypes,
		IsEnabled:       isEnabled,
		Description:     description,
		DefaultChannels: []string{"in_app"},
	}, updatedBy)
}

func UpsertPlatformNotificationConfigPolicy(db *sql.DB, input PlatformNotificationConfigInput, updatedBy string) (PlatformNotificationConfig, error) {
	input.Topic = strings.TrimSpace(input.Topic)
	if input.Topic == "" || db == nil {
		return PlatformNotificationConfig{}, ErrInvalid
	}
	channels, err := normalizeNotificationChannels(input.DefaultChannels)
	if err != nil {
		return PlatformNotificationConfig{}, err
	}
	actorTypes := normalizeStringSet(input.ActorTypes)
	variables := normalizeStringSet(input.Variables)
	now := time.Now().UTC()
	var c PlatformNotificationConfig
	err = db.QueryRow(`
		INSERT INTO dsh_platform_notification_config
			(topic, actor_types, is_enabled, description, default_channels,
			 title_ar, body_ar, title_en, body_en, variables, deep_link_pattern, updated_by, updated_at)
		VALUES ($1, $2::TEXT[], $3, $4, $5::TEXT[], $6, $7, $8, $9, $10::TEXT[], $11, $12, $13)
		ON CONFLICT (topic) DO UPDATE
		SET actor_types=EXCLUDED.actor_types,
		    is_enabled=EXCLUDED.is_enabled,
		    description=EXCLUDED.description,
		    default_channels=EXCLUDED.default_channels,
		    title_ar=EXCLUDED.title_ar,
		    body_ar=EXCLUDED.body_ar,
		    title_en=EXCLUDED.title_en,
		    body_en=EXCLUDED.body_en,
		    variables=EXCLUDED.variables,
		    deep_link_pattern=EXCLUDED.deep_link_pattern,
		    updated_by=EXCLUDED.updated_by,
		    updated_at=EXCLUDED.updated_at
		RETURNING id, topic, actor_types, is_enabled, COALESCE(description,''),
		          default_channels, title_ar, body_ar, title_en, body_en, variables,
		          deep_link_pattern, COALESCE(updated_by,''), updated_at`,
		input.Topic,
		formatPgTextArray(actorTypes),
		input.IsEnabled,
		strings.TrimSpace(input.Description),
		formatPgTextArray(channels),
		strings.TrimSpace(input.TitleAR),
		strings.TrimSpace(input.BodyAR),
		strings.TrimSpace(input.TitleEN),
		strings.TrimSpace(input.BodyEN),
		formatPgTextArray(variables),
		strings.TrimSpace(input.DeepLinkPattern),
		updatedBy,
		now,
	).Scan(
		&c.ID,
		&c.Topic,
		pq_TextArray(&c.ActorTypes),
		&c.IsEnabled,
		&c.Description,
		pq_TextArray(&c.DefaultChannels),
		&c.TitleAR,
		&c.BodyAR,
		&c.TitleEN,
		&c.BodyEN,
		pq_TextArray(&c.Variables),
		&c.DeepLinkPattern,
		&c.UpdatedBy,
		&c.UpdatedAt,
	)
	return c, err
}

func normalizeNotificationChannels(values []string) ([]string, error) {
	if len(values) == 0 {
		values = []string{"in_app"}
	}
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		channel := strings.ToLower(strings.TrimSpace(value))
		if _, ok := supportedNotificationChannels[channel]; !ok {
			return nil, ErrInvalid
		}
		if _, duplicate := seen[channel]; duplicate {
			continue
		}
		seen[channel] = struct{}{}
		result = append(result, channel)
	}
	if len(result) == 0 {
		return nil, ErrInvalid
	}
	return result, nil
}

func normalizeQuietHours(start, end string) (string, string, error) {
	start = strings.TrimSpace(start)
	end = strings.TrimSpace(end)
	if start == "" && end == "" {
		return "", "", nil
	}
	if start == "" || end == "" {
		return "", "", ErrInvalid
	}
	if _, err := time.Parse("15:04", start); err != nil {
		return "", "", ErrInvalid
	}
	if _, err := time.Parse("15:04", end); err != nil {
		return "", "", ErrInvalid
	}
	return start, end, nil
}

func normalizeStringSet(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		item := strings.TrimSpace(value)
		if item == "" {
			continue
		}
		if _, duplicate := seen[item]; duplicate {
			continue
		}
		seen[item] = struct{}{}
		result = append(result, item)
	}
	return result
}

func nullableStringPointer(value sql.NullString) *string {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return nil
	}
	result := value.String
	return &result
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
