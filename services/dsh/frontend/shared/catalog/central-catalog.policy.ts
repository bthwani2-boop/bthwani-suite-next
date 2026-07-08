import type { CatalogPlatformPolicy, CentralCatalogNode } from "./central-catalog.types";

/**
 * Resolves the effective platform policy for a given category/node & domain.
 * Resolution hierarchy: node-scoped policy -> parent node-scoped policy -> domain-scoped policy -> default policy.
 */
export function resolveEffectivePolicy(
  policies: readonly CatalogPlatformPolicy[],
  nodes: readonly CentralCatalogNode[],
  domainId: string,
  nodeId: string | null,
): CatalogPlatformPolicy | null {
  if (nodeId) {
    // 1. Check direct node policy
    const directNodePolicy = policies.find(
      (p) => p.nodeId === nodeId && p.policyScope === "node" && p.isActive
    );
    if (directNodePolicy) return directNodePolicy;

    // 2. Check parent node policy (recursive)
    const currentNode = nodes.find((n) => n.id === nodeId);
    if (currentNode?.parentId) {
      const parentPolicy = resolveEffectivePolicy(policies, nodes, domainId, currentNode.parentId);
      if (parentPolicy && parentPolicy.policyScope !== "default") return parentPolicy;
    }
  }

  // 3. Check domain policy
  if (domainId) {
    const domainPolicy = policies.find(
      (p) => p.domainId === domainId && p.policyScope === "domain" && p.isActive
    );
    if (domainPolicy) return domainPolicy;
  }

  // 4. Fallback to default policy
  const defaultPolicy = policies.find((p) => p.policyScope === "default" && p.isActive);
  return defaultPolicy ?? null;
}
