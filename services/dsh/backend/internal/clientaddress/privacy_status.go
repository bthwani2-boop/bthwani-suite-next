package clientaddress

import (
	"context"
	"database/sql"
	"time"
)

type PrivacyQueueStatus struct {
	PolicyEnabled   bool       `json:"policyEnabled"`
	PolicyVersion   int        `json:"policyVersion"`
	RetentionDays   int        `json:"retentionDays"`
	BatchLimit      int        `json:"batchLimit"`
	ScheduledCount  int        `json:"scheduledCount"`
	DueCount        int        `json:"dueCount"`
	AnonymizedCount int        `json:"anonymizedCount"`
	NextPurgeAt     *time.Time `json:"nextPurgeAt"`
	CheckedAt       time.Time  `json:"checkedAt"`
}

func GetPrivacyQueueStatus(ctx context.Context, db *sql.DB) (PrivacyQueueStatus, error) {
	var status PrivacyQueueStatus
	err := db.QueryRowContext(ctx, `
		SELECT
			p.enabled,
			p.version,
			p.retention_days,
			p.batch_limit,
			COUNT(*) FILTER (
				WHERE a.deleted_at IS NOT NULL
				  AND a.pii_anonymized_at IS NULL
				  AND a.pii_purge_after IS NOT NULL
			)::int AS scheduled_count,
			COUNT(*) FILTER (
				WHERE a.deleted_at IS NOT NULL
				  AND a.pii_anonymized_at IS NULL
				  AND a.pii_purge_after IS NOT NULL
				  AND a.pii_purge_after <= NOW()
			)::int AS due_count,
			COUNT(*) FILTER (WHERE a.pii_anonymized_at IS NOT NULL)::int AS anonymized_count,
			MIN(a.pii_purge_after) FILTER (
				WHERE a.deleted_at IS NOT NULL
				  AND a.pii_anonymized_at IS NULL
				  AND a.pii_purge_after IS NOT NULL
			) AS next_purge_at
		FROM dsh_client_address_privacy_policy p
		LEFT JOIN dsh_client_addresses a ON TRUE
		WHERE p.id = 1
		GROUP BY p.enabled, p.version, p.retention_days, p.batch_limit`,
	).Scan(
		&status.PolicyEnabled,
		&status.PolicyVersion,
		&status.RetentionDays,
		&status.BatchLimit,
		&status.ScheduledCount,
		&status.DueCount,
		&status.AnonymizedCount,
		&status.NextPurgeAt,
	)
	if err != nil {
		return PrivacyQueueStatus{}, err
	}
	status.CheckedAt = time.Now().UTC()
	return status, nil
}
