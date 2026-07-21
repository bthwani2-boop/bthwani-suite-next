package partnerfleet

import (
	"strings"
	"testing"
)

func TestNormalizeAndHashConnectionCode(t *testing.T) {
	t.Parallel()

	const canonical = "ABCDE23456"
	for _, input := range []string{"ABCDE23456", "abcde-23456", "  AbCdE-23456  "} {
		if got := normalizeCode(input); got != canonical {
			t.Fatalf("normalizeCode(%q)=%q, want %q", input, got, canonical)
		}
		if hashCode(input) != hashCode(canonical) {
			t.Fatalf("equivalent code %q produced a different digest", input)
		}
	}
	if hashCode(canonical) == canonical {
		t.Fatal("connection code must never be persisted as plaintext")
	}
}

func TestGenerateCodeUsesNonAmbiguousAlphabet(t *testing.T) {
	t.Parallel()

	seen := map[string]struct{}{}
	for i := 0; i < 100; i++ {
		code, err := generateCode(10)
		if err != nil {
			t.Fatalf("generateCode: %v", err)
		}
		if len(code) != 10 {
			t.Fatalf("unexpected code length %d", len(code))
		}
		if strings.ContainsAny(code, "01OIL") {
			t.Fatalf("code contains ambiguous character: %q", code)
		}
		for _, char := range code {
			if !strings.ContainsRune(codeAlphabet, char) {
				t.Fatalf("code contains character outside approved alphabet: %q", code)
			}
		}
		if _, exists := seen[code]; exists {
			t.Fatalf("unexpected duplicate code in small sample: %q", code)
		}
		seen[code] = struct{}{}
	}
}

func TestFormatCodeForDisplay(t *testing.T) {
	t.Parallel()

	if got := FormatCodeForDisplay("abcde23456"); got != "ABCDE-23456" {
		t.Fatalf("FormatCodeForDisplay=%q", got)
	}
}
