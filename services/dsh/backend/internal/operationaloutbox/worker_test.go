package operationaloutbox

import "testing"

func TestNotificationCopyCoversOperationalClosureEvents(t *testing.T) {
	events := []string{
		"partner_delivery_assigned",
		"partner_delivery_mark_picked_up",
		"partner_delivery_mark_departed",
		"partner_delivery_mark_arrived",
		"partner_delivery_completed",
		"partner_delivery_submit_proof",
		"partner_delivery_raise_exception",
		"pickup_order_ready",
		"pickup_customer_notified",
		"pickup_customer_arrived",
		"pickup_otp_verified",
		"pickup_no_show",
		"pickup_window_extended",
	}
	for _, eventType := range events {
		t.Run(eventType, func(t *testing.T) {
			title, body := notificationCopy(eventType)
			if title == "" || body == "" {
				t.Fatalf("event %s has empty notification copy", eventType)
			}
			if title == "تحديث على طلبك" {
				t.Fatalf("event %s unexpectedly uses fallback notification copy", eventType)
			}
		})
	}
}

func TestUnknownEventUsesSafeFallback(t *testing.T) {
	title, body := notificationCopy("unknown_event")
	if title == "" || body == "" {
		t.Fatal("unknown event must retain non-empty safe fallback copy")
	}
}
