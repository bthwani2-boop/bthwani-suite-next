package provider

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

const payoutInquiryPath = "/financial/payout/inquiry"

// PayoutInquiry is the provider-owned read model used to reconcile an
// unresolved payout result. WLT persists this proof before changing wallet or
// payout truth.
type PayoutInquiry struct {
	ProviderReference string `json:"providerReference"`
	Status            string `json:"status"`
	ResponseCode      string `json:"responseCode,omitempty"`
	Message           string `json:"message,omitempty"`
}

func payoutInquiryMeta(query url.Values) RequestMeta {
	payoutID := strings.TrimSpace(query.Get("payoutRequestId"))
	correlationID := strings.TrimSpace(query.Get("correlationId"))
	if correlationID == "" {
		correlationID = "wlt-payout-inquiry"
		if payoutID != "" {
			correlationID += "-" + payoutID
		}
	}
	return RequestMeta{CorrelationID: correlationID}
}

func (c *Client) InquirePayout(ctx context.Context, query url.Values) (PayoutInquiry, error) {
	providerReference := strings.TrimSpace(query.Get("providerReference"))
	payoutID := strings.TrimSpace(query.Get("payoutRequestId"))
	operatorContextID := strings.TrimSpace(query.Get("operatorContextId"))
	if providerReference == "" || payoutID == "" || operatorContextID == "" {
		return PayoutInquiry{}, fmt.Errorf("payout inquiry requires providerReference, payoutRequestId, and operatorContextId")
	}

	path := payoutInquiryPath + "?" + query.Encode()
	result, err := c.Get(ctx, path, payoutInquiryMeta(query))
	inquiry := PayoutInquiry{
		ProviderReference: strings.TrimSpace(result.ProviderReference),
		Status:            strings.ToLower(strings.TrimSpace(result.Status)),
		ResponseCode:      strings.TrimSpace(result.Code),
		Message:           strings.TrimSpace(result.Message),
	}
	if inquiry.ProviderReference == "" {
		inquiry.ProviderReference = providerReference
	}
	return inquiry, err
}

func (p *ProductionPaymentAdapter) InquirePayout(context.Context, url.Values) (PayoutInquiry, error) {
	return PayoutInquiry{}, fmt.Errorf("%w: refusing production payout inquiry", ErrProductionProviderUnavailable)
}
