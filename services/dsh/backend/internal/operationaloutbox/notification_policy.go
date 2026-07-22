package operationaloutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

type notificationDeliveryPlan struct {
	Enabled       bool
	Title         string
	Body          string
	ActionURL     string
	Channels      []string
	DeferredUntil *time.Time
}

type DeliveryDeferredError struct {
	Until time.Time
}

func (e *DeliveryDeferredError) Error() string {
	return "notification delivery deferred until " + e.Until.UTC().Format(time.RFC3339)
}

func DeferUntil(db *sql.DB, eventID string, until time.Time) error {
	if db == nil || eventID == "" || until.IsZero() {
		return fmt.Errorf("operational outbox: invalid defer request")
	}
	_, err := db.Exec(`
		UPDATE dsh_operational_outbox_events
		SET next_retry_at = $2, updated_at = NOW()
		WHERE id = $1::uuid AND status = 'pending'`, eventID, until.UTC())
	if err != nil {
		return fmt.Errorf("defer operational notification %s: %w", eventID, err)
	}
	return nil
}

func buildNotificationDeliveryPlan(
	ctx context.Context,
	db *sql.DB,
	event Event,
	actorID string,
	actorType string,
	now time.Time,
) (notificationDeliveryPlan, error) {
	fallbackTitle, fallbackBody := notificationCopy(event.EventType)
	plan := notificationDeliveryPlan{
		Enabled:   true,
		Title:     fallbackTitle,
		Body:      fallbackBody,
		ActionURL: notificationActionURL(event),
		Channels:  []string{"in_app"},
	}

	var (
		isEnabled       bool
		actorTypes      pq.StringArray
		defaultChannels pq.StringArray
		titleAR         string
		bodyAR          string
		titleEN         string
		bodyEN          string
		variables       pq.StringArray
		deepLinkPattern string
	)
	configErr := db.QueryRowContext(ctx, `
		SELECT is_enabled, actor_types, default_channels,
		       title_ar, body_ar, title_en, body_en, variables, deep_link_pattern
		FROM dsh_platform_notification_config
		WHERE topic = $1`, event.EventType).Scan(
		&isEnabled,
		&actorTypes,
		&defaultChannels,
		&titleAR,
		&bodyAR,
		&titleEN,
		&bodyEN,
		&variables,
		&deepLinkPattern,
	)
	if configErr != nil && configErr != sql.ErrNoRows {
		return plan, fmt.Errorf("load notification config for %s: %w", event.EventType, configErr)
	}
	if configErr == nil {
		if !isEnabled || (len(actorTypes) > 0 && !containsString(actorTypes, actorType)) {
			plan.Enabled = false
			return plan, nil
		}
		if len(defaultChannels) > 0 {
			plan.Channels = uniqueChannels(defaultChannels)
		}
	}

	preferenceEnabled := true
	var preferenceChannels pq.StringArray
	var quietHoursStart string
	var quietHoursEnd string
	locale := "ar"
	timezone := "Asia/Aden"
	preferenceErr := db.QueryRowContext(ctx, `
		SELECT enabled, channels,
		       COALESCE(quiet_hours_start::TEXT, ''),
		       COALESCE(quiet_hours_end::TEXT, ''),
		       locale, timezone
		FROM dsh_notification_preferences
		WHERE actor_id = $1 AND actor_type = $2 AND topic = $3`,
		actorID, actorType, event.EventType,
	).Scan(
		&preferenceEnabled,
		&preferenceChannels,
		&quietHoursStart,
		&quietHoursEnd,
		&locale,
		&timezone,
	)
	if preferenceErr != nil && preferenceErr != sql.ErrNoRows {
		return plan, fmt.Errorf("load notification preference for %s: %w", event.EventType, preferenceErr)
	}
	if preferenceErr == nil {
		if !preferenceEnabled {
			plan.Enabled = false
			return plan, nil
		}
		if len(preferenceChannels) > 0 {
			plan.Channels = uniqueChannels(preferenceChannels)
		}
		if until, quiet := quietHoursRelease(now, timezone, quietHoursStart, quietHoursEnd); quiet {
			plan.DeferredUntil = &until
			return plan, nil
		}
	}

	values := notificationTemplateValues(event)
	if configErr == nil {
		if strings.EqualFold(locale, "en") {
			plan.Title = firstNonBlank(renderNotificationTemplate(titleEN, values), renderNotificationTemplate(titleAR, values), fallbackTitle)
			plan.Body = firstNonBlank(renderNotificationTemplate(bodyEN, values), renderNotificationTemplate(bodyAR, values), fallbackBody)
		} else {
			plan.Title = firstNonBlank(renderNotificationTemplate(titleAR, values), fallbackTitle)
			plan.Body = firstNonBlank(renderNotificationTemplate(bodyAR, values), fallbackBody)
		}
		if deepLinkPattern != "" {
			plan.ActionURL = renderNotificationTemplate(deepLinkPattern, values)
		}
		for _, variable := range variables {
			if _, ok := values[variable]; !ok {
				return plan, fmt.Errorf("notification template variable %q is missing for %s", variable, event.EventType)
			}
		}
	}
	return plan, nil
}

