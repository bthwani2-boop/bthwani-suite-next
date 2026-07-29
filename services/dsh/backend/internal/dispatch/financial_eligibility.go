package dispatch

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type CaptainWalletReadback struct {
	WalletID                   string
	WalletStatus               string
	AvailableBalanceMinorUnits int64
	Currency                   string
	SnapshotReference          string
}

type DispatchBalanceRequirement struct {
	Enabled                          bool
	RequirePositiveBalance           bool
	MinimumDispatchBalanceMinorUnits int64
	Currency                         string
	SnapshotTTLSeconds               int
}

type CaptainFinancialEligibilitySnapshot struct {
	OperatorContextID                         string    `json:"operatorContextId"`
	CaptainID                        string    `json:"captainId"`
	WalletID                         string    `json:"walletId"`
	WalletStatus                     string    `json:"walletStatus"`
	AvailableBalanceMinorUnits       int64     `json:"availableBalanceMinorUnits"`
	MinimumDispatchBalanceMinorUnits int64     `json:"minimumDispatchBalanceMinorUnits"`
	Currency                         string    `json:"currency"`
	Eligible                         bool      `json:"eligible"`
	IneligibilityReason              string    `json:"ineligibilityReason,omitempty"`
	SnapshotReference                string    `json:"snapshotReference"`
	CheckedAt                        time.Time `json:"checkedAt"`
	ExpiresAt                        time.Time `json:"expiresAt"`
}

func effectiveDispatchMinimum(requirement DispatchBalanceRequirement) int64 {
	minimum := requirement.MinimumDispatchBalanceMinorUnits
	if requirement.RequirePositiveBalance && minimum < 1 {
		return 1
	}
	return minimum
}

func EvaluateCaptainFinancialEligibility(
	requirement DispatchBalanceRequirement,
	wallet CaptainWalletReadback,
) (bool, string, int64) {
	minimum := effectiveDispatchMinimum(requirement)
	if strings.TrimSpace(wallet.WalletStatus) != "active" {
		return false, "CAPTAIN_WALLET_NOT_ACTIVE", minimum
	}
	if !requirement.Enabled {
		return true, "", minimum
	}
	if strings.ToUpper(strings.TrimSpace(wallet.Currency)) != strings.ToUpper(strings.TrimSpace(requirement.Currency)) {
		return false, "CAPTAIN_WALLET_CURRENCY_MISMATCH", minimum
	}
	if wallet.AvailableBalanceMinorUnits < minimum {
		return false, "CAPTAIN_FINANCIAL_GUARANTEE_BELOW_MINIMUM", minimum
	}
	return true, "", minimum
}

func UpsertCaptainFinancialEligibilitySnapshot(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	captainID string,
	requirement DispatchBalanceRequirement,
	wallet CaptainWalletReadback,
) (CaptainFinancialEligibilitySnapshot, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	captainID = strings.TrimSpace(captainID)
	wallet.WalletID = strings.TrimSpace(wallet.WalletID)
	wallet.WalletStatus = strings.TrimSpace(wallet.WalletStatus)
	wallet.Currency = strings.ToUpper(strings.TrimSpace(wallet.Currency))
	wallet.SnapshotReference = strings.TrimSpace(wallet.SnapshotReference)
	requirement.Currency = strings.ToUpper(strings.TrimSpace(requirement.Currency))
	if operatorContextID == "" || captainID == "" || wallet.WalletID == "" || wallet.SnapshotReference == "" ||
		len(wallet.Currency) != 3 || len(requirement.Currency) != 3 ||
		requirement.MinimumDispatchBalanceMinorUnits < 0 ||
		requirement.SnapshotTTLSeconds < 30 || requirement.SnapshotTTLSeconds > 600 {
		return CaptainFinancialEligibilitySnapshot{}, fmt.Errorf("%w: invalid captain financial eligibility snapshot", ErrInvalid)
	}
	eligible, reason, minimum := EvaluateCaptainFinancialEligibility(requirement, wallet)
	var snapshot CaptainFinancialEligibilitySnapshot
	err := db.QueryRowContext(ctx, `
		INSERT INTO dsh_captain_financial_eligibility(
			tenant_id,captain_id,wallet_id,wallet_status,available_balance_minor_units,
			minimum_dispatch_balance_minor_units,currency,eligible,ineligibility_reason,
			snapshot_reference,checked_at,expires_at
		) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now()+($11*interval '1 second'))
		ON CONFLICT(tenant_id,captain_id) DO UPDATE SET
			wallet_id=excluded.wallet_id,wallet_status=excluded.wallet_status,
			available_balance_minor_units=excluded.available_balance_minor_units,
			minimum_dispatch_balance_minor_units=excluded.minimum_dispatch_balance_minor_units,
			currency=excluded.currency,eligible=excluded.eligible,
			ineligibility_reason=excluded.ineligibility_reason,
			snapshot_reference=excluded.snapshot_reference,checked_at=excluded.checked_at,
			expires_at=excluded.expires_at
		RETURNING tenant_id,captain_id,wallet_id,wallet_status,available_balance_minor_units,
			minimum_dispatch_balance_minor_units,currency,eligible,ineligibility_reason,
			snapshot_reference,checked_at,expires_at`,
		operatorContextID, captainID, wallet.WalletID, wallet.WalletStatus,
		wallet.AvailableBalanceMinorUnits, minimum, wallet.Currency, eligible, reason,
		wallet.SnapshotReference, requirement.SnapshotTTLSeconds,
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WalletID,
		&snapshot.WalletStatus,
		&snapshot.AvailableBalanceMinorUnits,
		&snapshot.MinimumDispatchBalanceMinorUnits,
		&snapshot.Currency,
		&snapshot.Eligible,
		&snapshot.IneligibilityReason,
		&snapshot.SnapshotReference,
		&snapshot.CheckedAt,
		&snapshot.ExpiresAt,
	)
	return snapshot, err
}

func GetCaptainFinancialEligibilitySnapshot(
	ctx context.Context,
	db *sql.DB,
	operatorContextID string,
	captainID string,
) (CaptainFinancialEligibilitySnapshot, error) {
	var snapshot CaptainFinancialEligibilitySnapshot
	err := db.QueryRowContext(ctx, `
		SELECT tenant_id,captain_id,wallet_id,wallet_status,available_balance_minor_units,
			minimum_dispatch_balance_minor_units,currency,eligible,ineligibility_reason,
			snapshot_reference,checked_at,expires_at
		FROM dsh_captain_financial_eligibility
		WHERE tenant_id=$1 AND captain_id=$2`,
		normalizeOperatorContextID(operatorContextID), strings.TrimSpace(captainID),
	).Scan(
		&snapshot.OperatorContextID,
		&snapshot.CaptainID,
		&snapshot.WalletID,
		&snapshot.WalletStatus,
		&snapshot.AvailableBalanceMinorUnits,
		&snapshot.MinimumDispatchBalanceMinorUnits,
		&snapshot.Currency,
		&snapshot.Eligible,
		&snapshot.IneligibilityReason,
		&snapshot.SnapshotReference,
		&snapshot.CheckedAt,
		&snapshot.ExpiresAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return snapshot, ErrCaptainNotEligible
	}
	return snapshot, err
}
