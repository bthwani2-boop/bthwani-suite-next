export const platformControlServiceManifest = {
  service: "platform-control",
  id: "platform-control",
  name: "Sovereign Platform Control",

  realService: true,
  activatesService: true,

  type: "PLATFORM_CONTROL_SERVICE",
  lifecycle: "P1_READ_ONLY_FOUNDATION",
  runtimeState: "PARTIALLY_BOUND",

  ownsFinancialTruth: false,

  backendRuntimeReady: true,
  databaseReady: false,
  generatedClientReady: true,
  frontendReady: true,
  changeWorkflowReady: false,
  rolloutRuntimeReady: false,
  rollbackRuntimeReady: false,
  healthAggregationReady: false,

  boundaries: {
    owns: [
      "platform_runtime_snapshot",
      "platform_variable_resolution_contract",
      "platform_feature_flag_contract",
      "platform_change_workflow_contract",
      "platform_audit_contract",
      "platform_rollback_contract"
    ],
    forbiddenOutsidePlatformControl: [
      "platform_variable_apply",
      "platform_flag_apply",
      "platform_rollout_advance",
      "platform_rollback_execute"
    ],
    allowedForDshControlPanel: [
      "platform_runtime_snapshot_read",
      "platform_posture_display",
      "platform_change_workflow_disabled_state"
    ]
  }
} as const;

export default platformControlServiceManifest;
