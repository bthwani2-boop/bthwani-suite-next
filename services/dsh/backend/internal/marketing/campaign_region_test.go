package marketing

import (
	"errors"
	"testing"
)

func TestValidateCampaignRegion(t *testing.T) {
	valid := [][2]string{
		{"", ""},
		{"SAN", ""},
		{"SAN", "SAN-1"},
		{"sanaa.city", "zone:central"},
	}
	for _, pair := range valid {
		if err := validateCampaignRegion(pair[0], pair[1]); err != nil {
			t.Fatalf("valid region %q/%q rejected: %v", pair[0], pair[1], err)
		}
	}

	invalid := [][2]string{
		{"SAN A", ""},
		{"SAN", "zone/1"},
		{"SAN", "" + string(make([]byte, 65))},
	}
	for _, pair := range invalid {
		if err := validateCampaignRegion(pair[0], pair[1]); !errors.Is(err, ErrInvalid) {
			t.Fatalf("expected ErrInvalid for region %q/%q, got %v", pair[0], pair[1], err)
		}
	}
}
