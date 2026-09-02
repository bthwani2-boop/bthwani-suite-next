package centralcatalog

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
)

// collectIDs drains a single-column result set before the transaction issues
// another statement on its single database connection.
func collectIDs(rows *sql.Rows, err error) ([]string, error) {
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// TransitionProposalAtomicExpected performs the version check after acquiring
// the proposal row lock and keeps every governed side effect, the proposal
// mutation, and its audit record inside the same database transaction.
func TransitionProposalAtomicExpected(
	ctx context.Context,
	db *sql.DB,
	actorID, actorRole, id string,
	input ProposalTransitionOCCInput,
) (ProductProposal, error) {
	if err := validateExpectedVersion(input.ExpectedVersion); err != nil {
		return ProductProposal{}, err
	}
	if !validProposalStatus[input.NextStatus] {
		return ProductProposal{}, fmt.Errorf("%w: invalid nextStatus", ErrInvalid)
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return ProductProposal{}, err
	}
	defer func() { _ = tx.Rollback() }()

	proposal, err := scanProposal(tx.QueryRowContext(ctx,
		`SELECT `+proposalColumns+` FROM dsh_product_proposals WHERE id=$1 FOR UPDATE`, id))
	if err != nil {
		return ProductProposal{}, err
	}
	if proposal.Version != *input.ExpectedVersion {
		return ProductProposal{}, &ConflictError{
			EntityID: id, ExpectedVersion: input.ExpectedVersion, CurrentVersion: proposal.Version, Message: "version mismatch",
		}
	}

	allowed := false
	switch proposal.Status {
	case "catalog-draft":
		allowed = input.NextStatus == "partner-proposed"
	case "partner-proposed":
		allowed = input.NextStatus == "partner-review" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected"
	case "partner-review":
		allowed = input.NextStatus == "marketing-review" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected"
	case "marketing-review":
		allowed = input.NextStatus == "catalog-adopted" || input.NextStatus == "needs-fix" || input.NextStatus == "rejected"
	case "catalog-adopted":
		allowed = input.NextStatus == "catalog-approved"
	case "catalog-approved":
		allowed = input.NextStatus == "client-visible"
	case "needs-fix":
		allowed = input.NextStatus == "partner-proposed"
	case "rejected":
		allowed = input.NextStatus == "partner-proposed" || input.NextStatus == "partner-review"
	}
	if !allowed {
		return ProductProposal{}, fmt.Errorf(
			"%w: transition from %s to %s is not allowed", ErrInvalid, proposal.Status, input.NextStatus,
		)
	}

	categoryNodeID := ""
	if proposal.CategoryNodeID != nil {
		categoryNodeID = *proposal.CategoryNodeID
	}

	var updateQuery string
	var args []any

	switch input.NextStatus {
	case "partner-review":
		policy, policyErr := ResolveEffectivePolicy(ctx, tx, proposal.DomainID, categoryNodeID)
		if policyErr != nil {
			return ProductProposal{}, policyErr
		}
		if !policy.AllowsProductProposal {
			return ProductProposal{}, fmt.Errorf("%w: product proposal not allowed for this category", ErrForbidden)
		}
		if policy.RequiresBarcode && (proposal.Barcode == nil || *proposal.Barcode == "") {
			return ProductProposal{}, fmt.Errorf("%w: barcode is required for this category", ErrInvalid)
		}

		if proposal.Barcode != nil && *proposal.Barcode != "" {
			barcodeMatches, collectErr := collectIDs(tx.QueryContext(ctx,
				`SELECT id FROM dsh_master_products WHERE barcode=$1`, *proposal.Barcode))
			if collectErr != nil {
				return ProductProposal{}, collectErr
			}
			for _, masterProductID := range barcodeMatches {
				_, insertErr := tx.ExecContext(ctx, `INSERT INTO dsh_product_duplicate_candidates
					(id, proposal_id, candidate_master_product_id, reason, score, status)
					VALUES ($1,$2,$3,'barcode match',1.0,'pending') ON CONFLICT (proposal_id, candidate_master_product_id) DO NOTHING`,
					entityID("dup-candidate"), id, masterProductID)
				if insertErr != nil {
					return ProductProposal{}, insertErr
				}
			}
		}
		if proposal.CategoryNodeID != nil {
			nameMatches, collectErr := collectIDs(tx.QueryContext(ctx,
				`SELECT id FROM dsh_master_products
				 WHERE category_node_id=$1 AND LOWER(canonical_name_ar)=LOWER($2)`,
				*proposal.CategoryNodeID, proposal.ProposedNameAr))
			if collectErr != nil {
				return ProductProposal{}, collectErr
			}
			for _, masterProductID := range nameMatches {
				_, insertErr := tx.ExecContext(ctx, `INSERT INTO dsh_product_duplicate_candidates
					(id, proposal_id, candidate_master_product_id, reason, score, status)
					VALUES ($1,$2,$3,'exact name match in category',0.9,'pending') ON CONFLICT (proposal_id, candidate_master_product_id) DO NOTHING`,
					entityID("dup-candidate"), id, masterProductID)
				if insertErr != nil {
					return ProductProposal{}, insertErr
				}
			}
		}
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='partner-review', partner_reviewed_by=$3,
			updated_at=now(), version=version+1 WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "marketing-review":
		policy, policyErr := ResolveEffectivePolicy(ctx, tx, proposal.DomainID, categoryNodeID)
		if policyErr != nil {
			return ProductProposal{}, policyErr
		}
		if policy.RequiresProductImage {
			var hasImage bool
			checkErr := tx.QueryRowContext(ctx, `SELECT EXISTS(
				SELECT 1 FROM dsh_catalog_asset_links
				WHERE entity_type='product_proposal' AND entity_id=$1
				  AND role='canonical_product_image' AND status IN ('approved','pending_review'))`, id).Scan(&hasImage)
			if checkErr != nil {
				return ProductProposal{}, checkErr
			}
			if !hasImage {
				return ProductProposal{}, fmt.Errorf("%w: product image is required by platform policy", ErrForbidden)
			}
		}
		if policy.RequiresBrand && proposal.Brand == "" {
			return ProductProposal{}, fmt.Errorf("%w: brand is required for this category", ErrInvalid)
		}
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='marketing-review', marketing_reviewed_by=$3,
			updated_at=now(), version=version+1 WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "catalog-adopted":
		adoptedID := input.AdoptedMasterProductID
		var acceptedDuplicateID string
		duplicateErr := tx.QueryRowContext(ctx, `SELECT candidate_master_product_id
			FROM dsh_product_duplicate_candidates
			WHERE proposal_id=$1 AND status='accepted_existing' LIMIT 1`, id).Scan(&acceptedDuplicateID)
		if duplicateErr == nil {
			adoptedID = &acceptedDuplicateID
		} else if !errors.Is(duplicateErr, sql.ErrNoRows) {
			return ProductProposal{}, duplicateErr
		}

		if (input.CreateMasterProduct != nil && *input.CreateMasterProduct) ||
			(adoptedID == nil && input.AdoptedMasterProductID == nil) {
			if proposal.Barcode != nil && *proposal.Barcode != "" && adoptedID == nil {
				var existingID string
				existingErr := tx.QueryRowContext(ctx,
					`SELECT id FROM dsh_master_products WHERE barcode=$1 LIMIT 1`, *proposal.Barcode).Scan(&existingID)
				if existingErr == nil {
					adoptedID = &existingID
				} else if !errors.Is(existingErr, sql.ErrNoRows) {
					return ProductProposal{}, existingErr
				}
			}
			if adoptedID == nil {
				masterProductID := entityID("mp")
				_, insertErr := tx.ExecContext(ctx, `INSERT INTO dsh_master_products
					(id, domain_id, category_node_id, canonical_name_ar, canonical_name_en, brand, barcode,
					 approval_status, created_source)
					VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_review',$8)`,
					masterProductID, proposal.DomainID, proposal.CategoryNodeID, proposal.ProposedNameAr,
					proposal.ProposedNameEn, proposal.Brand, proposal.Barcode,
					"product-proposal:"+proposal.SourceSurface)
				if insertErr != nil {
					return ProductProposal{}, insertErr
				}
				adoptedID = &masterProductID
			}
		}
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='catalog-adopted', catalog_adopted_by=$3,
			adopted_master_product_id=$4, updated_at=now(), version=version+1 WHERE id=$5`
		args = []any{input.NextStatus, input.Note, actorID, adoptedID, id}

	case "catalog-approved":
		if proposal.AdoptedMasterProductID != nil {
			var updateErr error
			if input.MergeData != nil && *input.MergeData {
				_, updateErr = tx.ExecContext(ctx, `UPDATE dsh_master_products SET
					canonical_name_ar = COALESCE(NULLIF($1, ''), canonical_name_ar),
					canonical_name_en = COALESCE(NULLIF($2, ''), canonical_name_en),
					brand = COALESCE(NULLIF($3, ''), brand),
					barcode = COALESCE(NULLIF($4, ''), barcode),
					approval_status='approved', is_active=true, updated_at=now(), version=version+1 WHERE id=$5`,
					proposal.ProposedNameAr, proposal.ProposedNameEn, proposal.Brand, proposal.Barcode,
					*proposal.AdoptedMasterProductID)
				if updateErr == nil {
					// Reassign media links
					if _, updateErr = tx.ExecContext(ctx,
						`UPDATE dsh_catalog_asset_links SET entity_id=$1 WHERE entity_type='product_proposal' AND entity_id=$2`,
						*proposal.AdoptedMasterProductID, id); updateErr != nil {
						return ProductProposal{}, updateErr
					}
					// Migrate any store assortments that still reference the proposal's
					// implicit "old" product entity — migrate only if a new master was chosen.
					if _, updateErr = tx.ExecContext(ctx, `UPDATE dsh_store_assortments SET
						master_product_id=$1, updated_at=NOW(), version=version+1
						WHERE master_product_id IN (
							SELECT DISTINCT target_master_product_id FROM dsh_product_proposals WHERE id=$2
						)
						AND NOT EXISTS (
							SELECT 1 FROM dsh_store_assortments sa2
							WHERE sa2.store_id=dsh_store_assortments.store_id
							  AND sa2.master_product_id=$1
						)`,
						*proposal.AdoptedMasterProductID, id); updateErr != nil {
						return ProductProposal{}, updateErr
					}
				}
			} else {
				_, updateErr = tx.ExecContext(ctx, `UPDATE dsh_master_products SET
					approval_status='approved', is_active=true, updated_at=now(), version=version+1 WHERE id=$1`,
					*proposal.AdoptedMasterProductID)
			}
			if updateErr != nil {
				return ProductProposal{}, updateErr
			}
			if proposal.SourceStoreID != nil {
				assortmentID := entityID("assort")
				_, insertErr := tx.ExecContext(ctx, `INSERT INTO dsh_store_assortments
					(id, store_id, master_product_id, publication_status, submitted_by)
					VALUES ($1,$2,$3,'approved',$4)
					ON CONFLICT (store_id, master_product_id) DO NOTHING`,
					assortmentID, *proposal.SourceStoreID, *proposal.AdoptedMasterProductID, actorID)
				if insertErr != nil {
					return ProductProposal{}, insertErr
				}
			}
		}
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='catalog-approved', catalog_approved_by=$3,
			updated_at=now(), version=version+1 WHERE id=$4`
		args = []any{input.NextStatus, input.Note, actorID, id}

	case "client-visible":
		if proposal.AdoptedMasterProductID == nil || proposal.SourceStoreID == nil {
			return ProductProposal{}, fmt.Errorf(
				"%w: cannot transition to client-visible without approved product and store association", ErrInvalid,
			)
		}
		var masterApproved, masterActive bool
		masterErr := tx.QueryRowContext(ctx, `SELECT (approval_status='approved'), is_active
			FROM dsh_master_products WHERE id=$1`, *proposal.AdoptedMasterProductID).Scan(&masterApproved, &masterActive)
		if masterErr != nil {
			return ProductProposal{}, masterErr
		}
		if !masterApproved || !masterActive {
			return ProductProposal{}, fmt.Errorf("%w: master product must be approved and active", ErrForbidden)
		}
		var domainActive, domainVisible bool
		domainErr := tx.QueryRowContext(ctx, `SELECT is_active, is_client_visible
			FROM dsh_catalog_domains WHERE id=$1`, proposal.DomainID).Scan(&domainActive, &domainVisible)
		if domainErr != nil {
			return ProductProposal{}, domainErr
		}
		if !domainActive || !domainVisible {
			return ProductProposal{}, fmt.Errorf("%w: domain must be active and client visible", ErrForbidden)
		}
		if proposal.CategoryNodeID == nil {
			return ProductProposal{}, fmt.Errorf("%w: category node is required for client visibility", ErrInvalid)
		}
		var nodeActive, nodeVisible bool
		nodeErr := tx.QueryRowContext(ctx, `SELECT is_active, is_client_visible
			FROM dsh_catalog_nodes WHERE id=$1`, *proposal.CategoryNodeID).Scan(&nodeActive, &nodeVisible)
		if nodeErr != nil {
			return ProductProposal{}, nodeErr
		}
		if !nodeActive || !nodeVisible {
			return ProductProposal{}, fmt.Errorf("%w: category node must be active and client visible", ErrForbidden)
		}
		var storePublished, storeVisible bool
		storeErr := tx.QueryRowContext(ctx, `SELECT (status = 'published'), is_visible
			FROM dsh_stores WHERE id=$1`, *proposal.SourceStoreID).Scan(&storePublished, &storeVisible)
		if storeErr != nil {
			return ProductProposal{}, storeErr
		}
		if !storePublished || !storeVisible {
			return ProductProposal{}, fmt.Errorf("%w: store must be active and visible", ErrForbidden)
		}
		if _, assortmentErr := validateProposalClientVisibilityTruth(
			ctx,
			tx,
			*proposal.SourceStoreID,
			*proposal.AdoptedMasterProductID,
		); assortmentErr != nil {
			return ProductProposal{}, assortmentErr
		}
		policy, policyErr := ResolveEffectivePolicy(ctx, tx, proposal.DomainID, categoryNodeID)
		if policyErr != nil {
			return ProductProposal{}, policyErr
		}
		if policy.RequiresProductImage {
			var hasApprovedImage bool
			imageErr := tx.QueryRowContext(ctx, `SELECT EXISTS(
				SELECT 1 FROM dsh_catalog_asset_links
				WHERE entity_type='master_product' AND entity_id=$1
				  AND role='canonical_product_image' AND status='approved')`,
				*proposal.AdoptedMasterProductID).Scan(&hasApprovedImage)
			if imageErr != nil {
				return ProductProposal{}, imageErr
			}
			if !hasApprovedImage {
				imageErr = tx.QueryRowContext(ctx, `SELECT EXISTS(
					SELECT 1 FROM dsh_catalog_asset_links
					WHERE entity_type='product_proposal' AND entity_id=$1
					  AND role='canonical_product_image' AND status='approved')`, id).Scan(&hasApprovedImage)
				if imageErr != nil {
					return ProductProposal{}, imageErr
				}
			}
			if !hasApprovedImage {
				return ProductProposal{}, fmt.Errorf(
					"%w: client visibility requires approved product image", ErrForbidden,
				)
			}
		}
		_, assortmentUpdateErr := tx.ExecContext(ctx, `UPDATE dsh_store_assortments SET
			publication_status='client_visible', approved_by=$1, updated_at=now(), version=version+1
			WHERE store_id=$2 AND master_product_id=$3`, actorID, *proposal.SourceStoreID, *proposal.AdoptedMasterProductID)
		if assortmentUpdateErr != nil {
			return ProductProposal{}, assortmentUpdateErr
		}
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='client-visible', client_visible_at=now(),
			updated_at=now(), version=version+1 WHERE id=$3`
		args = []any{input.NextStatus, input.Note, id}

	case "needs-fix":
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, review_stage='needs-fix', blocked_reason=$3,
			resubmission_count=resubmission_count+1, updated_at=now(), version=version+1 WHERE id=$4`
		args = []any{input.NextStatus, input.Note, input.Note, id}

	default:
		updateQuery = `UPDATE dsh_product_proposals SET
			status=$1, review_note=$2, updated_at=now(), version=version+1 WHERE id=$3`
		args = []any{input.NextStatus, input.Note, id}
	}

	result, err := tx.ExecContext(ctx, updateQuery, args...)
	if err != nil {
		return ProductProposal{}, err
	}
	if affected, affectedErr := result.RowsAffected(); affectedErr != nil {
		return ProductProposal{}, affectedErr
	} else if affected != 1 {
		return ProductProposal{}, NewConflictError(tx, ctx, "dsh_product_proposals", id, input.ExpectedVersion)
	}

	auditPayload, err := json.Marshal(map[string]any{
		"nextStatus":      input.NextStatus,
		"expectedVersion": *input.ExpectedVersion,
	})
	if err != nil {
		return ProductProposal{}, err
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO dsh_product_proposal_audit
		(id, proposal_id, from_status, to_status, actor_id, actor_role, note, payload_json)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
		entityID("proposal-audit"), id, proposal.Status, input.NextStatus,
		actorID, actorRole, input.Note, auditPayload)
	if err != nil {
		return ProductProposal{}, err
	}

	updated, err := scanProposal(tx.QueryRowContext(ctx,
		`SELECT `+proposalColumns+` FROM dsh_product_proposals WHERE id=$1`, id))
	if err != nil {
		return ProductProposal{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProductProposal{}, err
	}
	return updated, nil
}
