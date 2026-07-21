package partnerwltoutbox

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"time"

	"dsh-api/internal/wlt"
)

const (
	EventDeactivatePayout = "deactivate_payout_destination"
	maxAttempts           = 10
)

type Event struct {
	ID              string
	PartnerID       string
	ActivationEvent string
	EventType       string
	ActorID         string
	CorrelationID   string
	IdempotencyKey  string
	AttemptCount    int
}

type partnerReadback struct {
	PartnerID         string
	PayoutDestination string
	MaskedAccount     string
	MaskedIBAN        string
	MaskedMobile      string
	ActivationStatus  string
}

// RunWorker drains durable partner-to-WLT events and periodically compares DSH
// references with WLT's active masked read model. Reconciliation never copies
// raw payout identifiers into DSH and never auto-overwrites either owner.
func RunWorker(ctx context.Context, db *sql.DB, client *wlt.Client, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	reconciliationTick := 0
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for i := 0; i < 20; i++ {
				processed, err := ProcessNext(ctx, db, client)
				if err != nil {
					log.Printf("[partner-wlt-outbox] process failed: %v", err)
					break
				}
				if !processed {
					break
				}
			}
			reconciliationTick++
			if reconciliationTick >= 20 {
				reconciliationTick = 0
				if err := Reconcile(ctx, db, client); err != nil {
					log.Printf("[partner-wlt-outbox] reconciliation failed: %v", err)
				}
			}
		}
	}
}

func ProcessNext(ctx context.Context, db *sql.DB, client *wlt.Client) (bool, error) {
	event, err := claimNext(ctx, db)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var deliveryErr error
	switch event.EventType {
	case EventDeactivatePayout:
		deliveryErr = client.DeactivatePayoutDestination(
			ctx,
			event.PartnerID,
			event.ActorID,
			event.CorrelationID,
			event.IdempotencyKey,
		)
	default:
		deliveryErr = fmt.Errorf("unsupported partner WLT event type %q", event.EventType)
	}
	if deliveryErr == nil {
		_, err = db.ExecContext(ctx, `
			UPDATE dsh_partner_wlt_outbox
			SET status = 'delivered', delivered_at = now(), last_error = '', updated_at = now()
			WHERE id = $1::uuid`, event.ID)
		return true, err
	}

	status := "retry"
	if event.AttemptCount >= maxAttempts {
		status = "dead_letter"
	}
	backoff := retryDelay(event.AttemptCount)
	_, updateErr := db.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_outbox
		SET status = $2,
		    last_error = left($3, 1000),
		    available_at = now() + ($4 * interval '1 second'),
		    updated_at = now()
		WHERE id = $1::uuid`,
		event.ID, status, deliveryErr.Error(), int(backoff.Seconds()),
	)
	if updateErr != nil {
		return true, fmt.Errorf("record partner WLT retry after %v: %w", deliveryErr, updateErr)
	}
	return true, nil
}

func claimNext(ctx context.Context, db *sql.DB) (Event, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Event{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var event Event
	err = tx.QueryRowContext(ctx, `
		SELECT id::text, partner_id, activation_event_id::text, event_type,
		       actor_id, correlation_id, idempotency_key, attempt_count + 1
		FROM dsh_partner_wlt_outbox
		WHERE status IN ('pending','retry')
		  AND available_at <= now()
		ORDER BY created_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT 1`,
	).Scan(
		&event.ID, &event.PartnerID, &event.ActivationEvent, &event.EventType,
		&event.ActorID, &event.CorrelationID, &event.IdempotencyKey,
		&event.AttemptCount,
	)
	if err != nil {
		return Event{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_outbox
		SET status = 'processing', attempt_count = $2, updated_at = now()
		WHERE id = $1::uuid`, event.ID, event.AttemptCount); err != nil {
		return Event{}, err
	}
	if err := tx.Commit(); err != nil {
		return Event{}, err
	}
	return event, nil
}