func enqueueNotificationChannels(tx *sql.Tx, notificationID string, channels []string) error {
	for _, channel := range uniqueChannels(channels) {
		status := "pending"
		var sentAt any
		if channel == "in_app" {
			status = "sent"
			sentAt = time.Now().UTC()
		}
		if _, err := tx.Exec(`
			INSERT INTO dsh_notification_channel_deliveries
				(notification_id, channel, status, sent_at)
			VALUES ($1::uuid, $2, $3, $4)
			ON CONFLICT (notification_id, channel) DO NOTHING`,
			notificationID, channel, status, sentAt,
		); err != nil {
			return fmt.Errorf("enqueue notification channel %s: %w", channel, err)
		}
	}
	return nil
}

func notificationActionURL(event Event) string {
	switch event.EntityType {
	case "order":
		return "/orders/" + event.EntityID
	case "pickup_session":
		return "/orders/pickup"
	case "special_request":
		return "/special-requests/" + event.EntityID
	default:
		return "/orders"
	}
}

func notificationTemplateValues(event Event) map[string]string {
	values := map[string]string{
		"eventType":     event.EventType,
		"entityType":    event.EntityType,
		"entityId":      event.EntityID,
		"correlationId": event.CorrelationID,
	}
	var payload map[string]any
	if len(event.Payload) > 0 && json.Unmarshal(event.Payload, &payload) == nil {
		for key, value := range payload {
			switch typed := value.(type) {
			case string:
				values[key] = typed
			case float64, bool:
				values[key] = fmt.Sprint(typed)
			}
		}
	}
	return values
}

func renderNotificationTemplate(template string, values map[string]string) string {
	result := strings.TrimSpace(template)
	for key, value := range values {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	return result
}

func quietHoursRelease(now time.Time, timezone, startValue, endValue string) (time.Time, bool) {
	if strings.TrimSpace(startValue) == "" || strings.TrimSpace(endValue) == "" {
		return time.Time{}, false
	}
	location, err := time.LoadLocation(strings.TrimSpace(timezone))
	if err != nil {
		location = time.FixedZone("Asia/Aden", 3*60*60)
	}
	localNow := now.In(location)
	startClock, err := parseDatabaseClock(startValue)
	if err != nil {
		return time.Time{}, false
	}
	endClock, err := parseDatabaseClock(endValue)
	if err != nil {
		return time.Time{}, false
	}
	start := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), startClock.Hour(), startClock.Minute(), 0, 0, location)
	end := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), endClock.Hour(), endClock.Minute(), 0, 0, location)
	if !end.After(start) {
		if localNow.Before(end) {
			start = start.AddDate(0, 0, -1)
		} else {
			end = end.AddDate(0, 0, 1)
		}
	}
	if !localNow.Before(start) && localNow.Before(end) {
		return end.UTC(), true
	}
	return time.Time{}, false
}

func parseDatabaseClock(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	for _, layout := range []string{"15:04:05", "15:04"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid time value %q", value)
}

func uniqueChannels(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		channel := strings.ToLower(strings.TrimSpace(value))
		if channel != "in_app" && channel != "push" {
			continue
		}
		if _, duplicate := seen[channel]; duplicate {
			continue
		}
		seen[channel] = struct{}{}
		result = append(result, channel)
	}
	if len(result) == 0 {
		return []string{"in_app"}
	}
	return result
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(target)) {
			return true
		}
	}
	return false
}

func firstNonBlank(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
