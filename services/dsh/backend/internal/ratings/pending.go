package ratings

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

// PendingClientOrderRatingPrompt returns the newest delivered order that still
// lacks either the captain rating or the order rating. It lets the client app
// show the prompt immediately after delivery or on the next authenticated open.
func PendingClientOrderRatingPrompt(ctx context.Context, db *sql.DB, operatorContextID, clientActorID string) (ClientOrderPrompt, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	clientActorID = strings.TrimSpace(clientActorID)
	if operatorContextID == "" || clientActorID == "" {
		return ClientOrderPrompt{}, ErrInvalid
	}
	var orderID string
	err := db.QueryRowContext(ctx, `
		SELECT o.id::text
		FROM dsh_orders o
		WHERE o.tenant_id=$1 AND o.client_id=$2 AND o.status='delivered'
		  AND (
		    NOT EXISTS (
		      SELECT 1 FROM dsh_provider_ratings r
		      WHERE r.tenant_id=o.tenant_id AND r.rater_actor_id=o.client_id
		        AND r.source_kind='order_delivery' AND r.source_id=o.id::text
		        AND r.target_kind='captain' AND r.status='active'
		    ) OR
		    NOT EXISTS (
		      SELECT 1 FROM dsh_provider_ratings r
		      WHERE r.tenant_id=o.tenant_id AND r.rater_actor_id=o.client_id
		        AND r.source_kind='order_delivery' AND r.source_id=o.id::text
		        AND r.target_kind='order' AND r.status='active'
		    )
		  )
		ORDER BY o.updated_at DESC
		LIMIT 1`, operatorContextID, clientActorID).Scan(&orderID)
	if errors.Is(err, sql.ErrNoRows) {
		return ClientOrderPrompt{Eligible: false, Completed: true, Reason: "no_pending_delivered_order"}, nil
	}
	if err != nil {
		return ClientOrderPrompt{}, err
	}
	return ClientOrderRatingPrompt(ctx, db, operatorContextID, clientActorID, orderID)
}