func retryDelay(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	seconds := 15 * math.Pow(2, float64(attempt-1))
	if seconds > 3600 {
		seconds = 3600
	}
	return time.Duration(seconds) * time.Second
}

func Reconcile(ctx context.Context, db *sql.DB, client *wlt.Client) error {
	rows, err := db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(payout_destination_id,''),
		       COALESCE(masked_account_number,''),
		       COALESCE(masked_iban,''),
		       COALESCE(masked_mobile_number,''),
		       activation_status
		FROM dsh_partners
		ORDER BY updated_at ASC
		LIMIT 500`)
	if err != nil {
		return err
	}
	defer rows.Close()

	partners := make([]partnerReadback, 0, 100)
	for rows.Next() {
		var partner partnerReadback
		if err := rows.Scan(
			&partner.PartnerID,
			&partner.PayoutDestination,
			&partner.MaskedAccount,
			&partner.MaskedIBAN,
			&partner.MaskedMobile,
			&partner.ActivationStatus,
		); err != nil {
			return err
		}
		partners = append(partners, partner)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for _, partner := range partners {
		ref, readErr := client.GetPayoutDestination(ctx, partner.PartnerID)
		if errors.Is(readErr, wlt.ErrPayoutDestinationNotFound) {
			if partner.PayoutDestination != "" && partner.ActivationStatus != "partner_deactivated" {
				if err := upsertCase(ctx, db, partner, "wlt_destination_missing", nil); err != nil {
					return err
				}
			} else if err := resolvePartnerCases(ctx, db, partner.PartnerID); err != nil {
				return err
			}
			continue
		}
		if readErr != nil {
			return readErr
		}

		issue := ""
		switch {
		case partner.PayoutDestination == "":
			issue = "dsh_reference_missing"
		case partner.PayoutDestination != ref.ID:
			issue = "reference_mismatch"
		case partner.MaskedAccount != ref.MaskedAccountNumber ||
			partner.MaskedIBAN != ref.MaskedIBAN ||
			partner.MaskedMobile != ref.MaskedMobileNumber:
			issue = "masked_readback_mismatch"
		}
		if issue == "" {
			if err := resolvePartnerCases(ctx, db, partner.PartnerID); err != nil {
				return err
			}
			continue
		}
		if err := upsertCase(ctx, db, partner, issue, ref); err != nil {
			return err
		}
	}
	return nil
}

func upsertCase(ctx context.Context, db *sql.DB, partner partnerReadback, issue string, ref *wlt.PayoutDestinationRef) error {
	var wltID, account, iban, mobile string
	if ref != nil {
		wltID = ref.ID
		account = ref.MaskedAccountNumber
		iban = ref.MaskedIBAN
		mobile = ref.MaskedMobileNumber
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO dsh_partner_wlt_reconciliation_cases (
			partner_id, issue_type, dsh_payout_destination_id,
			wlt_payout_destination_id, wlt_masked_account_number,
			wlt_masked_iban, wlt_masked_mobile_number
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (partner_id, issue_type) DO UPDATE SET
			dsh_payout_destination_id = EXCLUDED.dsh_payout_destination_id,
			wlt_payout_destination_id = EXCLUDED.wlt_payout_destination_id,
			wlt_masked_account_number = EXCLUDED.wlt_masked_account_number,
			wlt_masked_iban = EXCLUDED.wlt_masked_iban,
			wlt_masked_mobile_number = EXCLUDED.wlt_masked_mobile_number,
			status = 'open', resolved_at = NULL, resolution_note = '',
			last_detected_at = now()`,
		partner.PartnerID, issue, partner.PayoutDestination,
		wltID, account, iban, mobile,
	)
	return err
}

func resolvePartnerCases(ctx context.Context, db *sql.DB, partnerID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_reconciliation_cases
		SET status = 'resolved', resolved_at = now(),
		    resolution_note = 'DSH and WLT masked readback are aligned',
		    last_detected_at = now()
		WHERE partner_id = $1 AND status = 'open'`, partnerID)
	return err
}
