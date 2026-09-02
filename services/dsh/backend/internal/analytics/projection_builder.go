package analytics

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// RebuildProjections provides a simplified fallback mechanism to rebuild metrics
// by reading the raw tables and writing to dsh_analytics_projections.
// In a fully event-driven architecture, this is the "Backfill" process.
func RebuildProjections(ctx context.Context, db *sql.DB, periodStart time.Time) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	periodEnd := periodStart.AddDate(0, 0, 1)

	// Platform KPIs
	var totalOrders, deliveredOrders, cancelledOrders int
	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_orders WHERE created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&totalOrders)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_orders WHERE status = 'delivered' AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&deliveredOrders)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_orders WHERE (status = 'cancelled' OR status LIKE 'cancelled_%') AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&cancelledOrders)
	if err != nil {
		return err
	}

	// Upsert Platform KPIs Projections
	upsertQuery := `
		INSERT INTO dsh_analytics_projections (id, metric_id, store_id, partner_id, period_start, period_end, metric_value, sample_size, generated_at)
		VALUES (gen_random_uuid(), $1, NULL, NULL, $2, $3, $4, $5, NOW())
		ON CONFLICT (metric_id, store_id, period_start) DO UPDATE SET
			metric_value = EXCLUDED.metric_value,
			sample_size = EXCLUDED.sample_size,
			generated_at = NOW()
	`

	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.orders.total", periodStart, periodEnd, totalOrders, totalOrders); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.orders.delivered", periodStart, periodEnd, deliveredOrders, totalOrders); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.orders.cancelled", periodStart, periodEnd, cancelledOrders, totalOrders); err != nil {
		return err
	}

	// Delivery Analytics
	var totalAssignments, acceptedAssignments, completedAssignments, declinedAssignments int
	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_assignments WHERE created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&totalAssignments)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_assignments WHERE status IN ('accepted','completed') AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&acceptedAssignments)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_assignments WHERE status = 'completed' AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&completedAssignments)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_assignments WHERE status = 'declined' AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&declinedAssignments)
	if err != nil {
		return err
	}

	// Support Analytics
	var totalTickets, openTickets, resolvedTickets int
	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_support_tickets WHERE created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&totalTickets)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_support_tickets WHERE status NOT IN ('resolved','closed') AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&openTickets)
	if err != nil {
		return err
	}

	err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM dsh_support_tickets WHERE status IN ('resolved','closed') AND created_at >= $1 AND created_at < $2`, periodStart, periodEnd).Scan(&resolvedTickets)
	if err != nil {
		return err
	}

	// Upsert Projections
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.assignments.total", periodStart, periodEnd, totalAssignments, totalAssignments); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.assignments.accepted", periodStart, periodEnd, acceptedAssignments, totalAssignments); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.assignments.completed", periodStart, periodEnd, completedAssignments, totalAssignments); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.assignments.declined", periodStart, periodEnd, declinedAssignments, totalAssignments); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.support.total_tickets", periodStart, periodEnd, totalTickets, totalTickets); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.support.open_tickets", periodStart, periodEnd, openTickets, totalTickets); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, upsertQuery, "platform.support.resolved_tickets", periodStart, periodEnd, resolvedTickets, totalTickets); err != nil {
		return err
	}

	// Update Checkpoint
	checkpointQuery := `
		INSERT INTO dsh_analytics_checkpoints (projection_name, last_processed_timestamp, status, updated_at)
		VALUES ($1, $2, 'active', NOW())
		ON CONFLICT (projection_name) DO UPDATE SET
			last_processed_timestamp = EXCLUDED.last_processed_timestamp,
			updated_at = NOW()
	`
	if _, err := tx.ExecContext(ctx, checkpointQuery, "platform.orders", time.Now()); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, checkpointQuery, "platform.assignments", time.Now()); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, checkpointQuery, "platform.support", time.Now()); err != nil {
		return err
	}

	return tx.Commit()
}

// GetFreshness returns the actual generated_at from projections for a given metric prefix
func GetFreshness(db *sql.DB, metricPrefix string) (time.Time, error) {
	var freshness time.Time
	err := db.QueryRow(`
		SELECT COALESCE(MAX(generated_at), NOW())
		FROM dsh_analytics_projections
		WHERE metric_id LIKE $1`,
		fmt.Sprintf("%s%%", metricPrefix)).Scan(&freshness)
	return freshness, err
}
