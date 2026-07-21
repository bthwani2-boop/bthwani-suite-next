package http

import (
	"strings"
	"testing"
)

func TestCatalogGenerationUsesSovereignOverlay(t *testing.T) {
	t.Parallel()

	overlay := readCatalogContractFixture(t, "../../../contracts/dsh.catalog.overlay.yaml")
	generator := readCatalogContractFixture(t, "../../../../../tools/scripts/generate-dsh-catalog-client.mjs")
	readme := readCatalogContractFixture(t, "../../../clients/generated/README.md")
	masterIndex := readCatalogContractFixture(t, "../../../../../contracts/master.openapi.yaml")

	for _, snippet := range []string{
		"target: $.components.schemas.UpdateNodeRequest",
		"required:",
		"- expectedVersion",
		"additionalProperties: false",
	} {
		if !strings.Contains(overlay, snippet) {
			t.Fatalf("catalog overlay missing %q", snippet)
		}
	}
	for _, forbidden := range []string{"domainId:", "parentId:", "level:", "slug:"} {
		if strings.Contains(overlay, forbidden) {
			t.Fatalf("catalog node PATCH overlay exposes immutable field %q", forbidden)
		}
	}

	for _, snippet := range []string{
		"dsh.catalog.openapi.yaml",
		"dsh.catalog.overlay.yaml",
		"applyOverlay(contract, overlay)",
		"openapi-typescript",
		"UpdateNodeRequest must not inherit CreateNodeRequest",
		"generated OpenAPI client",
		"catalog contract facade",
	} {
		if !strings.Contains(generator, snippet) {
			t.Fatalf("catalog generator missing %q", snippet)
		}
	}

	for _, content := range []string{readme, masterIndex} {
		if !strings.Contains(content, "dsh.catalog.overlay.yaml") {
			t.Fatal("catalog overlay is not registered in generated-client documentation or master contract index")
		}
	}
}
