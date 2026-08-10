package ledger

import (
	"errors"
	"testing"
)

// TestAccountTaxonomy_UnknownTypeFailsClosed proves there is no default
// classification branch left: an account_type this map does not recognise
// must be rejected, not silently persisted as a liability.
func TestAccountTaxonomy_UnknownTypeFailsClosed(t *testing.T) {
	_, err := resolveAccountTaxonomy("some_never_defined_account_type")
	if err == nil {
		t.Fatal("expected an error for an unknown account_type, got nil")
	}
	if !errors.Is(err, ErrUnknownAccountType) {
		t.Fatalf("expected ErrUnknownAccountType, got: %v", err)
	}
}

// TestAccountTaxonomy_CashInTransitIsAsset locks in the wlt-909 correction:
// captain-held COD cash awaiting remittance is the platform's asset. Before
// this unit, getOrCreateAccountTx's unmapped-default branch would have
// persisted it as a liability while kernel_read.go's summary already treated
// it as an asset -- a drift this single map makes structurally impossible.
func TestAccountTaxonomy_CashInTransitIsAsset(t *testing.T) {
	entry, err := resolveAccountTaxonomy("cash_in_transit")
	if err != nil {
		t.Fatalf("cash_in_transit must be classified: %v", err)
	}
	if entry.Classification != "asset" {
		t.Fatalf("expected cash_in_transit to classify as asset, got %q", entry.Classification)
	}
}

// TestAccountTaxonomy_NewAccountTypesClassifyCorrectly proves the two account
// types added for U001-T002 land in the categories the unit's acceptance
// criteria require: external settlement cash is an asset, payment processing
// cost is an expense.
func TestAccountTaxonomy_NewAccountTypesClassifyCorrectly(t *testing.T) {
	cases := []struct {
		accountType string
		want        string
	}{
		{"external_settlement_cash", "asset"},
		{"payment_processing_expense", "expense"},
	}
	for _, tc := range cases {
		entry, err := resolveAccountTaxonomy(tc.accountType)
		if err != nil {
			t.Fatalf("%s must be classified: %v", tc.accountType, err)
		}
		if entry.Classification != tc.want {
			t.Fatalf("expected %s to classify as %s, got %s", tc.accountType, tc.want, entry.Classification)
		}
	}
}

// TestAccountTaxonomy_ClassificationMatchesDatabaseCheckVocabulary proves
// every Classification value this map can persist is one the
// wlt_ledger_accounts_type_chk / classification CHECK constraints actually
// accept, so a taxonomy entry can never write a value the database itself
// would reject.
func TestAccountTaxonomy_ClassificationMatchesDatabaseCheckVocabulary(t *testing.T) {
	allowed := map[string]bool{"asset": true, "liability": true, "equity": true, "income": true, "expense": true}
	for accountType, entry := range accountTaxonomy {
		if !allowed[entry.Classification] {
			t.Fatalf("account_type %q has classification %q, which is not in the database CHECK vocabulary", accountType, entry.Classification)
		}
		if entry.NormalBalanceSide != "debit" && entry.NormalBalanceSide != "credit" {
			t.Fatalf("account_type %q has an invalid normal balance side %q", accountType, entry.NormalBalanceSide)
		}
	}
}

// TestAccountTaxonomy_CashVarianceIsDeliberatelyUnclassified documents that
// cash_variance is absent on purpose (see the comment on accountTaxonomy),
// not by oversight: it is permitted by the database CHECK constraint but has
// no caller and no evidenced accounting treatment yet.
func TestAccountTaxonomy_CashVarianceIsDeliberatelyUnclassified(t *testing.T) {
	if _, ok := accountTaxonomy["cash_variance"]; ok {
		t.Fatal("cash_variance was given a classification; update this test and its owning unit's evidence together, this is not an accidental gap")
	}
}
