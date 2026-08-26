package wlt

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// These adapters exist only for historical transport tests; production code has
// no free-form finance execution methods after the canonical cutover.
func (c *Client) FinanceWriteWithOperatorContext(ctx context.Context, method, path string, body []byte, correlationID, idempotencyKey, operatorContextID string) (int, []byte, error) {
	if method != http.MethodPost || path != "/wlt/payout-requests" {
		return 0, nil, fmt.Errorf("legacy test call is not a canonical payout create")
	}
	if idempotencyKey == "" {
		idempotencyKey = deterministicMutationKey("finance-proxy", method, path, string(body), operatorContextID)
	}
	return c.ExecuteFinanceWrite(ctx, "finance.payout_requests.create", nil, body, correlationID, idempotencyKey, operatorContextID, "test-actor")
}

func (c *Client) FinanceReadWalletWithOperatorContext(ctx context.Context, actorType, actorID, correlationID, operatorContextID string) (int, []byte, error) {
	actorType = strings.ToLower(strings.TrimSpace(actorType))
	if actorType != "client" && actorType != "partner" && actorType != "captain" && actorType != "field" {
		return 0, nil, fmt.Errorf("actor type is not allowlisted")
	}
	if actorID == "" {
		return 0, nil, fmt.Errorf("actor id is required")
	}
	if strings.TrimSpace(operatorContextID) == "" {
		return 0, nil, fmt.Errorf("OperatorContext id is required")
	}
	return c.ExecuteFinanceRead(ctx, "finance.wallet.read", map[string]string{"actorType": actorType, "actorId": actorID}, nil, correlationID, operatorContextID)
}

func (c *Client) FinanceRead(ctx context.Context, path string, query url.Values, correlationID string) (int, []byte, error) {
	return 0, nil, fmt.Errorf("path is not allowlisted: %s", path)
}
