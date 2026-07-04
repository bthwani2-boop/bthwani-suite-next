package media

import "testing"

func TestBuildKeyJoinsNamespaceOwnerEntityAndFileName(t *testing.T) {
	got := BuildKey("store", "owner-1", "entity-1", "hero.png")
	want := "store/owner-1/entity-1/hero.png"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestSanitizeReplacesPathSeparators(t *testing.T) {
	got := sanitize("a/b\\c")
	if got != "a-b-c" {
		t.Fatalf("expected path separators replaced, got %q", got)
	}
}

func TestSanitizeReplacesDirectoryTraversal(t *testing.T) {
	got := sanitize("../../etc/passwd")
	for _, bad := range []string{"..", "/"} {
		if contains(got, bad) {
			t.Fatalf("expected sanitized value to not contain %q, got %q", bad, got)
		}
	}
}

func TestSanitizeReplacesSpaces(t *testing.T) {
	got := sanitize("hero image final.png")
	if got != "hero-image-final.png" {
		t.Fatalf("expected spaces replaced with dashes, got %q", got)
	}
}

func TestSanitizeTrimsSurroundingWhitespace(t *testing.T) {
	got := sanitize("  hero.png  ")
	if got != "hero.png" {
		t.Fatalf("expected surrounding whitespace trimmed, got %q", got)
	}
}

func TestBuildKeySanitizesEachSegment(t *testing.T) {
	got := BuildKey("store", "../owner", "entity/1", "file name.png")
	if contains(got, "..") {
		t.Fatalf("expected owner traversal to be sanitized, got %q", got)
	}
	want := "store/--owner/entity-1/file-name.png"
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func contains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
