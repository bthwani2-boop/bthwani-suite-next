export const platformControlServiceManifest = {
  service: "platform-control",
  id: "platform-control",
  name: "Sovereign Platform Control",

  realService: true,
  activatesService: true,

  type: "PLATFORM_CONTROL_SERVICE",
  lifecycle: "P3_GOVERNED_PROGRESSIVE_DELIVERY",
  runtimeState: "VERIFICATION_REQUIRED",

  ownsFinancialTruth: false,

  backendRuntimeReady: true,
  databaseReady: true,
  generatedClientReady: true,
  frontendReady: true,
  changeWorkflowReady: true,
  rolloutRuntimeReady: true,
  rollbackRuntimeReady: true,
  healthAggregationReady: true,

  boundaries: {
    owns: [
      "platform_runtime_snapshot",
      "platform_variable_resolution_contract",
      "platform_feature_flag_contract",
      "platform_change_workflow_contract",
      "platform_progressive_rollout_contract",
      "platform_health_gate_contract",
      "platform_audit_contract",
      "platform_rollback_contract",
    ],
    forbiddenOutsidePlatformControl: [
      "platform_variable_apply",
      "platform_flag_apply",
      "platform_rollout_create",
      "platform_rollout_advance",
      "platform_rollout_pause",
      "platform_rollout_abort",
      "platform_rollout_rollback",
      "platform_rollback_execute",
    ],
    allowedForDshControlPanel: [
      "platform_runtime_snapshot_read",
      "platform_effective_config_read",
      "platform_posture_display",
      "platform_change_workflow_operate_when_authorized",
      "platform_progressive_rollout_operate_when_authorized",
      "platform_health_and_audit_read_when_authorized",
    ],
  },

  closure: {
    implementation: "P3_IMPLEMENTED",
    requiredBeforeRelease: [
      "same_commit_ci_success",
      "docker_runtime_smoke_success",
      "visual_evidence",
      "product_owner_acceptance",
      "qa_acceptance",
      "security_acceptance",
      "release_acceptance",
    ],
  },
} as const;

export default platformControlServiceManifest;
