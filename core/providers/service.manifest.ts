export const providersServiceManifest = {
  service: "providers",
  id: "providers",
  name: "Logical Platform Providers Service",

  realService: true,
  activatesService: true,

  type: "PLATFORM_INTEGRATION_SERVICE",
  lifecycle: "ACTIVE",
  runtimeState: "PROVIDERS_000_FOUNDATION_EVIDENCE_REQUIRED",

  ownsFinancialTruth: false,

  backendRuntimeReady: true,
  databaseReady: true,
  generatedClientReady: true,
  frontendReady: true,

  boundaries: {
    owns: [
      "external_provider_configurations",
      "external_provider_health",
      "external_provider_credentials"
    ],
    forbiddenOutsideProviders: [
      "credential_mutation",
      "health_check_execution"
    ],
    allowedForDsh: [
      "external_provider_health_reference",
      "external_provider_config_read"
    ]
  }
} as const;

export default providersServiceManifest;
