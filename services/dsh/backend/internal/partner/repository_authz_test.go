package partner

import (
	"strconv"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestPartnerScopeAuthorizationDB(t *testing.T) {
	db := openRequiredDB(t)
	suffix := strconv.FormatInt(time.Now().UnixNano(), 10)

	partner1, err := CreatePartner(db, CreatePartnerInput{
		LegalNameAr:         "شريك اختبار أ " + suffix,
		LegalNameEn:         "Partner A " + suffix,
		DisplayName:         "Partner A " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "A-" + suffix,
		OwnerName:           "مالك أ",
		PrimaryPhone:        "+96777100" + suffix[len(suffix)-4:],
		Category:            "restaurant",
		CreatedByActorID:    "field",
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}

	partner2, err := CreatePartner(db, CreatePartnerInput{
		LegalNameAr:         "شريك اختبار ب " + suffix,
		LegalNameEn:         "Partner B " + suffix,
		DisplayName:         "Partner B " + suffix,
		LegalIdentityType:   "commercial_register",
		LegalIdentityNumber: "B-" + suffix,
		OwnerName:           "مالك ب",
		PrimaryPhone:        "+96777200" + suffix[len(suffix)-4:],
		Category:            "grocery",
		CreatedByActorID:    "field",
		CreatedBySurface:    "app-field",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Insert stores
	storeA1 := "store-a1-" + suffix
	storeA2 := "store-a2-" + suffix
	storeB1 := "store-b1-" + suffix

	// We need to bypass the standard store creation if we don't have it here, so let's insert directly
	_, err = db.Exec(`
		INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code, serviceability_status, partner_id)
		VALUES 
		($1, $1, 'Store A1', 'active', 'SAH', 'SAH-CEN', 'serviceable', $4),
		($2, $2, 'Store A2', 'active', 'SAH', 'SAH-CEN', 'serviceable', $4),
		($3, $3, 'Store B1', 'active', 'SAH', 'SAH-CEN', 'serviceable', $5)
	`, storeA1, storeA2, storeB1, partner1.ID, partner2.ID)
	if err != nil {
		t.Fatal(err)
	}

	// Helper to insert a team member
	insertMember := func(storeID, identity, role, status string) {
		_, err := db.Exec(`
			INSERT INTO dsh_store_team_members (store_id, name, identity_actor_id, role, status)
			VALUES ($1, 'Test Member', $2, $3, $4)
		`, storeID, identity, role, status)
		if err != nil {
			t.Fatal(err)
		}
	}

	// 1. Explicit owner sees all explicitly owned stores (must be assigned to both)
	insertMember(storeA1, "actor-owner-a", "owner", "active")
	insertMember(storeA2, "actor-owner-a", "owner", "active")

	// 2. Member of store A cannot see store B
	insertMember(storeA1, "actor-staff-a1", "staff", "active")

	// 3. Member of partner A cannot access partner B
	// Checked inherently since queries filter by partner_id

	// 4, 5, 6. Invited, paused, blocked members receive no operational scope
	insertMember(storeA2, "actor-invited", "staff", "invited")
	insertMember(storeA2, "actor-paused", "staff", "paused")
	insertMember(storeA2, "actor-blocked", "staff", "blocked")

	// Tests
	tests := []struct {
		name       string
		partnerID  string
		actorID    string
		wantStores []string
	}{
		{
			name:       "owner sees all explicitly owned stores",
			partnerID:  partner1.ID,
			actorID:    "actor-owner-a",
			wantStores: []string{storeA1, storeA2},
		},
		{
			name:       "member of store A cannot see store B (storeA2)",
			partnerID:  partner1.ID,
			actorID:    "actor-staff-a1",
			wantStores: []string{storeA1},
		},
		{
			name:       "member of partner A cannot access partner B",
			partnerID:  partner2.ID,
			actorID:    "actor-staff-a1",
			wantStores: []string{},
		},
		{
			name:       "invited member receives no operational scope",
			partnerID:  partner1.ID,
			actorID:    "actor-invited",
			wantStores: []string{},
		},
		{
			name:       "paused member receives no operational scope",
			partnerID:  partner1.ID,
			actorID:    "actor-paused",
			wantStores: []string{},
		},
		{
			name:       "blocked member receives no operational scope",
			partnerID:  partner1.ID,
			actorID:    "actor-blocked",
			wantStores: []string{},
		},
		{
			name:       "unknown actor receives no scope",
			partnerID:  partner1.ID,
			actorID:    "actor-unknown",
			wantStores: []string{},
		},
		{
			name:       "owner permissions are not granted by missing membership",
			partnerID:  partner1.ID,
			actorID:    "actor-unrelated",
			wantStores: []string{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			scopes, err := ListPartnerScopesForActor(db, tc.partnerID, tc.actorID)
			if err != nil {
				t.Fatalf("ListPartnerScopesForActor failed: %v", err)
			}

			if len(scopes) != len(tc.wantStores) {
				t.Fatalf("got %d scopes, want %d", len(scopes), len(tc.wantStores))
			}

			// Verify exact stores returned
			gotStoreMap := make(map[string]bool)
			for _, sc := range scopes {
				gotStoreMap[sc.StoreID] = true
			}
			for _, wantStore := range tc.wantStores {
				if !gotStoreMap[wantStore] {
					t.Errorf("expected store %s in scopes, but it was missing", wantStore)
				}
			}
		})
	}
}
