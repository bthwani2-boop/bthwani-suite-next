import type { components } from "../../../clients/generated/dsh-catalog-api";
import type {
  CatalogAsset,
  CatalogPlatformPolicy,
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
} from "./central-catalog.types";

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type VersionCore<T extends { id: string; version: number }> = Pick<T, "id" | "version">;

type ContractDomain = components["schemas"]["Domain"];
type ContractNode = components["schemas"]["Node"];
type ContractProduct = components["schemas"]["MasterProduct"];
type ContractProposal = components["schemas"]["Proposal"];
type ContractPolicy = components["schemas"]["Policy"];
type ContractAssortment = components["schemas"]["Assortment"];
type ContractAsset = components["schemas"]["Asset"];

// Shared entities may carry additional read-model fields, but every value they
// expose must satisfy the sovereign generated contract.
export type CatalogDomainContractAlignment = Assert<IsAssignable<CentralCatalogDomain, ContractDomain>>;
export type CatalogNodeContractAlignment = Assert<IsAssignable<CentralCatalogNode, ContractNode>>;
export type CatalogProductContractAlignment = Assert<IsAssignable<MasterProduct, ContractProduct>>;
export type CatalogProposalContractAlignment = Assert<IsAssignable<ProductProposal, ContractProposal>>;
export type CatalogAssortmentContractAlignment = Assert<IsAssignable<StoreAssortment, ContractAssortment>>;

// Policy and asset schemas intentionally allow forward-compatible extension in
// OpenAPI. Their immutable OCC identity is still checked exactly here; their
// concrete read-model fields remain governed by central-catalog.types.ts.
export type CatalogPolicyContractAlignment = Assert<
  IsAssignable<VersionCore<CatalogPlatformPolicy>, VersionCore<ContractPolicy>>
>;
export type CatalogAssetContractAlignment = Assert<
  IsAssignable<VersionCore<CatalogAsset>, VersionCore<ContractAsset>>
>;

// Mutation payloads are imported from the generated contract so required OCC
// fields cannot be weakened by a surface-local type alias.
export type CatalogDomainMutationContract = components["schemas"]["UpdateDomainRequest"];
export type CatalogNodeMutationContract = components["schemas"]["UpdateNodeRequest"];
export type CatalogProductMutationContract = components["schemas"]["UpdateMasterProductRequest"];
export type CatalogProposalMutationContract = components["schemas"]["UpdateProposalRequest"];
export type CatalogProposalDecisionContract = components["schemas"]["ProposalDecisionRequest"];
export type CatalogProposalTransitionContract = components["schemas"]["ProposalTransitionRequest"];
export type CatalogPolicyMutationContract = components["schemas"]["UpdatePolicyRequest"];
export type CatalogAssortmentMutationContract = components["schemas"]["UpsertAssortmentRequest"];
export type CatalogAssetMutationContract = components["schemas"]["UpdateAssetRequest"];
export type CatalogAssetReviewContract = components["schemas"]["ReviewAssetRequest"];
export type CatalogConflictContract = components["schemas"]["ConflictResponse"];
