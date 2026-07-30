package wlt

import "testing"

func TestFinanceProxyAllowsGovernedCodReconciliationPaths(t *testing.T) {
	if !financeReadPathAllowed("/wlt/cod-reconciliation-cases") {
		t.Fatal("COD reconciliation list path must be allowlisted")
	}
	for _, path := range []string{
		"/wlt/cod-reconciliation-cases/case-1/assign",
		"/wlt/cod-reconciliation-cases/case-1/resolve",
	} {
		if !financeWritePathAllowed(path) {
			t.Fatalf("governed COD reconciliation mutation must be allowlisted: %s", path)
		}
	}
}

func TestFinanceProxyRejectsUngovernedCodReconciliationPaths(t *testing.T) {
	for _, path := range []string{
		"/wlt/cod-reconciliation-cases/assign",
		"/wlt/cod-reconciliation-cases/case-1/delete",
		"/wlt/cod-reconciliation-cases/case-1/resolve/again",
	} {
		if financeWritePathAllowed(path) {
			t.Fatalf("ungoverned COD reconciliation mutation must remain blocked: %s", path)
		}
	}
}
