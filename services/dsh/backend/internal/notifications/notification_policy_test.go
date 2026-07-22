package notifications

import (
	"errors"
	"reflect"
	"testing"
)

func TestNormalizeNotificationChannels(t *testing.T) {
	channels, err := normalizeNotificationChannels([]string{"push", "in_app", "push"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []string{"push", "in_app"}
	if !reflect.DeepEqual(channels, want) {
		t.Fatalf("expected %v, got %v", want, channels)
	}
}

func TestNormalizeNotificationChannelsRejectsUnknownChannel(t *testing.T) {
	if _, err := normalizeNotificationChannels([]string{"sms"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}

func TestNormalizeQuietHours(t *testing.T) {
	start, end, err := normalizeQuietHours("22:00", "07:00")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if start != "22:00" || end != "07:00" {
		t.Fatalf("unexpected normalized quiet hours %q-%q", start, end)
	}
}

func TestNormalizeQuietHoursRequiresCompletePair(t *testing.T) {
	if _, _, err := normalizeQuietHours("22:00", ""); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for partial quiet hours, got %v", err)
	}
	if _, _, err := normalizeQuietHours("25:00", "07:00"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for invalid time, got %v", err)
	}
}

func TestNotificationPreferencePolicyRequiresDatabase(t *testing.T) {
	_, err := UpsertNotificationPreferencePolicy(nil, "actor-1", "client", NotificationPreferenceInput{
		Topic:    "order.status_changed",
		Enabled:  true,
		Channels: []string{"in_app"},
		Locale:   "ar",
		Timezone: "Asia/Aden",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}

func TestPlatformNotificationPolicyRequiresDatabase(t *testing.T) {
	_, err := UpsertPlatformNotificationConfigPolicy(nil, PlatformNotificationConfigInput{
		Topic:           "order.status_changed",
		ActorTypes:      []string{"client"},
		IsEnabled:       true,
		DefaultChannels: []string{"in_app"},
	}, "operator-1")
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}
