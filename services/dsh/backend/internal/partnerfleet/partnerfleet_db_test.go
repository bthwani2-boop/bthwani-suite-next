package partnerfleet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestPartnerFleetLifecyclePostgres(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for the JRN-030 PostgreSQL lifecycle proof")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	storeID := "store_jrn030_" + suffix
	secondStoreID := "store_jrn030_second_" + suffix
	inactiveStoreID := "store_jrn030_inactive_" + suffix
	member1 := "stm_jrn030_1_" + suffix
	member2 := "stm_jrn030_2_" + suffix
	member3 := "stm_jrn030_3_" + suffix
	secondStoreMember := "stm_jrn030_second_" + suffix
	inactiveMember := "stm_jrn030_inactive_" + suffix
	partnerActor := "partner_jrn030_" + suffix
	captainActor := "captain_jrn030_" + suffix
	otherCaptain := "captain_jrn030_other_" + suffix

	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_notifications WHERE actor_id IN ($1,$2,$3)`, partnerActor, captainActor, otherCaptain)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_stores WHERE id IN ($1,$2,$3)`, storeID, secondStoreID, inactiveStoreID)
	})

	insertStore := func(id, displayName, status string) {
		t.Helper()
		_, err := db.ExecContext(ctx, `
			INSERT INTO dsh_stores
				(id, slug, display_name, status, city_code, service_area_code, serviceability_status)
			VALUES ($1, $2, $3, $4, 'SANAA', 'SANAA', 'serviceable')`,
			id, id, displayName, status)
		if err != nil {
			t.Fatalf("insert store %s: %v", id, err)
		}
	}
	insertMember := func(id, store, name string) {
		t.Helper()
		_, err := db.ExecContext(ctx, `
			INSERT INTO dsh_store_team_members
				(id, store_id, name, role, status, branch_assignment, delivery_assignment)
			VALUES ($1, $2, $3, 'courier', 'invited', 'main', 'delivery')`,
			id, store, name)
		if err != nil {
			t.Fatalf("insert member %s: %v", id, err)
		}
	}

	insertStore(storeID, "متجر اختبار المرحلة 30", "active")
	insertStore(secondStoreID, "متجر ثانٍ لاختبار المرحلة 30", "active")
	insertStore(inactiveStoreID, "متجر غير نشط لاختبار المرحلة 30", "inactive")
	insertMember(member1, storeID, "موصل أول")
	insertMember(member2, storeID, "موصل ثان")
	insertMember(member3, storeID, "موصل منتهي")
	insertMember(secondStoreMember, secondStoreID, "موصل المتجر الثاني")
	insertMember(inactiveMember, inactiveStoreID, "موصل متجر غير نشط")

	issued1, err := IssueCode(ctx, db, storeID, member1, partnerActor, time.Hour)
	if err != nil {
		t.Fatalf("issue first code: %v", err)
	}
	if issued1.Code == "" || issued1.Connection.Status != "pending" || issued1.Connection.Version != 1 {
		t.Fatalf("unexpected issued connection: %#v", issued1)
	}
	var storedHash, storedLast4 string
	if err := db.QueryRowContext(ctx, `
		SELECT code_hash, code_last4
		FROM dsh_partner_courier_connection_codes
		WHERE id::text = $1`, issued1.Connection.ID).Scan(&storedHash, &storedLast4); err != nil {
		t.Fatal(err)
	}
	if storedHash == normalizeCode(issued1.Code) || storedHash != hashCode(issued1.Code) {
		t.Fatal("connection code was not persisted as the expected one-way digest")
	}
	normalizedIssued := normalizeCode(issued1.Code)
	if storedLast4 != normalizedIssued[len(normalizedIssued)-4:] {
		t.Fatal("stored last-four projection does not match the issued code")
	}

	connections, err := ListStoreConnections(ctx, db, storeID)
	if err != nil || len(connections) != 1 || connections[0].Status != "pending" {
		t.Fatalf("list pending connection: connections=%#v err=%v", connections, err)
	}

	membership, err := RedeemCode(ctx, db, captainActor, issued1.Code)
	if err != nil {
		t.Fatalf("redeem first code: %v", err)
	}
	if membership.Status != "active" || membership.StoreName != "متجر اختبار المرحلة 30" || membership.Version != 2 {
		t.Fatalf("unexpected redeemed membership: %#v", membership)
	}

	memberships, err := ListCaptainMemberships(ctx, db, captainActor)
	if err != nil || len(memberships) != 1 || memberships[0].TeamMemberID != member1 {
		t.Fatalf("list captain memberships: memberships=%#v err=%v", memberships, err)
	}

	issued2, err := IssueCode(ctx, db, storeID, member2, partnerActor, time.Hour)
	if err != nil {
		t.Fatalf("issue second code: %v", err)
	}
	if _, err := RedeemCode(ctx, db, captainActor, issued2.Code); !errors.Is(err, ErrAlreadyBound) {
		t.Fatalf("expected duplicate captain binding in one store to fail closed, got %v", err)
	}

	secondStoreIssued, err := IssueCode(ctx, db, secondStoreID, secondStoreMember, partnerActor, time.Hour)
	if err != nil {
		t.Fatalf("issue second-store code: %v", err)
	}
	secondStoreMembership, err := RedeemCode(ctx, db, captainActor, secondStoreIssued.Code)
	if err != nil {
		t.Fatalf("expected governed multi-store membership to succeed, got %v", err)
	}
	if secondStoreMembership.StoreID != secondStoreID || secondStoreMembership.StoreName != "متجر ثانٍ لاختبار المرحلة 30" {
		t.Fatalf("unexpected second-store membership: %#v", secondStoreMembership)
	}
	memberships, err = ListCaptainMemberships(ctx, db, captainActor)
	if err != nil || len(memberships) != 2 {
		t.Fatalf("captain must see both governed store memberships: memberships=%#v err=%v", memberships, err)
	}

	disconnected, err := DisconnectCaptainMembership(ctx, db, captainActor, storeID, member1, membership.Version)
	if err != nil {
		t.Fatalf("disconnect first membership: %v", err)
	}
	if disconnected.Status != "paused" || disconnected.Version != membership.Version+1 {
		t.Fatalf("unexpected disconnected membership: %#v", disconnected)
	}
	secondDisconnected, err := DisconnectCaptainMembership(
		ctx,
		db,
		captainActor,
		secondStoreID,
		secondStoreMember,
		secondStoreMembership.Version,
	)
	if err != nil {
		t.Fatalf("disconnect second-store membership: %v", err)
	}
	if secondDisconnected.Status != "paused" || secondDisconnected.Version != secondStoreMembership.Version+1 {
		t.Fatalf("unexpected second-store disconnect: %#v", secondDisconnected)
	}
	memberships, err = ListCaptainMemberships(ctx, db, captainActor)
	if err != nil || len(memberships) != 0 {
		t.Fatalf("disconnected captain must have no active identity binding: memberships=%#v err=%v", memberships, err)
	}

	revoked, err := RevokeCode(ctx, db, storeID, issued2.Connection.ID, partnerActor, issued2.Connection.Version)
	if err != nil {
		t.Fatalf("revoke pending code: %v", err)
	}
	if revoked.Status != "revoked" || revoked.Version != issued2.Connection.Version+1 {
		t.Fatalf("unexpected revoked connection: %#v", revoked)
	}
	if _, err := RevokeCode(ctx, db, storeID, issued2.Connection.ID, partnerActor, issued2.Connection.Version); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected stale revoke to fail with version conflict, got %v", err)
	}

	expiredPlain := "EXPIRED99"
	_, err = db.ExecContext(ctx, `
		INSERT INTO dsh_partner_courier_connection_codes
			(store_id, team_member_id, code_hash, code_last4, expires_at, created_by_actor_id)
		VALUES ($1, $2, $3, 'ED99', NOW() - INTERVAL '1 minute', $4)`,
		storeID, member3, hashCode(expiredPlain), partnerActor)
	if err != nil {
		t.Fatalf("insert expired code: %v", err)
	}
	if _, err := RedeemCode(ctx, db, otherCaptain, expiredPlain); !errors.Is(err, ErrExpired) {
		t.Fatalf("expected expired code rejection, got %v", err)
	}
	var expiredStatus string
	if err := db.QueryRowContext(ctx, `
		SELECT status FROM dsh_partner_courier_connection_codes
		WHERE team_member_id = $1`, member3).Scan(&expiredStatus); err != nil {
		t.Fatal(err)
	}
	if expiredStatus != "expired" {
		t.Fatalf("expected durable expired status, got %s", expiredStatus)
	}

	if _, err := IssueCode(ctx, db, inactiveStoreID, inactiveMember, partnerActor, time.Hour); !errors.Is(err, ErrStoreIneligible) {
		t.Fatalf("expected inactive store to fail closed, got %v", err)
	}

	var actionCount int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_store_team_member_actions
		WHERE store_id = $1`, storeID).Scan(&actionCount); err != nil {
		t.Fatal(err)
	}
	if actionCount < 5 {
		t.Fatalf("expected audited issue/redeem/disconnect/revoke lifecycle, got %d actions", actionCount)
	}

	var notificationCount int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_notifications
		WHERE actor_id IN ($1,$2,$3)
		  AND topic IN ('partner_fleet_connection','partner_fleet_membership')`,
		partnerActor, captainActor, otherCaptain).Scan(&notificationCount); err != nil {
		t.Fatal(err)
	}
	if notificationCount < 10 {
		t.Fatalf("expected complete partner/captain lifecycle notifications, got %d", notificationCount)
	}
}
