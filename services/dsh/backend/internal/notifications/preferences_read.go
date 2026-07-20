package notifications

import "database/sql"

func ListActorNotificationPreferences(db *sql.DB, actorID, actorType string) ([]NotificationPreference, error) {
	if actorID == "" || actorType == "" {
		return nil, ErrInvalid
	}
	rows, err := db.Query(`
		SELECT actor_id, actor_type, topic, enabled, updated_at
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
		if err := rows.Scan(
			&preference.ActorID,
			&preference.ActorType,
			&preference.Topic,
			&preference.Enabled,
			&preference.UpdatedAt,
		); err != nil {
			return nil, err
		}
		preferences = append(preferences, preference)
	}
	return preferences, rows.Err()
}
