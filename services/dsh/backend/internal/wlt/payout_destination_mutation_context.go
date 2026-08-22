package wlt

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// FinanceUpsertPayoutDestinationGoverned preserves the caller's governed
// correlation and idempotency identity across the DSH -> WLT boundary. The
// older convenience method generated a new identity from correlation/body,
// which meant an explicit DSH Idempotency-Key was not authoritative in WLT.
func (c *Client) FinanceUpsertPayoutDestinationGoverned(
	ctx context.Context,
	actorType, actorID string,
	body []byte,
	correlationID, idempotencyKey, operatorContextID string,
) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" || len(body) == 0 {
		return 0, nil, fmt.Errorf("actor id and payout destination body are required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID)
	return c.actorFinanceRequest(ctx, http.MethodPut, path, body, correlationID, idempotencyKey, operatorContextID)
}

// FinanceDeactivatePayoutDestinationGoverned applies the same retry identity
// rule to deactivation so a network retry cannot become a distinct mutation.
func (c *Client) FinanceDeactivatePayoutDestinationGoverned(
	ctx context.Context,
	actorType, actorID, correlationID, idempotencyKey, operatorContextID string,
) (int, []byte, error) {
	actorType, err := governedPayoutActorType(actorType)
	if err != nil {
		return 0, nil, err
	}
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	path := "/wlt/payout-destinations/" + url.PathEscape(actorType) + "/" + url.PathEscape(actorID) + "/deactivate"
	return c.actorFinanceRequest(ctx, http.MethodPost, path, []byte("{}"), correlationID, idempotencyKey, operatorContextID)
}
