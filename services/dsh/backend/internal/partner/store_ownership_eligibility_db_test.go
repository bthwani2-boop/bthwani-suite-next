package partner

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"dsh-api/internal/store"
)

func TestGovernedStoreTransferRejectsClosedPartnerStatesDBIntegration(t *testing.T) {
	db := openRequiredDB(t)
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	operatorContextID := "operator-context-j024-" + suffix

	create := func(label string, phoneSuffix string) Partner {
		t.Helper()
		p, err := CreatePartnerForOperatorContext(db, operatorContextID, CreatePartnerInput{
			LegalNameAr:         "Ø´Ø±ÙŠÙƒ Ù…Ù„ÙƒÙŠØ© " + label + " " + suffix,
			LegalNameEn:         "J024 ownership " + label + " " + suffix,
			DisplayName:         "J024 " + label + " " + suffix,
			LegalIdentityType:   "commercial_register",
			LegalIdentityNumber: "J024-" + label + "-" + suffix,
			PrimaryPhone:        "+9677" + suffix[len(suffix)-7:] + phoneSuffix,
			Category:            "restaurant",
			CreatedByActorID:    "field-j024-" + label + "-" + suffix,
			CreatedBySurface:    "app-field",
		})
		if err != nil {
			t.Fatal(err)
		}
		return p
	}

	source := create("source", "1")
	target := create("target", "2")
	sourceStores, err := store.ListStoresByPartnerIDContext(context.Background(), db, source.ID)
	if err != nil || len(sourceStores) != 1 {
		t.Fatalf("load source store: rows=%d err=%v", len(sourceStores), err)
	}
	sourceStore := &sourceStores[0]
	originalVersion := sourceStore.Version

	for _, status := range []ActivationStatus{StatusOpsRejected, StatusPartnerSuspended, StatusPartnerTerminated} {
		if _, err := db.Exec(`
			UPDATE dsh_partners
			SET activation_status = $2, version = version + 1
			WHERE id = $1`, target.ID, status); err != nil {
			t.Fatal(err)
		}

		_, err = LinkPartnerStoreForOperatorContextGoverned(
			db,
			operatorContextID,
			target.ID,
			"operator-j024-reviewer",
			"correlation-j024-"+string(status)+"-"+suffix,
			GovernedStoreLinkInput{
				StoreID:              sourceStore.ID,
				Reason:               "governed ownership transfer attempt",
				ExpectedStoreVersion: originalVersion,
			},
		)
		if !errors.Is(err, ErrPartnerCannotOwnStore) {
			t.Fatalf("target status %s transfer error = %v, want ErrPartnerCannotOwnStore", status, err)
		}

		var ownerID string
		var version int
		if err := db.QueryRow(`SELECT partner_id, version FROM dsh_stores WHERE id = $1`, sourceStore.ID).Scan(&ownerID, &version); err != nil {
			t.Fatal(err)
		}
		if ownerID != source.ID || version != originalVersion {
			t.Fatalf("rejected transfer mutated store: owner=%s version=%d", ownerID, version)
		}
	}

	if _, err := db.Exec(`UPDATE dsh_partners SET activation_status = $2, version = version + 1 WHERE id = $1`, target.ID, StatusDraft); err != nil {
		t.Fatal(err)
	}
	firstCorrelation := "correlation-j024-transfer-" + suffix
	stores, err := LinkPartnerStoreForOperatorContextGoverned(
		db,
		operatorContextID,
		target.ID,
		"operator-j024-reviewer",
		firstCorrelation,
		GovernedStoreLinkInput{
			StoreID:              sourceStore.ID,
			Reason:               "governed ownership transfer replay proof",
			ExpectedStoreVersion: originalVersion,
		},
	)
	if err != nil || len(stores) == 0 {
		t.Fatalf("governed ownership transfer failed: stores=%d err=%v", len(stores), err)
	}
	if _, err := LinkPartnerStoreForOperatorContextGoverned(
		db,
		operatorContextID,
		target.ID,
		"operator-j024-reviewer",
		"correlation-j024-retry-"+suffix,
		GovernedStoreLinkInput{
			StoreID:              sourceStore.ID,
			Reason:               "governed ownership transfer replay proof",
			ExpectedStoreVersion: originalVersion,
		},
	); err != nil {
		t.Fatalf("governed ownership replay failed: %v", err)
	}

	var auditCount, sourceEventCount, targetEventCount int
	var recordedCorrelation string
	if err := db.QueryRow(`
		SELECT COUNT(*), COALESCE(MAX(correlation_id), '')
		FROM dsh_partner_store_transfer_audit
		WHERE operator_context_id=$1 AND store_id=$2 AND to_partner_id=$3`,
		operatorContextID, sourceStore.ID, target.ID).Scan(&auditCount, &recordedCorrelation); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partner_activation_events WHERE partner_id=$1 AND to_status=$2`, source.ID, "store_transferred_out:"+sourceStore.ID).Scan(&sourceEventCount); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partner_activation_events WHERE partner_id=$1 AND to_status=$2`, target.ID, "store_linked:"+sourceStore.ID).Scan(&targetEventCount); err != nil {
		t.Fatal(err)
	}
	if auditCount != 1 || recordedCorrelation != firstCorrelation || sourceEventCount != 1 || targetEventCount != 1 {
		t.Fatalf("ownership replay duplicated or replaced canonical evidence: audit=%d correlation=%q sourceEvents=%d targetEvents=%d", auditCount, recordedCorrelation, sourceEventCount, targetEventCount)
	}
}
