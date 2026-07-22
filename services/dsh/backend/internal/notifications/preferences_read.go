package notifications

import "database/sql"

func ListActorNotificationPreferences(db *sql.DB, actorID, actorType string) ([]NotificationPreference, error) {
	if db == nil || actorID == "" || actorType == "" {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT actor_id, actor_type, topic, enabled, channels,
		       COALESCE(quiet_hours_start::TEXT, ''),
		       COALESCE(quiet_hours_end::TEXT, ''),
		       locale, timezone, updated_at
		FROM dsh_notification_preferences
		WHERE actor_id = $1 AND actor_type = $2
		ORDER BY topic`, actorID, actorType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	preferences := make([]NotificationPreference, 0)
	for rows.Next() {
		var preference NotificationPreference
		var quietHoursStart sql.NullString
		var quietHoursEnd sql.NullString
		if err := rows.Scan(
			&preference.ActorID,
			&preference.ActorType,
			&preference.Topic,
			&preference.Enabled,
			pq_TextArray(&preference.Channels),
			&quietHoursStart,
			&quietHoursEnd,
			&preference.Locale,
			&preference.Timezone,
			&preference.UpdatedAt,
		); err != nil {
			return nil, err
		}
		preference.QuietHoursStart = nullableStringPointer(quietHoursStart)
		preference.QuietHoursEnd = nullableStringPointer(quietHoursEnd)
		preferences = append(preferences, preference)
	}
	return preferences, rows.Err()
}
