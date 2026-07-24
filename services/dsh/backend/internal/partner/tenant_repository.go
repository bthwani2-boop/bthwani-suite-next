package partner

import (
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/store"
)

func normalizeTenantID(tenantID string) (string, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return "", ErrTenantContextRequired
	}
	return tenantID, nil
}

// CreatePartnerForTenant is the only production partner creation path. The
// tenant is supplied by the authenticated server-side context, never by JSON.
func CreatePartnerForTenant(db *sql.DB, tenantID string, input CreatePartnerInput) (Partner, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return Partner{}, err
	}
	if err := input.Validate(); err != nil {
		return Partner{}, err
	}

	category := input.Category
	if category == "" {
		category = "default"
	}
	surface := input.CreatedBySurface
	if surface == "" {
		surface = "app-field"
	}

	tx, err := db.Begin()
	if err != nil {
		return Partner{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var p Partner
	err = tx.QueryRow(`
		INSERT INTO dsh_partners (
			tenant_id,
			legal_name_ar, legal_name_en, display_name,
			legal_identity_type, legal_identity_number,
			owner_name, primary_phone, secondary_phone, email,
			category, notes, created_by_actor_id, created_by_surface
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING id, legal_name_ar, legal_name_en, display_name,
		          legal_identity_type, legal_identity_number,
		          owner_name, primary_phone, secondary_phone, email,
		          category, activation_status, created_by_actor_id, created_by_surface,
		          notes,
		          COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
		          COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
		          beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		          payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		          version, created_at, updated_at`,
		tenantID,
		input.LegalNameAr, input.LegalNameEn, input.DisplayName,
		input.LegalIdentityType, input.LegalIdentityNumber,
		input.OwnerName, input.PrimaryPhone, input.SecondaryPhone, input.Email,
		category, input.Notes, input.CreatedByActorID, surface,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.ActivationStatus, &p.CreatedByActorID, &p.CreatedBySurface,
		&p.Notes,
		&p.PayoutDestinationID, &p.MaskedAccountNumber, &p.MaskedIBAN, &p.MaskedMobileNumber,
		&p.BeneficiaryName, &p.BankName, &p.BankBranch, &p.BankAccountNumber, &p.BankIBAN,
		&p.PayoutMobileNumber, &p.SettlementPreference, &p.BankAccountHolderMatchesOwner, &p.BankNotes,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if isPgUniqueViolation(err) {
			return Partner{}, ErrConflict
		}
		return Partner{}, err
	}

	// The first store remains unpublished. The migration trigger derives its
	// tenant from the owning partner, and the explicit update provides a second
	// invariant at the application boundary.
	sRow, err := store.CreateDraftStore(tx, store.CreateDraftStoreInput{
		PartnerID:   p.ID,
		DisplayName: p.DisplayName,
		Category:    p.Category,
	})
	if err != nil {
		return Partner{}, err
	}
	if _, err = tx.Exec(`UPDATE dsh_stores SET tenant_id = $1 WHERE id = $2`, tenantID, sRow.ID); err != nil {
		return Partner{}, err
	}

	if input.CreatedByActorID != "" {
		_, err = tx.Exec(`
			INSERT INTO dsh_store_actor_scopes
				(tenant_id, actor_id, actor_role, store_id, scope_type, active)
			VALUES ($1, $2, 'field', $3, 'assigned', true)
			ON CONFLICT (actor_id, actor_role, store_id) DO UPDATE
			SET tenant_id = EXCLUDED.tenant_id, active = true`,
			tenantID, input.CreatedByActorID, sRow.ID,
		)
		if err != nil {
			return Partner{}, err
		}
	}

	if err := tx.Commit(); err != nil {
		return Partner{}, err
	}
	return p, nil
}

func GetPartnerForTenant(db *sql.DB, tenantID, partnerID string) (Partner, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return Partner{}, err
	}
	var p Partner
	err = db.QueryRow(`
		SELECT id, legal_name_ar, legal_name_en, display_name,
		       legal_identity_type, legal_identity_number,
		       owner_name, primary_phone, secondary_phone, email,
		       category, activation_status, created_by_actor_id, created_by_surface,
		       notes,
		       COALESCE(payout_destination_id,''), COALESCE(masked_account_number,''),
		       COALESCE(masked_iban,''), COALESCE(masked_mobile_number,''),
		       beneficiary_name, bank_name, bank_branch, bank_account_number, bank_iban,
		       payout_mobile_number, settlement_preference, bank_account_holder_matches_owner, bank_notes,
		       version, created_at, updated_at
		FROM dsh_partners
		WHERE id = $1 AND tenant_id = $2`, partnerID, tenantID,
	).Scan(
		&p.ID, &p.LegalNameAr, &p.LegalNameEn, &p.DisplayName,
		&p.LegalIdentityType, &p.LegalIdentityNumber,
		&p.OwnerName, &p.PrimaryPhone, &p.SecondaryPhone, &p.Email,
		&p.Category, &p.ActivationStatus, &p.CreatedByActorID, &p.CreatedBySurface,
		&p.Notes,
		&p.PayoutDestinationID, &p.MaskedAccountNumber, &p.MaskedIBAN, &p.MaskedMobileNumber,
		&p.BeneficiaryName, &p.BankName, &p.BankBranch, &p.BankAccountNumber, &p.BankIBAN,
		&p.PayoutMobileNumber, &p.SettlementPreference, &p.BankAccountHolderMatchesOwner, &p.BankNotes,
		&p.Version, &p.CreatedAt, &p.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return Partner{}, ErrNotFound
	}
	return p, err
}

