package partner

import (
	"database/sql"
	"errors"
	"strings"
)

var ErrOpenStoreOperations = errors.New("store has open operational records")

// GovernedStoreLinkInput is the only accepted shape for a transfer. Initial
// assignment of an unowned store remains idempotent; reassignment requires a
// reason and optimistic store version.
type GovernedStoreLinkInput struct {
	StoreID              string `json:"storeId"`
	Reason               string `json:"reason"`
	ExpectedStoreVersion int    `json:"expectedStoreVersion"`
}

// LinkPartnerStoreForOperatorContextGoverned preserves OperatorContext isolation, prevents silent
// ownership replacement, blocks transfer while DSH operations are open, and
// records a durable before/after audit row. A transfer safely unpublishes the
// store so the new owner must pass readiness, catalog and marketing gates again.
func LinkPartnerStoreForOperatorContextGoverned(
	db *sql.DB,
	operatorContextID, partnerID, actorID, correlationID string,
	input GovernedStoreLinkInput,
) ([]PartnerLinkedStore, error) {
	operatorContextID, err := normalizeOperatorContextID(operatorContextID)
	if err != nil {
		return nil, err
	}
	partnerID = strings.TrimSpace(partnerID)
	input.StoreID = strings.TrimSpace(input.StoreID)
	input.Reason = strings.TrimSpace(input.Reason)
	actorID = strings.TrimSpace(actorID)
	if partnerID == "" || input.StoreID == "" || actorID == "" {
		return nil, ErrInvalid
	}
	if err := EnsureOperatorContextPartner(db, operatorContextID, partnerID); err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck

	var currentPartnerID string
	var currentVersion int
	err = tx.QueryRow(`
		SELECT COALESCE(partner_id, ''), version
		FROM dsh_stores
		WHERE id = $1 AND operator_context_id = $2
		FOR UPDATE`, input.StoreID, operatorContextID,
	).Scan(&currentPartnerID, &currentVersion)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if currentPartnerID == partnerID {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return ListPartnerStores(db, partnerID)
	}

	isTransfer := currentPartnerID != ""
	if isTransfer {
		if len(input.Reason) < 5 {
			return nil, ErrStoreOwnershipConflict
		}
		if input.ExpectedStoreVersion <= 0 || input.ExpectedStoreVersion != currentVersion {
			return nil, ErrVersionConflict
		}

		var hasOpenOperations bool
		if err := tx.QueryRow(`
			SELECT EXISTS (
				SELECT 1
				FROM dsh_orders
				WHERE store_id = $1
				  AND status NOT IN ('delivered', 'cancelled')
			)`, input.StoreID,
		).Scan(&hasOpenOperations); err != nil {
			return nil, err
		}
		if hasOpenOperations {
			return nil, ErrOpenStoreOperations
		}

		// The database guard accepts partner replacement only inside this local
		// transaction context. A deferred constraint trigger still requires the
		// exact matching audit row below before COMMIT, so the flag alone cannot
		// produce an untracked ownership change.
		if _, err := tx.Exec(`SELECT set_config('bthwani.governed_store_partner_transfer', 'on', true)`); err != nil {
			return nil, err
		}
	} else {
		if input.ExpectedStoreVersion > 0 && input.ExpectedStoreVersion != currentVersion {
			return nil, ErrVersionConflict
		}
		if input.Reason == "" {
			input.Reason = "initial governed partner ownership assignment"
		}
	}

	result, err := tx.Exec(`
		UPDATE dsh_stores
		SET partner_id = $1,
		    partner_readiness = 'pending',
		    catalog_approval_status = 'draft',
		    marketing_visibility = 'hidden',
		    is_visible = false,
		    version = version + 1,
		    updated_at = NOW()
		WHERE id = $2 AND operator_context_id = $3 AND version = $4`,
		partnerID, input.StoreID, operatorContextID, currentVersion,
	)
	if err != nil {
		return nil, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected != 1 {
		return nil, ErrVersionConflict
	}
	resultingVersion := currentVersion + 1

	_, err = tx.Exec(`
		INSERT INTO dsh_partner_store_transfer_audit (
			operator_context_id, store_id, from_partner_id, to_partner_id,
			actor_id, actor_surface, reason,
			expected_store_version, resulting_store_version, correlation_id
		) VALUES ($1,$2,NULLIF($3,''),$4,$5,'control-panel',$6,$7,$8,$9)`,
		operatorContextID, input.StoreID, currentPartnerID, partnerID, actorID, input.Reason,
		currentVersion, resultingVersion, correlationID,
	)
	if err != nil {
		return nil, err
	}

	if currentPartnerID != "" {
		if err := recordActivationEvent(
			tx, currentPartnerID, "store_transferred_out:"+input.StoreID,
			actorID, "control-panel", input.Reason,
		); err != nil {
			return nil, err
		}
	}
	if err := recordActivationEvent(
		tx, partnerID, "store_linked:"+input.StoreID,
		actorID, "control-panel", input.Reason,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return ListPartnerStores(db, partnerID)
}
