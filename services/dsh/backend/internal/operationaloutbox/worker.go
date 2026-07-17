package operationaloutbox

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

const (
	workerBatchSize = 50
	workerLease     = 2 * time.Minute
)

// RunWorker drains durable operational events into the canonical in-app
// notification store. Delivery is idempotent: the outbox UUID is reused as
// the notification UUID, so a crash between insertion and MarkSent cannot
// create duplicate notifications on retry.
func RunWorker(ctx context.Context, db *sql.DB, interval time.Duration) {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Process immediately at startup so pending events are not forced to wait
	// for the first tick.
	if err := ProcessOnce(ctx, db); err != nil {
		log.Printf("[operational-outbox] startup batch failed: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db); err != nil {
				log.Printf("[operational-outbox] batch failed: %v", err)
			}
		}
	}
}

// ProcessOnce claims and delivers one batch. Individual event failures are
// recorded for retry and do not prevent independent events from progressing.
func ProcessOnce(ctx context.Context, db *sql.DB) error {
	events, err := ClaimBatch(db, workerBatchSize, workerLease)
	if err != nil {
		return err
	}
	for _, event := range events {
		if err := deliver(ctx, db, event); err != nil {
			if markErr := MarkFailed(db, event.ID, event.AttemptCount, err); markErr != nil {
				log.Printf("[operational-outbox] failed to persist retry for %s: %v", event.ID, markErr)
			}
			continue
		}
		if err := MarkSent(db, event.ID); err != nil {
			log.Printf("[operational-outbox] failed to mark %s sent: %v", event.ID, err)
		}
	}
	return nil
}

type pickupPayload struct {
	ClientID string `json:"ClientID"`
	OrderID  string `json:"OrderID"`
}

func deliver(ctx context.Context, db *sql.DB, event Event) error {
	clientID, err := resolveClientID(ctx, db, event)
	if err != nil {
		return err
	}
	if clientID == "" {
		// Some audit-only events intentionally have no customer recipient. They
		// are still considered consumed after downstream analytics can read the
		// durable outbox table.
		return nil
	}

	title, body := notificationCopy(event.EventType)
	actionURL := "/orders"
	if event.EntityType == "pickup_session" {
		actionURL = "/orders/pickup"
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO dsh_notifications
			(id, actor_id, actor_type, topic, title, body, action_url)
		VALUES ($1::uuid, $2, 'client', $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING`,
		event.ID, clientID, event.EventType, title, body, actionURL,
	)
	if err != nil {
		return fmt.Errorf("deliver operational notification %s: %w", event.ID, err)
	}
	return nil
}

func resolveClientID(ctx context.Context, db *sql.DB, event Event) (string, error) {
	switch event.EntityType {
	case "partner_delivery_task":
		var clientID string
		err := db.QueryRowContext(ctx, `
			SELECT o.client_id::text
			FROM dsh_partner_delivery_tasks t
			JOIN dsh_orders o ON o.id = t.order_id
			WHERE t.id = $1`, event.EntityID).Scan(&clientID)
		if err != nil {
			return "", fmt.Errorf("resolve partner-delivery recipient: %w", err)
		}
		return clientID, nil
	case "pickup_session":
		var payload pickupPayload
		if len(event.Payload) > 0 {
			_ = json.Unmarshal(event.Payload, &payload)
		}
		if payload.ClientID != "" {
			return payload.ClientID, nil
		}
		var clientID string
		err := db.QueryRowContext(ctx, `
			SELECT client_id::text FROM dsh_pickup_sessions WHERE id = $1`, event.EntityID).Scan(&clientID)
		if err == nil {
			return clientID, nil
		}
		// mark-ready/notify/customer-arrived events use the order ID as the
		// entity identifier rather than the pickup-session ID.
		err = db.QueryRowContext(ctx, `
			SELECT client_id::text FROM dsh_orders WHERE id = $1::uuid`, event.EntityID).Scan(&clientID)
		if err != nil {
			return "", fmt.Errorf("resolve pickup recipient: %w", err)
		}
		return clientID, nil
	default:
		return "", nil
	}
}

func notificationCopy(eventType string) (string, string) {
	switch eventType {
	case "partner_delivery_assigned":
		return "تم إسناد طلبك لمندوب المتجر", "بدأ المتجر تجهيز رحلة التوصيل الخاصة بطلبك."
	case "partner_delivery_mark_picked_up":
		return "تم استلام طلبك", "استلم مندوب المتجر الطلب ويستعد للمغادرة."
	case "partner_delivery_mark_departed":
		return "طلبك في الطريق", "غادر مندوب المتجر باتجاه موقع التسليم."
	case "partner_delivery_mark_arrived":
		return "وصل مندوب المتجر", "وصل المندوب إلى موقع التسليم المحدد."
	case "partner_delivery_completed", "partner_delivery_submit_proof":
		return "تم تسليم طلبك", "اكتملت رحلة التوصيل وتم حفظ إثبات التسليم."
	case "partner_delivery_raise_exception":
		return "تحديث على رحلة التوصيل", "توجد حالة تحتاج متابعة من فريق العمليات."
	case "pickup_order_ready":
		return "طلبك جاهز للاستلام", "يمكنك التوجه إلى المتجر لاستلام الطلب."
	case "pickup_customer_notified":
		return "تم إرسال تعليمات الاستلام", "راجع إشعاراتك للحصول على تفاصيل الاستلام."
	case "pickup_customer_arrived":
		return "تم تسجيل وصولك", "أبلغ المتجر بوصولك ويجري تجهيز التسليم."
	case "pickup_otp_verified":
		return "تم تأكيد الاستلام", "تم التحقق من رمز الاستلام وإغلاق الطلب بنجاح."
	case "pickup_no_show":
		return "انتهت نافذة الاستلام", "تم تسجيل عدم الحضور ويحتاج الطلب إلى متابعة."
	case "pickup_window_extended":
		return "تم تمديد نافذة الاستلام", "يمكنك مراجعة الطلب لمعرفة الموعد المحدّث."
	default:
		return "تحديث على طلبك", "طرأ تحديث تشغيلي جديد على طلبك."
	}
}
