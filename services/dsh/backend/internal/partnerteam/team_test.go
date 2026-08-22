package partnerteam

import (
	"context"
	"database/sql"
	"os"
	"reflect"
	"strconv"
	"testing"
	"time"

	"dsh-api/internal/partner"
	_ "github.com/lib/pq"
)

type partnerTeamRow struct {
	values []any
	err    error
}

func (r partnerTeamRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != len(r.values) {
		return sql.ErrNoRows
	}
	for i, value := range r.values {
		reflect.ValueOf(dest[i]).Elem().Set(reflect.ValueOf(value))
	}
	return nil
}

func TestStatusProjectionAndActionLabelUseCanonicalPartnerTeamVocabulary(t *testing.T) {
	for _, tc := range []struct {
		status    string
		projected string
		label     string
		action    string
	}{
		{status: "active", projected: "active", label: "نشط", action: "pause"},
		{status: "suspended", projected: "paused", label: "موقوف مؤقتًا", action: "activate"},
		{status: "invited", projected: "invited", label: "مدعو", action: "cancel-invite"},
		{status: "ended", projected: "blocked", label: "منتهٍ", action: "activate"},
		{status: "unknown", projected: "review-needed", label: "قيد المراجعة", action: "audit-log"},
	} {
		t.Run(tc.status, func(t *testing.T) {
			projected, label, action := statusProjection(tc.status)
			if projected != tc.projected || label != tc.label || action != tc.action {
				t.Fatalf("statusProjection(%q)=(%q,%q,%q)", tc.status, projected, label, action)
			}
		})
	}

	for action, want := range map[string]string{
		"pause":         "إيقاف مؤقت",
		"activate":      "تفعيل",
		"block":         "حظر",
		"resend-invite": "إعادة إرسال الدعوة",
		"cancel-invite": "إلغاء الدعوة",
		"audit-log":     "سجل التدقيق",
	} {
		if got := actionLabel(action); got != want {
			t.Fatalf("actionLabel(%q)=%q, want %q", action, got, want)
		}
	}
}

func TestScanMemberProjectsCanonicalStatusAndIdentity(t *testing.T) {
	member, err := scanMember(partnerTeamRow{values: []any{
		"member-1", "store-1", "captain-1", "owner", "active", "north", "motorcycle", 3,
	}})
	if err != nil {
		t.Fatal(err)
	}
	if member != (partner.StoreTeamMember{
		ID: "member-1", Name: "captain-1", Role: "owner", RoleLabel: "المالك / المدير العام",
		Status: "active", StatusLabel: "نشط", BranchAssignment: "north", PermissionsSummary: "تشغيل المتجر المحدد",
		DeliveryAssignment: "motorcycle", InviteLifecycle: "active", OperationalImpact: "تُقرأ العضوية من DSH canonical membership",
		AuditNote: "DSH membership member-1", InlineAction: "pause", InlineActionLabel: "إيقاف مؤقت", Version: 3,
	}) {
		t.Fatalf("unexpected projected member: %#v", member)
	}

	fallback, err := scanMember(partnerTeamRow{values: []any{
		"member-2", "store-1", "", "staff", "ended", "", "", 1,
	}})
	if err != nil {
		t.Fatal(err)
	}
	if fallback.Name != "member-2" || fallback.Status != "blocked" || fallback.InlineAction != "activate" {
		t.Fatalf("empty actor fallback was not projected canonically: %#v", fallback)
	}
}

func TestInviteAndExecuteActionPersistCanonicalMembershipHistoryDBIntegration(t *testing.T) {
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}

	var storeID string
	if err := db.QueryRow(`SELECT id FROM dsh_stores WHERE status='published' AND btrim(partner_id) <> '' ORDER BY id LIMIT 1`).Scan(&storeID); err != nil {
		t.Fatalf("seeded published partner store is required: %v", err)
	}
	identity := "partner-team-test-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	member, err := Invite(context.Background(), db, storeID, identity, "staff", "operator-test")
	if err != nil {
		t.Fatalf("Invite failed: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_captain_membership_history WHERE membership_id=$1`, member.ID)
		_, _ = db.Exec(`DELETE FROM dsh_captain_memberships WHERE id=$1`, member.ID)
	})
	if member.Status != "invited" || member.Role != "staff" {
		t.Fatalf("unexpected invitation projection: %#v", member)
	}

	updated, err := ExecuteAction(context.Background(), db, storeID, member.ID, "operator-test", TeamMemberAction{
		Action: "resend-invite", ExpectedVersion: member.Version, IdempotencyKey: "partner-team-test-idempotency", CorrelationID: "partner-team-test-correlation",
	})
	if err != nil {
		t.Fatalf("ExecuteAction failed: %v", err)
	}
	if updated.Status != "invited" || updated.Version != member.Version+1 {
		t.Fatalf("unexpected resend projection: %#v", updated)
	}
	var action, idempotencyKey, correlationID string
	if err := db.QueryRow(`SELECT action_label, idempotency_key, correlation_id FROM dsh_captain_membership_history WHERE membership_id=$1 ORDER BY created_at DESC LIMIT 1`, member.ID).Scan(&action, &idempotencyKey, &correlationID); err != nil {
		t.Fatal(err)
	}
	if action != "partner_team_resend-invite" || idempotencyKey != "partner-team-test-idempotency" || correlationID != "partner-team-test-correlation" {
		t.Fatalf("canonical membership history mismatch: action=%q idempotency=%q correlation=%q", action, idempotencyKey, correlationID)
	}
}
