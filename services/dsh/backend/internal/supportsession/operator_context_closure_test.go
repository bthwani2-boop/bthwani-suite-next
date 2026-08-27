package supportsession

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestSupportSessionPersistenceFailsClosedWithoutOperatorContext(t *testing.T) {
	ctx := context.Background()
	if _, err := CreateRequest(ctx, nil, "target", "requester", "valid reason", 5); !errors.Is(err, ErrInvalid) {
		t.Fatalf("CreateRequest error = %v, want ErrInvalid", err)
	}
	if _, err := ListRequests(ctx, nil, "", 10); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ListRequests error = %v, want ErrInvalid", err)
	}
	if _, err := ReviewRequest(ctx, nil, "request", "checker", "approved", "", 1); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ReviewRequest error = %v, want ErrInvalid", err)
	}
	if _, err := MarkIssued(ctx, nil, "request", "session", time.Now().UTC()); !errors.Is(err, ErrInvalid) {
		t.Fatalf("MarkIssued error = %v, want ErrInvalid", err)
	}
	if _, err := MarkRevoked(ctx, nil, "request", "actor", "valid revoke reason"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("MarkRevoked error = %v, want ErrInvalid", err)
	}
	if _, err := LoadSnapshot(ctx, nil, "target"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("LoadSnapshot error = %v, want ErrInvalid", err)
	}
	if err := RecordPartnerSupportAccess(ctx, nil, Identity{InitiatorActorID: "actor", SupportRequestID: "request"}, "partner"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("RecordPartnerSupportAccess error = %v, want ErrInvalid", err)
	}
}
