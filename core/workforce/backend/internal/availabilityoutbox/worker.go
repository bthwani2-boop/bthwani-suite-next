package availabilityoutbox

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"workforce-api/internal/dshclient"
)

type event struct {
	ID                string
	NoticeID          string
	ActorType         string
	ActorID           string
	NoticeType        string
	StartsAt          time.Time
	EndsAt            time.Time
	Status            string
	Reason            string
	SourceUpdatedAt   time.Time
	AttemptCount      int
}

func claimBatch(ctx context.Context, db *sql.DB, limit int) ([]event, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() //nolint:errcheck
	rows, err := tx.QueryContext(ctx, `SELECT id::text,notice_id::text,actor_type,actor_id,
		notice_type,starts_at,ends_at,status,reason,source_updated_at,attempt_count
		FROM workforce_dsh_availability_outbox
		WHERE delivery_status='pending' AND next_retry_at<=now()
		ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]event, 0)
	for rows.Next() {
		var item event
		if err := rows.Scan(&item.ID, &item.NoticeID, &item.ActorType, &item.ActorID,
			&item.NoticeType, &item.StartsAt, &item.EndsAt, &item.Status, &item.Reason,
			&item.SourceUpdatedAt, &item.AttemptCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, item := range items {
		if _, err := tx.ExecContext(ctx, `UPDATE workforce_dsh_availability_outbox
			SET next_retry_at=now()+interval '2 minutes',updated_at=now()
			WHERE id=$1::uuid`, item.ID); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return items, nil
}

func markSent(ctx context.Context, db *sql.DB, id string) error {
	_, err := db.ExecContext(ctx, `UPDATE workforce_dsh_availability_outbox
		SET delivery_status='sent',last_error='',updated_at=now()
		WHERE id=$1::uuid`, id)
	return err
}

func markFailed(ctx context.Context, db *sql.DB, item event, cause error) error {
	attempt := item.AttemptCount + 1
	seconds := 1 << min(attempt, 10)
	if seconds > 1800 {
		seconds = 1800
	}
	_, err := db.ExecContext(ctx, `UPDATE workforce_dsh_availability_outbox
		SET attempt_count=$2,last_error=$3,
		    next_retry_at=now()+($4::text||' seconds')::interval,updated_at=now()
		WHERE id=$1::uuid`, item.ID, attempt, cause.Error(), seconds)
	return err
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func ProcessOnce(ctx context.Context, db *sql.DB, client *dshclient.Client) error {
	if client == nil || !client.AvailabilityProjectionConfigured() {
		return fmt.Errorf("DSH availability projection client is not configured")
	}
	items, err := claimBatch(ctx, db, 20)
	if err != nil {
		return err
	}
	for _, item := range items {
		callCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
		err := client.SyncAvailabilityProjection(callCtx, dshclient.AvailabilityProjectionInput{
			NoticeID: item.NoticeID, ActorType: item.ActorType, ActorID: item.ActorID,
			NoticeType: item.NoticeType, StartsAt: item.StartsAt, EndsAt: item.EndsAt,
			Status: item.Status, Reason: item.Reason, SourceUpdatedAt: item.SourceUpdatedAt,
		})
		cancel()
		if err != nil {
			if markErr := markFailed(ctx, db, item, err); markErr != nil {
				log.Printf("[workforce-availability-outbox] failed to persist retry for %s: %v", item.NoticeID, markErr)
			}
			continue
		}
		if err := markSent(ctx, db, item.ID); err != nil {
			log.Printf("[workforce-availability-outbox] failed to mark %s sent: %v", item.NoticeID, err)
		}
	}
	return nil
}

func RunWorker(ctx context.Context, db *sql.DB, client *dshclient.Client, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := ProcessOnce(ctx, db, client); err != nil {
				log.Printf("[workforce-availability-outbox] %v", err)
			}
		}
	}
}
