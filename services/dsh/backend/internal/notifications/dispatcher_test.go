package notifications

import (
	"testing"
)

func TestEvaluatePreference(t *testing.T) {
	tests := []struct {
		name        string
		isMandatory bool
		enabled     bool
		want        bool
	}{
		{"Mandatory overrides disabled", true, false, true},
		{"Mandatory with enabled", true, true, true},
		{"Optional and disabled", false, false, false},
		{"Optional and enabled", false, true, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := PlatformNotificationConfig{IsMandatory: tt.isMandatory}
			prefs := NotificationPreference{Enabled: tt.enabled}
			if got := EvaluatePreference(config, prefs); got != tt.want {
				t.Errorf("EvaluatePreference() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRenderTemplate(t *testing.T) {
	templateStr := "Hello {{name}}, your order {{order_id}} is ready!"
	variables := map[string]string{
		"name":     "Ali",
		"order_id": "12345",
	}
	want := "Hello Ali, your order 12345 is ready!"
	if got := RenderTemplate(templateStr, variables); got != want {
		t.Errorf("RenderTemplate() = %v, want %v", got, want)
	}

	// Test missing variable leaves placeholder
	templateStrMissing := "Hello {{name}}, order {{order_id}} {{status}}"
	wantMissing := "Hello Ali, order 12345 {{status}}"
	if got := RenderTemplate(templateStrMissing, variables); got != wantMissing {
		t.Errorf("RenderTemplate() = %v, want %v", got, wantMissing)
	}
}
