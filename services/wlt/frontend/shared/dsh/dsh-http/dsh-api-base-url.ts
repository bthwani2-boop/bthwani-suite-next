// Canonical DSH API base URL resolution — re-exported from dsh-link.
// All consumers should import from @bthwani/wlt/dsh (the barrel),
// not from this module directly.
export {
  resolveDshApiBaseUrl,
  validateDshApiBaseUrl,
  isDshDeviceLoopbackBridgeEnabled,
} from "../dsh-link/dsh-api-base-url";
