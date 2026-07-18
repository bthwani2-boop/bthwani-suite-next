package centralcatalog

import (
	"errors"
	"testing"
)

func TestValidateExpectedVersion(t *testing.T) {
	t.Parallel()

	if err := validateExpectedVersion(nil); !errors.Is(err, ErrInvalid) {
		t.Fatalf("nil expectedVersion must be invalid, got %v", err)
	}
	for _, value := range []int{-1, 0} {
		value := value
		t.Run("invalid", func(t *testing.T) {
			t.Parallel()
			if err := validateExpectedVersion(&value); !errors.Is(err, ErrInvalid) {
				t.Fatalf("expected %d to be invalid, got %v", value, err)
			}
		})
	}
	value := 1
	if err := validateExpectedVersion(&value); err != nil {
		t.Fatalf("positive expectedVersion must be valid: %v", err)
	}
}

func TestNormalizedOptionalRequiredText(t *testing.T) {
	t.Parallel()

	if value, err := normalizedOptionalRequiredText(nil); err != nil || value != nil {
		t.Fatalf("nil value mismatch: value=%v err=%v", value, err)
	}
	blank := "   "
	if _, err := normalizedOptionalRequiredText(&blank); !errors.Is(err, ErrInvalid) {
		t.Fatalf("blank value must be invalid, got %v", err)
	}
	raw := "  منتج مركزي  "
	value, err := normalizedOptionalRequiredText(&raw)
	if err != nil || value == nil || *value != "منتج مركزي" {
		t.Fatalf("trimmed value mismatch: value=%v err=%v", value, err)
	}
}
