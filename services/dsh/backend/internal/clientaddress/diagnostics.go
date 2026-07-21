package clientaddress

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// IntegrityDiagnostics contains aggregate invariant counts only. It is safe for
// operator analytics because it includes no actor or address identifiers.
type IntegrityDiagnostics struct {
	ActiveAddresses             int       `json:"activeAddresses"`
	ClientsWithActiveAddresses  int       `json:"clientsWithActiveAddresses"`
	ClientsWithMultipleDefaults int       `json:"clientsWithMultipleDefaults"`
	ClientsWithoutDefault       int       `json:"clientsWithoutDefault"`
	DuplicateActiveFingerprints int       `json:"duplicateActiveFingerprints"`
	MutationReceipts            int       `json:"mutationReceipts"`
	GeneratedAt                 time.Time `json:"generatedAt"`
}

func scanDiagnosticCount(ctx context.Context, db *sql.DB, query string, destination *int) error {
	if err := db.QueryRowContext(ctx, query).Scan(destination); err != nil {
		return fmt.Errorf("scan client address diagnostic count: %w", err)
	}
	return nil
}

func DiagnoseIntegrity(ctx context.Context, db *sql.DB) (IntegrityDiagnostics, error) {
	var diagnostics IntegrityDiagnostics
	queries := []struct {
		query       string
		destination *int
	}{
		{
			query:       `SELECT count(*) FROM dsh_client_addresses WHERE deleted_at IS NULL`,
			destination: &diagnostics.ActiveAddresses,
		},
		{
			query: `SELECT count(*) FROM (
				SELECT client_id FROM dsh_client_addresses
				WHERE deleted_at IS NULL GROUP BY client_id
			) active_clients`,
			destination: &diagnostics.ClientsWithActiveAddresses,
		},
		{
			query: `SELECT count(*) FROM (
				SELECT client_id FROM dsh_client_addresses
				WHERE deleted_at IS NULL AND is_default = TRUE
				GROUP BY client_id HAVING count(*) > 1
			) multiple_defaults`,
			destination: &diagnostics.ClientsWithMultipleDefaults,
		},
		{
			query: `SELECT count(*) FROM (
				SELECT client_id FROM dsh_client_addresses
				WHERE deleted_at IS NULL
				GROUP BY client_id HAVING bool_or(is_default) = FALSE
			) missing_defaults`,
			destination: &diagnostics.ClientsWithoutDefault,
		},
		{
			query: `SELECT count(*) FROM (
				SELECT client_id, address_fingerprint FROM dsh_client_addresses
				WHERE deleted_at IS NULL
				GROUP BY client_id, address_fingerprint HAVING count(*) > 1
			) duplicate_fingerprints`,
			destination: &diagnostics.DuplicateActiveFingerprints,
		},
		{
			query:       `SELECT count(*) FROM dsh_client_address_mutation_receipts`,
			destination: &diagnostics.MutationReceipts,
		},
	}
	for _, item := range queries {
		if err := scanDiagnosticCount(ctx, db, item.query, item.destination); err != nil {
			return IntegrityDiagnostics{}, err
		}
	}
	diagnostics.GeneratedAt = time.Now().UTC()
	return diagnostics, nil
}
