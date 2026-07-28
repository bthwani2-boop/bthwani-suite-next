package partnerwltoutbox

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"dsh-api/internal/wlt"
)

const (
	EventDeactivatePayout = "deactivate_payout_destination"
	maxAttempts           = 10
)

type Event struct {
	ID              string
	TenantID        string
	PartnerID       string
	ActivationEvent string
	EventType       string
	ActorID         string
	CorrelationID   string
	IdempotencyKey  string
	AttemptCount    int
}

type partnerReadback struct {
	TenantID          string
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
	if strings.TrimSpace(event.TenantID) == "" {
		return true, recordDeliveryFailure(ctx, db, event, fmt.Errorf("partner WLT event has no tenant context"))
	}

	deliveryCtx := wlt.WithTenantContext(ctx, event.TenantID)
	var deliveryErr error
	switch event.EventType {
	case EventDeactivatePayout:
		deliveryErr = client.DeactivatePayoutDestination(
			deliveryCtx,
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
			UPDATE dsh_partner_wlt_outbox outbox
			SET status = 'delivered', delivered_at = now(), last_error = '', updated_at = now()
			FROM dsh_partners partner
			WHERE outbox.id = $1::uuid AND partner.id=outbox.partner_id AND partner.tenant_id=$2`, event.ID, event.TenantID)
		return true, err
	}
	return true, recordDeliveryFailure(ctx, db, event, deliveryErr)
}

func recordDeliveryFailure(ctx context.Context, db *sql.DB, event Event, deliveryErr error) error {
	status := "retry"
	if event.AttemptCount >= maxAttempts {
		status = "dead_letter"
	}
	backoff := retryDelay(event.AttemptCount)
	_, updateErr := db.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_outbox outbox
		SET status = $2,
		    last_error = left($3, 1000),
		    available_at = now() + ($4 * interval '1 second'),
		    updated_at = now()
		FROM dsh_partners partner
		WHERE outbox.id = $1::uuid AND partner.id=outbox.partner_id AND partner.tenant_id=$5`,
		event.ID, status, deliveryErr.Error(), int(backoff.Seconds()), event.TenantID,
	)
	if updateErr != nil {
		return fmt.Errorf("record partner WLT retry after %v: %w", deliveryErr, updateErr)
	}
	return nil
}

func claimNext(ctx context.Context, db *sql.DB) (Event, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return Event{}, err
	}
	defer tx.Rollback() //nolint:errcheck

	var event Event
	err = tx.QueryRowContext(ctx, `
		SELECT outbox.id::text, btrim(partner.tenant_id), outbox.partner_id,
		       outbox.activation_event_id::text, outbox.event_type,
		       outbox.actor_id, outbox.correlation_id, outbox.idempotency_key,
		       outbox.attempt_count + 1
		FROM dsh_partner_wlt_outbox outbox
		JOIN dsh_partners partner ON partner.id=outbox.partner_id
		WHERE outbox.status IN ('pending','retry')
		  AND outbox.available_at <= now()
		  AND btrim(partner.tenant_id) <> ''
		ORDER BY outbox.created_at ASC
		FOR UPDATE OF outbox SKIP LOCKED
		LIMIT 1`,
	).Scan(
		&event.ID, &event.TenantID, &event.PartnerID, &event.ActivationEvent, &event.EventType,
		&event.ActorID, &event.CorrelationID, &event.IdempotencyKey,
		&event.AttemptCount,
	)
	if err != nil {
		return Event{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_outbox outbox
		SET status = 'processing', attempt_count = $2, updated_at = now()
		FROM dsh_partners partner
		WHERE outbox.id = $1::uuid AND partner.id=outbox.partner_id AND partner.tenant_id=$3`, event.ID, event.AttemptCount, event.TenantID); err != nil {
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
		SELECT btrim(tenant_id), id,
		       COALESCE(payout_destination_id,''),
		       COALESCE(masked_account_number,''),
		       COALESCE(masked_iban,''),
		       COALESCE(masked_mobile_number,''),
		       activation_status
		FROM dsh_partners
		WHERE btrim(tenant_id) <> ''
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
			&partner.TenantID,
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
		readCtx := wlt.WithTenantContext(ctx, partner.TenantID)
		ref, readErr := client.GetPayoutDestination(readCtx, partner.PartnerID)
		if errors.Is(readErr, wlt.ErrPayoutDestinationNotFound) {
			if partner.PayoutDestination != "" && partner.ActivationStatus != "partner_deactivated" {
				if err := upsertCase(ctx, db, partner, "wlt_destination_missing", nil); err != nil {
					return err
				}
			} else if err := resolvePartnerCases(ctx, db, partner.TenantID, partner.PartnerID); err != nil {
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
			if err := resolvePartnerCases(ctx, db, partner.TenantID, partner.PartnerID); err != nil {
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
		)
		SELECT $1,$2,$3,$4,$5,$6,$7
		WHERE EXISTS (SELECT 1 FROM dsh_partners WHERE id=$1 AND tenant_id=$8)
		ON CONFLICT (partner_id, issue_type) DO UPDATE SET
			dsh_payout_destination_id = EXCLUDED.dsh_payout_destination_id,
			wlt_payout_destination_id = EXCLUDED.wlt_payout_destination_id,
			wlt_masked_account_number = EXCLUDED.wlt_masked_account_number,
			wlt_masked_iban = EXCLUDED.wlt_masked_iban,
			wlt_masked_mobile_number = EXCLUDED.wlt_masked_mobile_number,
			status = 'open', resolved_at = NULL, resolution_note = '',
			last_detected_at = now()`,
		partner.PartnerID, issue, partner.PayoutDestination,
		wltID, account, iban, mobile, partner.TenantID,
	)
	return err
}

func resolvePartnerCases(ctx context.Context, db *sql.DB, tenantID, partnerID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE dsh_partner_wlt_reconciliation_cases cases
		SET status = 'resolved', resolved_at = now(),
		    resolution_note = 'DSH and WLT masked readback are aligned',
		    last_detected_at = now()
		FROM dsh_partners partner
		WHERE cases.partner_id = $1 AND cases.status = 'open'
		  AND partner.id=cases.partner_id AND partner.tenant_id=$2`, partnerID, tenantID)
	return err
}
