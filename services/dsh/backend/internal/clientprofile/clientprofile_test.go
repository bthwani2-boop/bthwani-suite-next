package clientprofile

import (
	"errors"
	"testing"
)

func TestNormalizePreferencesUsesCanonicalProfileDomain(t *testing.T) {
	tests := []struct {
		name      string
		input     ClientProfilePreferencesInput
		want      ClientProfilePreferencesInput
		wantError bool
	}{
		{name: "trim and normalize", input: ClientProfilePreferencesInput{Locale: " EN ", CurrencyPreference: "yer"}, want: ClientProfilePreferencesInput{Locale: "en", CurrencyPreference: "YER"}},
		{name: "reject unsupported currency", input: ClientProfilePreferencesInput{Locale: "en", CurrencyPreference: "SAR"}, wantError: true},
		{name: "reject unsupported locale", input: ClientProfilePreferencesInput{Locale: "ar-SA", CurrencyPreference: "YER"}, wantError: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := normalizePreferences(test.input)
			if test.wantError {
				if !errors.Is(err, ErrInvalid) {
					t.Fatalf("normalizePreferences error = %v, want ErrInvalid", err)
				}
				return
			}
			if err != nil || got != test.want {
				t.Fatalf("normalizePreferences = %#v, %v; want %#v", got, err, test.want)
			}
		})
	}
}
