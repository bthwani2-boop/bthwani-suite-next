package dispatch

import (
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
)

func seedCaptainDeliveryProofMedia(
	t *testing.T,
	db *sql.DB,
	captainID string,
	mediaRef string,
	partnerID string,
	storeID string,
	specialRequestID ...string,
) {
	t.Helper()

	createdPartner := false
	if partnerID == "" {
		partnerID = "pod-media-partner-" + uuid.NewString()
		phone := fmt.Sprintf("7%09d", time.Now().UnixNano()%1_000_000_000)
		if _, err := db.Exec(`
			INSERT INTO dsh_partners (id, legal_name_ar, display_name, legal_identity_number, primary_phone)
			VALUES ($1, 'شريك إثبات اختبار', 'Delivery Proof Test Partner', $1, $2)`, partnerID, phone); err != nil {
			t.Fatalf("seed delivery-proof media partner: %v", err)
		}
		createdPartner = true
	}

	storageKey := "tests/delivery-proof/" + uuid.NewString()
	specialRequestIDValue := ""
	if len(specialRequestID) > 0 {
		specialRequestIDValue = specialRequestID[0]
	}
	if _, err := db.Exec(`
		INSERT INTO dsh_media_refs (
			media_ref, storage_key, owner_actor_id, owner_actor_role,
			partner_id, store_id, purpose, content_type, original_filename, special_request_id
		)
		VALUES ($1, $2, $3, 'captain', $4, NULLIF($5, ''), 'delivery_proof', 'image/jpeg', 'proof.jpg', NULLIF($6, '')::uuid)`,
		mediaRef, storageKey, captainID, partnerID, storeID, specialRequestIDValue); err != nil {
		t.Fatalf("seed captain delivery-proof media: %v", err)
	}

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM dsh_media_refs WHERE media_ref = $1`, mediaRef)
		if createdPartner {
			_, _ = db.Exec(`DELETE FROM dsh_partners WHERE id = $1`, partnerID)
		}
	})
}
