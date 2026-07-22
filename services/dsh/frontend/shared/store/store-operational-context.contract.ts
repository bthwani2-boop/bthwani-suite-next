/**
 * Manual typed adapter for
 * services/dsh/contracts/dsh.store-operational-context.overlay.yaml.
 *
 * The overlay is active because the aggregate DSH client generator does not
 * currently emit schema-overlay fields. Runtime consumers validate every
 * property and fail closed before constructing this type.
 */
export type DshStoreOperationalContextContract = {
  readonly addressLine: string;
  readonly coverageSummary: string;
  readonly operatingHours: string;
  readonly deliveryReadiness: string;
};

export const DSH_STORE_OPERATIONAL_CONTEXT_FIELDS = [
  "addressLine",
  "coverageSummary",
  "operatingHours",
  "deliveryReadiness",
] as const satisfies readonly (keyof DshStoreOperationalContextContract)[];