func ListPartnersForTenant(db *sql.DB, tenantID string, q PartnerListQuery) ([]PartnerSummary, int, error) {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return nil, 0, err
	}
	if q.Limit <= 0 {
		q.Limit = 20
	}
	if q.Limit > 100 {
		q.Limit = 100
	}

	args := []any{tenantID}
	conds := []string{"tenant_id = $1"}
	next := 2
	if q.ActivationStatus != "" {
		conds = append(conds, "activation_status = $"+itoa(next))
		args = append(args, q.ActivationStatus)
		next++
	}
	if q.CreatedByActorID != "" {
		conds = append(conds, "created_by_actor_id = $"+itoa(next))
		args = append(args, q.CreatedByActorID)
		next++
	}
	where := " WHERE " + strings.Join(conds, " AND ")

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM dsh_partners`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, q.Limit, q.Offset)
	rows, err := db.Query(`
		SELECT id, display_name, legal_name_ar, category, activation_status, primary_phone, created_at, updated_at
		FROM dsh_partners`+where+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(next)+` OFFSET $`+itoa(next+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]PartnerSummary, 0)
	for rows.Next() {
		var item PartnerSummary
		if err := rows.Scan(&item.ID, &item.DisplayName, &item.LegalNameAr, &item.Category,
			&item.ActivationStatus, &item.PrimaryPhone, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, item)
	}
	return list, total, rows.Err()
}

// EnsureTenantPartner intentionally maps cross-tenant IDs to ErrNotFound so the
// boundary does not disclose whether another tenant owns the identifier.
func EnsureTenantPartner(db *sql.DB, tenantID, partnerID string) error {
	_, err := GetPartnerForTenant(db, tenantID, partnerID)
	return err
}

func EnsureTenantStore(db *sql.DB, tenantID, storeID string) error {
	tenantID, err := normalizeTenantID(tenantID)
	if err != nil {
		return err
	}
	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM dsh_stores WHERE id = $1 AND tenant_id = $2)`, storeID, tenantID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

func FieldOwnsPartnerForTenant(db *sql.DB, tenantID, partnerID, actorID string) error {
	p, err := GetPartnerForTenant(db, tenantID, partnerID)
	if err != nil {
		return err
	}
	if p.CreatedByActorID != actorID {
		return ErrForbidden
	}
	return nil
}

func LinkPartnerStoreForTenant(db *sql.DB, tenantID, partnerID, storeID, actorID string) ([]PartnerLinkedStore, error) {
	if err := EnsureTenantPartner(db, tenantID, partnerID); err != nil {
		return nil, err
	}
	if err := EnsureTenantStore(db, tenantID, storeID); err != nil {
		return nil, err
	}
	return LinkPartnerStore(db, partnerID, storeID, actorID)
}
