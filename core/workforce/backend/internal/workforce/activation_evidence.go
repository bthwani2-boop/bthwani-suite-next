package workforce

import (
	"context"
	"strings"
)

func appendMissingUnique(current []string, values ...string) []string {
	seen := make(map[string]struct{}, len(current)+len(values))
	for _, item := range current {
		seen[item] = struct{}{}
	}
	for _, item := range values {
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		current = append(current, item)
	}
	return current
}

// ProviderActivationEvidenceMissing reports structured evidence that is common
// to field and captain activation but was historically absent from the legacy
// readiness projection. It does not introduce a second state machine.
func ProviderActivationEvidenceMissing(core ProviderOperationalCore) []string {
	missing := make([]string, 0)
	if strings.TrimSpace(core.GuarantorPhoneVerifiedAt) == "" {
		missing = append(missing, "guarantorPhoneVerified")
	}

	switch core.ReferralSourceType {
	case "employee", "captain", "field":
		if strings.TrimSpace(core.ReferralSourceActorID) == "" {
			missing = append(missing, "referralSourceActorId")
		}
	case "partner":
		if strings.TrimSpace(core.ReferralPartnerID) == "" {
			missing = append(missing, "referralPartnerId")
		}
	case "advertisement", "social_media":
		if strings.TrimSpace(core.ReferralChannel) == "" {
			missing = append(missing, "referralChannel")
		}
	case "other":
		if strings.TrimSpace(core.ReferralNote) == "" {
			missing = append(missing, "referralNote")
		}
	}

	if core.Captain != nil {
		captain := core.Captain
		if captain.FinancialGuaranteeStatus == "funded" && strings.TrimSpace(captain.FinancialGuaranteeReference) == "" {
			missing = append(missing, "financialGuaranteeReference")
		}
		if captain.DeliveryBagCustodyStatus == "issued" && strings.TrimSpace(captain.DeliveryBagCustodyReference) == "" {
			missing = append(missing, "deliveryBagCustodyReference")
		}
		if captain.MandatoryPurchasesStatus == "paid_and_delivered" && strings.TrimSpace(captain.MandatoryPurchasesReference) == "" {
			missing = append(missing, "mandatoryPurchasesReference")
		}
	}
	return missing
}

// GovernedActivationReadiness extends the existing readiness calculation with
// structured referral, guarantor, custody, purchase, and WLT-reference facts.
func (r *Repository) GovernedActivationReadiness(ctx context.Context, actorID string) (ActivationReadiness, error) {
	person, err := r.PersonByActorID(ctx, actorID)
	if err != nil {
		return ActivationReadiness{}, err
	}
	core, err := r.OperationalCoreByActorID(ctx, actorID)
	if err != nil {
		return ActivationReadiness{}, err
	}
	readiness := EvaluateProviderActivationReadiness(person, core)
	readiness.Missing = appendMissingUnique(readiness.Missing, ProviderActivationEvidenceMissing(core)...)
	readiness.Ready = len(readiness.Missing) == 0
	return readiness, nil
}
