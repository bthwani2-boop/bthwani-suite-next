package http

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func readCatalogContractFixture(t *testing.T, relative string) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve catalog contract test location")
	}
	path := filepath.Clean(filepath.Join(filepath.Dir(currentFile), relative))
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(content)
}

func requireContractSnippet(t *testing.T, content, snippet string) {
	t.Helper()
	if !strings.Contains(content, snippet) {
		t.Fatalf("catalog ownership chain is missing required snippet %q", snippet)
	}
}

func requireVersionedSchema(t *testing.T, contract, schema string) {
	t.Helper()
	start := strings.Index(contract, "    "+schema)
	if start < 0 {
		t.Fatalf("missing schema %s", schema)
	}
	tail := contract[start:]
	end := strings.Index(tail[4:], "\n    ")
	if end >= 0 {
		tail = tail[:end+4]
	}
	if !strings.Contains(tail, "expectedVersion") {
		t.Fatalf("schema %s must expose expectedVersion for optimistic concurrency", schema)
	}
}

func TestCatalogContractMatchesRuntimeOCCSurface(t *testing.T) {
	t.Parallel()

	contract := readCatalogContractFixture(t, "../../../contracts/dsh.catalog.openapi.yaml")
	overlay := readCatalogContractFixture(t, "../../../contracts/dsh.catalog.overlay.yaml")
	registry := readCatalogContractFixture(t, "../../../contracts/contract-registry.ts")
	manifest := readCatalogContractFixture(t, "../../../service.manifest.ts")

	requiredPaths := []string{
		"/dsh/operator/catalog/domains:",
		"/dsh/operator/catalog/domains/{domainId}:",
		"/dsh/operator/catalog/nodes/{nodeId}:",
		"/dsh/operator/catalog/master-products/{productId}:",
		"/dsh/operator/catalog/product-proposals/{proposalId}/decision:",
		"/dsh/operator/catalog/product-proposals/{proposalId}/transition:",
		"/dsh/operator/catalog/platform-policies/{policyId}:",
		"/dsh/operator/stores/{storeId}/assortment/{masterProductId}:",
		"/dsh/partner/catalog/product-proposals/{proposalId}:",
		"/dsh/partner/stores/{storeId}/assortment/{masterProductId}:",
		"/dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}:",
		"/dsh/field/partners/{partnerId}/stores/{storeId}/assortment/{masterProductId}:",
		"/dsh/operator/catalog/assets/{assetId}:",
		"/dsh/operator/catalog/assets/{assetId}/review:",
	}
	for _, path := range requiredPaths {
		requireContractSnippet(t, contract, path)
	}

	for _, operation := range []string{
		"operationId: updateCatalogDomain",
		"operationId: updateCatalogNode",
		"operationId: updateMasterProduct",
		"operationId: decideProductProposal",
		"operationId: transitionProductProposal",
		"operationId: updateCatalogPlatformPolicy",
		"operationId: upsertOperatorStoreAssortment",
		"operationId: updatePartnerProductProposal",
		"operationId: updateFieldProductProposal",
		"operationId: updateCatalogAsset",
		"operationId: reviewCatalogAsset",
	} {
		requireContractSnippet(t, contract, operation)
	}

	for _, schema := range []string{
		"UpdateDomainRequest:",
		"UpdateMasterProductRequest:",
		"ProposalDecisionRequest:",
		"ProposalTransitionRequest:",
		"UpdatePolicyRequest:",
		"UpsertAssortmentRequest:",
		"UpdateProposalRequest:",
		"UpdateAssetRequest:",
		"ReviewAssetRequest:",
	} {
		requireVersionedSchema(t, contract, schema)
	}

	for _, snippet := range []string{
		"target: $.components.schemas.UpdateNodeRequest",
		"additionalProperties: false",
		"required:",
		"- expectedVersion",
		"#/components/schemas/PositiveVersion",
	} {
		requireContractSnippet(t, overlay, snippet)
	}
	for _, immutable := range []string{"domainId:", "parentId:", "level:", "slug:"} {
		if strings.Contains(overlay, immutable) {
			t.Fatalf("UpdateNodeRequest overlay exposes immutable field %s", strings.TrimSuffix(immutable, ":"))
		}
	}

	if strings.Contains(contract, "/dsh/partner/catalog/product-proposals/{proposalId}:\n    put:") {
		t.Fatal("partner proposal update must be PATCH, not stale PUT")
	}
	if strings.Contains(contract, "/dsh/field/partners/{partnerId}/catalog/product-proposals/{proposalId}:\n    put:") {
		t.Fatal("field proposal update must be PATCH, not stale PUT")
	}
	requireContractSnippet(t, contract, "control for every mutation of an existing versioned entity")
	requireContractSnippet(t, contract, "ConflictResponse:")
	requireContractSnippet(t, contract, "code: { const: CONFLICT }")
	requireContractSnippet(t, contract, "\"409\": { $ref: \"#/components/responses/Conflict\" }")

	requireContractSnippet(t, registry, "id: \"dsh-catalog\"")
	requireContractSnippet(t, registry, "path: \"contracts/dsh.catalog.openapi.yaml\"")
	requireContractSnippet(t, registry, "clientStrategy: \"SECONDARY_GENERATED_SUBSET\"")
	requireContractSnippet(t, registry, "generatedClient: \"clients/generated/dsh-catalog-api.ts\"")
	requireContractSnippet(t, manifest, "DSH_CONTRACT_REGISTRY")
	requireContractSnippet(t, manifest, "contracts: DSH_CONTRACT_REGISTRY.map((contract) => contract.path)")
}
