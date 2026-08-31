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
	// The canonical fleet authority is dsh_captain_memberships after dsh-976.
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	operatorContextID := "local-dsh"
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
				(id, operator_context_id, slug, display_name, status, city_code, service_area_code, serviceability_status)
			VALUES ($1, $2, $3, $4, $5, 'SANAA', 'SANAA', 'serviceable')`,
			id, operatorContextID, id, displayName, status)
		if err != nil {
			t.Fatalf("insert store %s: %v", id, err)
		}
	}
	insertMember := func(id, store, name string) {
		t.Helper()
		_, err := db.ExecContext(ctx, `
			INSERT INTO dsh_captain_memberships
				(id, captain_actor_id, affiliation, partner_id, store_id, status, branch_assignment, delivery_assignment)
			VALUES ($1, '', 'PARTNER', 'partner_test', $2, 'invited', 'branch-a', 'delivery-a')`, id, store)
		if err != nil {
			t.Fatalf("insert member %s: %v", id, err)
		}
	}

	insertStore(storeID, "متجر اختبار المرحلة 30", "published")
	insertStore(secondStoreID, "متجر ثانٍ لاختبار المرحلة 30", "published")
	insertStore(inactiveStoreID, "متجر غير نشط لاختبار المرحلة 30", "paused")
	insertMember(member1, storeID, "موصل أول")
	insertMember(member2, storeID, "موصل ثان")
	insertMember(member3, storeID, "موصل منتهي")
	insertMember(secondStoreMember, secondStoreID, "موصل المتجر الثاني")
	insertMember(inactiveMember, inactiveStoreID, "موصل متجر غير نشط")

	if _, err := IssueCode(ctx, db, storeID, secondStoreMember, partnerActor, time.Hour, "issue-cross-store-1", "corr-cross-store-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected cross-store team-member issue to be hidden as not found, got %v", err)
	}

	issued1, err := IssueCode(ctx, db, storeID, member1, partnerActor, time.Hour, "issue-member-1", "corr-member-1")
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
	if _, err := IssueCode(ctx, db, storeID, member1, partnerActor, time.Hour, "issue-member-1-other", "corr-member-1-other"); !errors.Is(err, ErrAlreadyIssued) {
		t.Fatalf("a second live pending code for one member must fail closed, got %v", err)
	}

	connections, err := ListStoreConnections(ctx, db, storeID)
	if err != nil || len(connections) != 1 || connections[0].Status != "pending" {
		t.Fatalf("list pending connection: connections=%#v err=%v", connections, err)
	}

	membership, err := RedeemCode(ctx, db, captainActor, issued1.Code, "redeem-test-0001", "corr-redeem-test-0001")
	if err != nil {
		t.Fatalf("redeem first code: %v", err)
	}
	if membership.Status != "active" || membership.StoreName != "متجر اختبار المرحلة 30" || membership.Version != 2 {
		t.Fatalf("unexpected redeemed membership: %#v", membership)
	}
	replayed, err := RedeemCode(ctx, db, captainActor, issued1.Code, "redeem-test-0001", "corr-redeem-test-0001")
	if err != nil || replayed != membership {
		t.Fatalf("same-key redemption replay must return the canonical membership: replay=%#v original=%#v err=%v", replayed, membership, err)
	}
	if _, err := RedeemCode(ctx, db, captainActor, issued1.Code, "redeem-test-other", "corr-redeem-other"); !errors.Is(err, ErrAlreadyBound) {
		t.Fatalf("same code with a different idempotency key must not replay, got %v", err)
	}

	memberships, err := ListCaptainMemberships(ctx, db, captainActor)
	if err != nil || len(memberships) != 1 || memberships[0].TeamMemberID != member1 {
		t.Fatalf("list captain memberships: memberships=%#v err=%v", memberships, err)
	}

	issued2, err := IssueCode(ctx, db, storeID, member2, partnerActor, time.Hour, "issue-member-2", "corr-member-2")
	if err != nil {
		t.Fatalf("issue second code: %v", err)
	}
	if _, err := RedeemCode(ctx, db, captainActor, issued2.Code, "redeem-test-0002", "corr-redeem-test-0002"); !errors.Is(err, ErrAlreadyBound) {
		t.Fatalf("expected duplicate captain binding in one store to fail closed, got %v", err)
	}

	secondStoreIssued, err := IssueCode(ctx, db, secondStoreID, secondStoreMember, partnerActor, time.Hour, "issue-second-store", "corr-second-store")
	if err != nil {
		t.Fatalf("issue second-store code: %v", err)
	}
	secondStoreMembership, err := RedeemCode(ctx, db, captainActor, secondStoreIssued.Code, "redeem-test-0003", "corr-redeem-test-0003")
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

	disconnected, err := DisconnectCaptainMembership(ctx, db, captainActor, storeID, member1, membership.Version, "disconnect-member-1", "corr-disconnect-member-1")
	if err != nil {
		t.Fatalf("disconnect first membership: %v", err)
	}
	if disconnected.Status != "suspended" || disconnected.Version != membership.Version+1 {
		t.Fatalf("unexpected disconnected membership: %#v", disconnected)
	}
	replayedDisconnect, err := DisconnectCaptainMembership(ctx, db, captainActor, storeID, member1, membership.Version, "disconnect-member-1", "corr-disconnect-member-1")
	if err != nil || replayedDisconnect != disconnected {
		t.Fatalf("same-key disconnect replay must return the canonical membership: replay=%#v original=%#v err=%v", replayedDisconnect, disconnected, err)
	}
	secondDisconnected, err := DisconnectCaptainMembership(
		ctx,
		db,
		captainActor,
		secondStoreID,
		secondStoreMember,
		secondStoreMembership.Version, "disconnect-member-2", "corr-disconnect-member-2",
	)
	if err != nil {
		t.Fatalf("disconnect second-store membership: %v", err)
	}
	if secondDisconnected.Status != "suspended" || secondDisconnected.Version != secondStoreMembership.Version+1 {
		t.Fatalf("unexpected second-store disconnect: %#v", secondDisconnected)
	}
	memberships, err = ListCaptainMemberships(ctx, db, captainActor)
	if err != nil || len(memberships) != 2 {
		t.Fatalf("captain readback must retain both suspended lifecycle records: memberships=%#v err=%v", memberships, err)
	}
	for _, listed := range memberships {
		if listed.Status != "suspended" {
			t.Fatalf("captain readback returned a non-suspended disconnected membership: %#v", listed)
		}
	}
	var disconnectedLifecycle string
	if err := db.QueryRowContext(ctx, `
		SELECT status
		FROM dsh_captain_memberships
		WHERE id = $1`, member1).Scan(&disconnectedLifecycle); err != nil {
		t.Fatal(err)
	}
	if disconnectedLifecycle != "suspended" {
		t.Fatalf("expected suspended lifecycle, got %s", disconnectedLifecycle)
	}

	revoked, err := RevokeCode(ctx, db, storeID, issued2.Connection.ID, partnerActor, issued2.Connection.Version, "revoke-member-2", "corr-revoke-member-2")
	if err != nil {
		t.Fatalf("revoke pending code: %v", err)
	}
	if revoked.Status != "revoked" || revoked.Version != issued2.Connection.Version+1 {
		t.Fatalf("unexpected revoked connection: %#v", revoked)
	}
	replayedRevoke, err := RevokeCode(ctx, db, storeID, issued2.Connection.ID, partnerActor, issued2.Connection.Version, "revoke-member-2", "corr-revoke-member-2")
	if err != nil || replayedRevoke != revoked {
		t.Fatalf("same-key revoke replay must return the canonical connection: replay=%#v original=%#v err=%v", replayedRevoke, revoked, err)
	}
	if _, err := RevokeCode(ctx, db, storeID, issued2.Connection.ID, partnerActor, issued2.Connection.Version, "revoke-member-2-stale", "corr-revoke-member-2-stale"); !errors.Is(err, ErrVersionConflict) {
		t.Fatalf("expected stale revoke to fail with version conflict, got %v", err)
	}

	expiredPlain := "EXPIRED99" + suffix
	_, err = db.ExecContext(ctx, `
		INSERT INTO dsh_partner_courier_connection_codes
			(store_id, team_member_id, code_hash, code_last4, expires_at, created_by_actor_id)
		VALUES ($1, $2, $3, 'ED99', NOW() - INTERVAL '1 minute', $4)`,
		storeID, member3, hashCode(expiredPlain), partnerActor)
	if err != nil {
		t.Fatalf("insert expired code: %v", err)
	}
	connections, err = ListStoreConnections(ctx, db, storeID)
	if err != nil {
		t.Fatalf("list must durably expire stale codes: %v", err)
	}
	var listedExpired bool
	for _, connection := range connections {
		if connection.TeamMemberID == member3 {
			listedExpired = connection.Status == "expired"
		}
	}
	if !listedExpired {
		t.Fatal("list must return the canonical expired state")
	}
	if _, err := RedeemCode(ctx, db, otherCaptain, expiredPlain, "redeem-test-0004", "corr-redeem-test-0004"); !errors.Is(err, ErrExpired) {
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

	if _, err := IssueCode(ctx, db, inactiveStoreID, inactiveMember, partnerActor, time.Hour, "issue-inactive", "corr-issue-inactive"); !errors.Is(err, ErrStoreIneligible) {
		t.Fatalf("expected inactive store to fail closed, got %v", err)
	}

	for _, action := range []string{
		"issue_captain_connection_code",
		"redeem_captain_connection_code",
		"captain_disconnect",
		"revoke_captain_connection_code",
		"expire_captain_connection_code",
	} {
		var count int
		if err := db.QueryRowContext(ctx, `
			SELECT COUNT(*)
		FROM dsh_captain_membership_history h
		JOIN dsh_captain_memberships m ON m.id = h.membership_id
		WHERE m.store_id IN ($1,$2)
		  AND action_label = $3`, storeID, secondStoreID, action).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count == 0 {
			t.Fatalf("expected audit action %s", action)
		}
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
	if notificationCount < 13 {
		t.Fatalf("expected complete partner/captain lifecycle notifications, got %d", notificationCount)
	}

	var partnerDisconnectNotifications int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM dsh_notifications
		WHERE actor_id = $1
		  AND actor_type = 'partner'
		  AND title = 'فك الكابتن عضوية أسطول المتجر'`, partnerActor).Scan(&partnerDisconnectNotifications); err != nil {
		t.Fatal(err)
	}
	if partnerDisconnectNotifications != 2 {
		t.Fatalf("expected partner notification for both disconnected memberships, got %d", partnerDisconnectNotifications)
	}
}
