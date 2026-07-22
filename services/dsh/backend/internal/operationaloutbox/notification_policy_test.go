package operationaloutbox

import (
	"testing"
	"time"
)

func TestRenderNotificationTemplate(t *testing.T) {
	got := renderNotificationTemplate("تم تحديث الطلب {{entityId}}", map[string]string{"entityId": "order-1"})
	if got != "تم تحديث الطلب order-1" {
		t.Fatalf("unexpected rendered template %q", got)
	}
}

func TestNotificationTemplateValuesIncludesEnvelopeAndPayload(t *testing.T) {
	values := notificationTemplateValues(Event{
		EventType:     "order.status_changed",
		EntityType:    "order",
		EntityID:      "order-1",
		CorrelationID: "corr-1",
		Payload:       []byte(`{"status":"ready","version":2}`),
	})
	for key, want := range map[string]string{
		"eventType": "order.status_changed",
		"entityType": "order",
		"entityId": "order-1",
		"correlationId": "corr-1",
		"status": "ready",
		"version": "2",
	} {
		if values[key] != want {
			t.Fatalf("expected %s=%q, got %q", key, want, values[key])
		}
	}
}

func TestQuietHoursReleaseOvernight(t *testing.T) {
	now := time.Date(2026, 7, 22, 21, 30, 0, 0, time.UTC) // 00:30 Asia/Aden
	until, quiet := quietHoursRelease(now, "Asia/Aden", "22:00", "07:00")
	if !quiet {
		t.Fatal("expected current time to be inside quiet hours")
	}
	want := time.Date(2026, 7, 23, 4, 0, 0, 0, time.UTC) // 07:00 Asia/Aden
	if !until.Equal(want) {
		t.Fatalf("expected release %s, got %s", want, until)
	}
}

func TestUniqueChannelsRemovesUnsupportedAndDuplicates(t *testing.T) {
	channels := uniqueChannels([]string{"push", "push", "sms", "in_app"})
	if len(channels) != 2 || channels[0] != "push" || channels[1] != "in_app" {
		t.Fatalf("unexpected channels %v", channels)
	}
}

func TestNotificationRecipientSupportsAllGovernedActors(t *testing.T) {
	for _, actorType := range []string{"client", "partner", "captain", "field", "operator"} {
		if !validNotificationActorType(actorType) {
			t.Fatalf("expected actor type %q to be supported", actorType)
		}
	}
	if validNotificationActorType("unknown") {
		t.Fatal("unknown actor type must be rejected")
	}
}
