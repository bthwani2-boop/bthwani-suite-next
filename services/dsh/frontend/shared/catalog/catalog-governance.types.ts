export type CatalogAttributeDataType =
  | "text"
  | "number"
  | "boolean"
  | "enum"
  | "multi_enum"
  | "measurement"
  | "money"
  | "date"
  | "media";

export interface CatalogAttribute {
  readonly id: string;
  readonly code: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly dataType: CatalogAttributeDataType;
  readonly isFilterable: boolean;
  readonly isRequired: boolean;
  readonly isVariantAxis: boolean;
  readonly isGlobal: boolean;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CatalogAttributeOption {
  readonly id: string;
  readonly attributeId: string;
  readonly code: string;
  readonly labelAr: string;
  readonly labelEn: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly version: number;
}

export interface CatalogNodeAttributeRule {
  readonly id: string;
  readonly nodeId: string;
  readonly attributeId: string;
  readonly isRequired: boolean;
  readonly isFilterable: boolean;
  readonly isVariantAxis: boolean;
  readonly sortOrder: number;
  readonly version: number;
}

export interface MasterProductAttributeValue {
  readonly id: string;
  readonly masterProductId: string;
  readonly attributeId: string;
  readonly value: unknown;
  readonly locale: string | null;
  readonly version: number;
  readonly updatedAt: string;
}

export type MasterProductRelationshipType =
  | "substitute"
  | "alternative"
  | "complement";

export interface MasterProductRelationship {
  readonly id: string;
  readonly sourceMasterProductId: string;
  readonly targetMasterProductId: string;
  readonly relationshipType: MasterProductRelationshipType;
  readonly priority: number;
  readonly reason: string;
  readonly isActive: boolean;
  readonly createdBy: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AssortmentPauseState {
  readonly assortmentId: string;
  readonly storeId: string;
  readonly masterProductId: string;
  readonly paused: boolean;
  readonly reason: string;
  readonly pausedUntil: string | null;
  readonly pausedAt: string | null;
  readonly pausedBy: string | null;
  readonly version: number;
}

export interface CatalogAuditEntry {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: "INSERT" | "UPDATE" | "DELETE" | "ROLLBACK";
  readonly actorId: string;
  readonly actorRole: string;
  readonly reason: string;
  readonly correlationId: string;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: string;
}

export interface CatalogRollbackResult {
  readonly entityType: string;
  readonly entityId: string;
  readonly newVersion: number;
}

export interface CatalogGovernancePage<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}
