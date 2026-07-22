import type { DshStoreAdminDetail } from "../store/store-admin.view-model";
import { formatServiceArea } from "../store/store-discovery.formatters";
import type {
  DshPartnerOperationalScope,
  PartnerRuntimeProfile,
} from "./partner.types";

const EMPTY_PROFILE: PartnerRuntimeProfile = {
  storeName: "",
  branchLabel: "",
  cityLabel: "",
  managerLabel: "",
  todayHoursLabel: "",
  activeZoneLabel: "",
};

function roleLabel(role: DshPartnerOperationalScope["role"]): string {
  if (role === "owner") return "المالك";
  if (role === "manager") return "مدير الفرع";
  return "موظف";
}

/**
 * Build the partner header exclusively from the actor-scoped DSH store
 * context. Missing context returns empty values so the surface's existing
 * completeness gate blocks rendering instead of inventing operational truth.
 */
export function buildPartnerRuntimeProfile(
  scope: DshPartnerOperationalScope | undefined,
  store: DshStoreAdminDetail | null,
): PartnerRuntimeProfile {
  if (!scope || !store || scope.storeId !== store.id) return EMPTY_PROFILE;

  return {
    storeName: store.displayName,
    branchLabel: scope.displayName,
    cityLabel: formatServiceArea(store.cityCode, store.serviceAreaCode),
    managerLabel: roleLabel(scope.role),
    todayHoursLabel: store.operatingHours,
    activeZoneLabel: store.coverageSummary,
  };
}
