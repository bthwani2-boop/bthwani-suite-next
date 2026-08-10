package media

import (
	"context"
	"net/url"
	"testing"
	"time"
)

func TestPresignPutUsesPublicEndpointWithoutRewrite(t *testing.T) {
	client, err := NewClient(
		"minio-internal:9000",
		"media.example.test:9443",
		"access-key",
		"secret-key",
		"dsh-media",
		false,
		true,
	)
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	rawURL, _, err := client.PresignPut(context.Background(), "catalog/asset.jpg", time.Minute)
	if err != nil {
		t.Fatalf("PresignPut() error = %v", err)
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("Parse(%q) error = %v", rawURL, err)
	}

	if u.Host != "media.example.test:9443" {
		t.Fatalf("presigned URL host = %q, want public endpoint", u.Host)
	}
	if u.Scheme != "https" {
		t.Fatalf("presigned URL scheme = %q, want https", u.Scheme)
	}
	if u.Path != "/dsh-media/catalog/asset.jpg" {
		t.Fatalf("presigned URL path = %q, want path-style bucket lookup", u.Path)
	}
	if got := u.Query().Get("X-Amz-SignedHeaders"); got != "host" {
		t.Fatalf("X-Amz-SignedHeaders = %q, want host", got)
	}
}

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
