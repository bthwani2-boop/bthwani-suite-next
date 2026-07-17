package pickup

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

const pickupOtpNotificationTopic = "pickup_otp"

// DeliverOtpNotification delivers a newly issued pickup OTP through DSH's
// authenticated, actor-scoped notification channel. The plaintext is never
// logged, returned to the partner surface, or written to the operational
// outbox. Re-issuing a code invalidates the visible body of prior unread OTP
// notifications for the same pickup order before inserting the fresh code.
func DeliverOtpNotification(ctx context.Context, db *sql.DB, session *PickupSession, plainOtp string) error {
	if db == nil || session == nil {
		return fmt.Errorf("pickup OTP notification requires database and session")
	}
	plainOtp = strings.TrimSpace(plainOtp)
	if len(plainOtp) != 6 || strings.Trim(plainOtp, "0123456789") != "" {
		return fmt.Errorf("pickup OTP notification requires a six-digit code")
	}
	if strings.TrimSpace(session.ClientID) == "" || strings.TrimSpace(session.OrderID) == "" {
		return fmt.Errorf("pickup OTP notification requires client and order identifiers")
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	actionURL := "/orders/" + session.OrderID + "/pickup"
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_notifications
		SET body = 'تم استبدال رمز الاستلام برمز أحدث.', is_read = TRUE,
		    read_at = COALESCE(read_at, NOW())
		WHERE actor_id = $1 AND actor_type = 'client' AND topic = $2
		  AND action_url = $3 AND is_read = FALSE`,
		session.ClientID, pickupOtpNotificationTopic, actionURL,
	); err != nil {
		return fmt.Errorf("invalidate previous pickup OTP notification: %w", err)
	}

	body := "رمز استلام طلبك هو " + plainOtp + ". لا تشاركه إلا عند نقطة الاستلام."
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1, 'client', $2, 'رمز استلام طلبك', $3, $4)`,
		session.ClientID, pickupOtpNotificationTopic, body, actionURL,
	); err != nil {
		return fmt.Errorf("insert pickup OTP notification: %w", err)
	}

	return tx.Commit()
}
