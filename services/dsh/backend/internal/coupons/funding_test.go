package coupons

import "testing"

func TestSplitFunding(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		discount    int64
		source      string
		shareBPS    int
		wantPlatform int64
		wantPartner  int64
		wantErr      bool
	}{
		{name: "platform", discount: 1000, source: "platform", shareBPS: 10000, wantPlatform: 1000},
		{name: "partner", discount: 1000, source: "partner", shareBPS: 0, wantPartner: 1000},
		{name: "shared equal", discount: 1000, source: "shared", shareBPS: 5000, wantPlatform: 500, wantPartner: 500},
		{name: "shared rounds and preserves total", discount: 999, source: "shared", shareBPS: 3333, wantPlatform: 333, wantPartner: 666},
		{name: "shared minimum unit", discount: 2, source: "shared", shareBPS: 1, wantPlatform: 1, wantPartner: 1},
		{name: "shared one unit forbidden", discount: 1, source: "shared", shareBPS: 5000, wantErr: true},
		{name: "invalid platform share", discount: 1000, source: "platform", shareBPS: 5000, wantErr: true},
		{name: "invalid partner share", discount: 1000, source: "partner", shareBPS: 100, wantErr: true},
		{name: "unknown source", discount: 1000, source: "unknown", shareBPS: 10000, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			platform, partner, err := splitFunding(tt.discount, tt.source, tt.shareBPS)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got platform=%d partner=%d", platform, partner)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if platform != tt.wantPlatform || partner != tt.wantPartner {
				t.Fatalf("got platform=%d partner=%d, want platform=%d partner=%d", platform, partner, tt.wantPlatform, tt.wantPartner)
			}
			if platform+partner != tt.discount {
				t.Fatalf("funding split %d + %d does not preserve discount %d", platform, partner, tt.discount)
			}
		})
	}
}

func TestNormalizeFundingPolicy(t *testing.T) {
	t.Parallel()

	policy := normalizeFundingPolicy(UpdateFundingPolicyInput{})
	if policy.FundingSource != "platform" || policy.PlatformShareBPS != 10000 || policy.FundingPartnerID != nil {
		t.Fatalf("unexpected default policy: %+v", policy)
	}

	blank := "   "
	policy = normalizeFundingPolicy(UpdateFundingPolicyInput{
		FundingSource: "platform",
		FundingPartnerID: &blank,
	})
	if policy.FundingPartnerID != nil {
		t.Fatalf("blank partner id must normalize to nil")
	}
}
