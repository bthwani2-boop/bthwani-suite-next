const KNOWN_NATIVE_CAPABILITIES = new Set([
  "router", "updates", "constants", "application", "device", "crypto", "image", "battery", "splashScreen", "localization", "localAuthentication", "fileSystem", "documentPicker", "imagePicker", "secureStore", "notifications", "audio", "camera", "video", "imageManipulator", "sharing", "webBrowser", "keepAwake", "sqlite", "location", "backgroundLocation", "maps", "taskManager", "backgroundTask",
]);

const REQUIRED_NAVIGATION_APPS = ["app-client", "app-partner", "app-captain", "app-field"];
const REQUIRED_NAVIGATION_STABILITY_GATES = ["productJourneys", "backendContracts", "mobileAppShell", "deepLinksAndNotifications", "regressionBaseline", "routeContracts", "parityTests"];
const REQUIRED_NAVIGATION_MIGRATION_ORDER = ["app-field", "app-captain", "app-partner", "app-client"];
const REQUIRED_BIOMETRIC_DECLARED_APPS = ["app-client", "app-partner", "app-field"];
const REQUIRED_METADATA_DECLARED_APPS = ["app-client", "app-partner", "app-field"];

const REQUIRED_MEDIA_OWNERS = {
  systemCameraPhotoCapture: ["expo-image-picker", "CANONICAL_ACTIVE"],
  imageLibraryPick: ["expo-image-picker", "CANONICAL_ACTIVE"],
  customCameraPreview: ["expo-camera", "REQUIREMENT_REVIEW_PENDING"],
  barcodeScanning: ["expo-camera", "REQUIREMENT_REVIEW_PENDING"],
  videoPlayback: ["expo-video", "CANONICAL_ACTIVE"],
  standaloneAudio: ["expo-audio", "REQUIREMENT_REVIEW_PENDING"],
  documentPick: ["expo-document-picker", "CANONICAL_ACTIVE"],
  fileOperations: ["expo-file-system", "CANONICAL_ACTIVE_WHERE_CONSUMED"],
  sharing: ["expo-sharing", "CANONICAL_ACTIVE_WHERE_CONSUMED"],
  imageRendering: ["expo-image", "CANONICAL_ACTIVE_WHERE_CONSUMED"],
  imageTransform: ["expo-image-manipulator", "CONSUMER_REVIEW_PENDING"],
};

const REQUIRED_MEDIA_RULES = {
  ordinaryPhotoCaptureMustNotRequireExpoCamera: true,
  broaderPackageWinsOnlyWhenMultipleRequiredCapabilitiesAreActuallyUsed: true,
  duplicateCapabilityOwnersRequireExplicitJustification: true,
  nativeRemovalDeferredToCleanupWindow: true,
  packageDeletionRequiresConsumerAndRequirementClosure: true,
};

const REQUIRED_MOBILITY_OWNERS = {
  foregroundLocation: [["expo-location"], "CANONICAL_ACTIVE"],
  mapRendering: [["react-native-maps"], "CANONICAL_ACTIVE"],
  backgroundLocation: [["expo-location", "expo-task-manager"], "COMPOSITE_CAPABILITY"],
  deferredBackgroundSync: [["expo-background-task", "expo-task-manager"], "FIELD_DECLARED_ACTIVE"],
  powerAwareness: [["expo-battery"], "CANONICAL_ACTIVE_CAPTAIN_FIELD"],
  keepAwake: [["expo-keep-awake"], "REQUIREMENT_REVIEW_PENDING"],
};

const REQUIRED_MOBILITY_RULES = {
  backgroundLocationRequiresTopLevelTaskDefinition: true,
  backgroundLocationRequiresTaskManager: true,
  backgroundTaskMustNotReplaceLocationEngine: true,
  permissionAndNativeChangesDeferredToBuildWindow: true,
  packageDeletionRequiresConsumerAndRequirementClosure: true,
};

const REQUIRED_SYSTEM_OWNERS = {
  sessionSecretStorage: ["expo-secure-store", "CANONICAL_ACTIVE"],
  ephemeralIdentifiers: ["expo-crypto", "CANONICAL_ACTIVE"],
  runtimeConstants: ["expo-constants", "INFRA_ACTIVE"],
  updatesRuntime: ["expo-updates", "INFRA_ACTIVE"],
  splashLifecycle: ["expo-splash-screen", "INFRA_ACTIVE"],
  deepLinking: ["expo-linking", "TARGET_ROUTER_SUPPORT"],
  biometricUnlock: ["expo-local-authentication", "REQUIREMENT_REVIEW_PENDING"],
  applicationMetadata: ["expo-application", "CONSUMER_REVIEW_PENDING"],
  deviceMetadata: ["expo-device", "CONSUMER_REVIEW_PENDING"],
  localization: ["expo-localization", "REQUIREMENT_REVIEW_PENDING"],
};

const REQUIRED_SYSTEM_RULES = {
  secureStoreOwnsSecretsNotGeneralCache: true,
  cryptoDoesNotOwnPersistence: true,
  routerTargetProtectsLinkingFromPrematureDeprecation: true,
  biometricUnlockIsLocalReauthOnly: true,
  biometricUnlockCannotCreateServerSession: true,
  biometricUnlockCannotBypassIdentityOrWorkforceGates: true,
  biometricFeatureBindingRequiresDecisionClosure: true,
  applicationMetadataCannotOwnInstallationIdentity: true,
  deviceMetadataCannotOwnStableInstallationIdentity: true,
  stableInstallationIdentityRemainsSecureStoreCrypto: true,
  metadataFeatureBindingRequiresConsumerProof: true,
  reviewPendingDoesNotAuthorizeDeletion: true,
  nativeRemovalDeferredToCleanupWindow: true,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameArray(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function validateNavigationArchitecture(globalConfig) {
  const navigation = globalConfig?.navigationArchitecture;
  assert(isPlainObject(navigation), "mobile navigation architecture decision is required");
  assert(navigation.target === "expo-router", "mobile navigation target must be expo-router");
  assert(navigation.decision === "ADOPTED_TARGET_ARCHITECTURE", "Expo Router must remain the adopted target navigation architecture");
  assert(navigation.implementation === "DEFERRED_UNTIL_STABILITY", "Expo Router migration must remain deferred until the stability gates are deliberately closed");
  assert(sameArray(navigation.appliesTo, REQUIRED_NAVIGATION_APPS), `Expo Router target architecture must apply to ${REQUIRED_NAVIGATION_APPS.join(", ")}`);
  assert(navigation.migrationMode === "ONE_APP_AT_A_TIME_FAIL_CLOSED", "Expo Router migration must be one app at a time and fail-closed");
  assert(navigation.remoteBuildNow === false, "The architecture decision must not trigger an EAS remote build");
  assert(sameArray(navigation.migrationOrder, REQUIRED_NAVIGATION_MIGRATION_ORDER), `Expo Router migration order must be ${REQUIRED_NAVIGATION_MIGRATION_ORDER.join(" -> ")}`);
  assert(sameArray(navigation.requiredStabilityGates, REQUIRED_NAVIGATION_STABILITY_GATES), "Expo Router stability gates must remain explicit and ordered");
}

function validateMediaArchitecture(globalConfig) {
  const media = globalConfig?.mediaArchitecture;
  assert(isPlainObject(media), "mobile media architecture decision is required");
  assert(media.decision === "CAPABILITY_CONSOLIDATION_FIRST", "mobile media packages must remain governed by capability consolidation first");
  assert(media.remoteBuildNow === false, "media package governance must not trigger an EAS remote build");
  assert(isPlainObject(media.owners), "mobile media capability owners are required");
  for (const [capability, [requiredPackage, requiredStatus]] of Object.entries(REQUIRED_MEDIA_OWNERS)) {
    const owner = media.owners[capability];
    assert(isPlainObject(owner), `media capability '${capability}' requires an explicit owner`);
    assert(owner.package === requiredPackage, `media capability '${capability}' must be owned by '${requiredPackage}'`);
    assert(owner.status === requiredStatus, `media capability '${capability}' must remain '${requiredStatus}' until deliberately reviewed`);
  }
  assert(isPlainObject(media.rules), "mobile media consolidation rules are required");
  for (const [rule, requiredValue] of Object.entries(REQUIRED_MEDIA_RULES)) {
    assert(media.rules[rule] === requiredValue, `mobile media rule '${rule}' drifted from the governed decision`);
  }
}

function validateMobilityArchitecture(globalConfig) {
  const mobility = globalConfig?.mobilityArchitecture;
  assert(isPlainObject(mobility), "mobile location/background architecture decision is required");
  assert(mobility.decision === "CAPABILITY_CONSOLIDATION_FIRST", "mobility packages must remain governed by capability consolidation first");
  assert(mobility.remoteBuildNow === false, "mobility package governance must not trigger an EAS remote build");
  assert(isPlainObject(mobility.owners), "mobility capability owners are required");
  for (const [capability, [requiredPackages, requiredStatus]] of Object.entries(REQUIRED_MOBILITY_OWNERS)) {
    const owner = mobility.owners[capability];
    assert(isPlainObject(owner), `mobility capability '${capability}' requires an explicit owner`);
    assert(sameArray(owner.packages, requiredPackages), `mobility capability '${capability}' must use ${requiredPackages.join(" + ")}`);
    assert(owner.status === requiredStatus, `mobility capability '${capability}' must remain '${requiredStatus}' until deliberately reviewed`);
  }
  assert(isPlainObject(mobility.alignment), "mobility alignment decisions are required");
  assert(mobility.alignment["app-captain.backgroundLocation"] === "REQUIRES_TASK_MANAGER_BEFORE_IMPLEMENTATION", "captain backgroundLocation must remain blocked on TaskManager alignment");
  assert(mobility.alignment["app-field.deferredBackgroundSync"] === "DECLARED_WITH_TASK_MANAGER", "field background sync must retain TaskManager alignment");
  assert(isPlainObject(mobility.rules), "mobility consolidation rules are required");
  for (const [rule, requiredValue] of Object.entries(REQUIRED_MOBILITY_RULES)) {
    assert(mobility.rules[rule] === requiredValue, `mobility rule '${rule}' drifted from the governed decision`);
  }
}

function validateSystemArchitecture(globalConfig) {
  const system = globalConfig?.systemArchitecture;
  assert(isPlainObject(system), "mobile system capability architecture decision is required");
  assert(system.decision === "CAPABILITY_CONSOLIDATION_FIRST", "system packages must remain governed by capability consolidation first");
  assert(system.remoteBuildNow === false, "system package governance must not trigger an EAS remote build");
  assert(isPlainObject(system.owners), "system capability owners are required");
  for (const [capability, [requiredPackage, requiredStatus]] of Object.entries(REQUIRED_SYSTEM_OWNERS)) {
    const owner = system.owners[capability];
    assert(isPlainObject(owner), `system capability '${capability}' requires an explicit owner`);
    assert(owner.package === requiredPackage, `system capability '${capability}' must be owned by '${requiredPackage}'`);
    assert(owner.status === requiredStatus, `system capability '${capability}' must remain '${requiredStatus}' until deliberately reviewed`);
  }
  assert(isPlainObject(system.alignment), "system capability alignment decisions are required");
  assert(system.alignment["app-client.localAuthentication"] === "DECLARED_PENDING_PRODUCT_DECISION", "client biometric declaration must remain pending a product decision");
  assert(system.alignment["app-partner.localAuthentication"] === "DECLARED_PENDING_PRODUCT_DECISION", "partner biometric declaration must remain pending a product decision");
  assert(system.alignment["app-field.localAuthentication"] === "DECLARED_PENDING_PRODUCT_DECISION", "field biometric declaration must remain pending a product decision");
  assert(system.alignment["app-captain.localAuthentication"] === "NOT_DECLARED_REVIEW_PENDING", "captain biometric state must remain explicitly review-pending");
  assert(isPlainObject(system.rules), "system capability consolidation rules are required");
  for (const [rule, requiredValue] of Object.entries(REQUIRED_SYSTEM_RULES)) {
    assert(system.rules[rule] === requiredValue, `system capability rule '${rule}' drifted from the governed decision`);
  }
}

function validateMobileFeatureCapabilityManifest(manifest) {
  assert(isPlainObject(manifest), "mobile manifest must be an object");
  assert(manifest.global?.capabilityModelVersion === 1, "mobile capability model version must be 1");
  validateNavigationArchitecture(manifest.global);
  validateMediaArchitecture(manifest.global);
  validateMobilityArchitecture(manifest.global);
  validateSystemArchitecture(manifest.global);
  assert(isPlainObject(manifest.apps) && Object.keys(manifest.apps).length > 0, "mobile manifest apps are required");

  const biometricCapabilityApps = [];
  const biometricFeatureOwners = [];
  const applicationCapabilityApps = [];
  const deviceCapabilityApps = [];
  const applicationFeatureOwners = [];
  const deviceFeatureOwners = [];

  for (const [appKey, app] of Object.entries(manifest.apps)) {
    assert(!Object.prototype.hasOwnProperty.call(app, "features"), `${appKey}: legacy 'features' is forbidden; use productFeatures + nativeCapabilities`);
    const nativeCapabilities = app.nativeCapabilities;
    assert(Array.isArray(nativeCapabilities) && nativeCapabilities.length > 0, `${appKey}: nativeCapabilities must be a non-empty array`);
    assert(new Set(nativeCapabilities).size === nativeCapabilities.length, `${appKey}: nativeCapabilities must not contain duplicates`);
    for (const capability of nativeCapabilities) {
      assert(typeof capability === "string" && KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: unknown native capability '${capability}'`);
    }
    if (nativeCapabilities.includes("localAuthentication")) biometricCapabilityApps.push(appKey);
    if (nativeCapabilities.includes("application")) applicationCapabilityApps.push(appKey);
    if (nativeCapabilities.includes("device")) deviceCapabilityApps.push(appKey);

    assert(isPlainObject(app.productFeatures) && Object.keys(app.productFeatures).length > 0, `${appKey}: productFeatures must be a non-empty object`);
    for (const [productFeature, requiredCapabilities] of Object.entries(app.productFeatures)) {
      assert(/^[a-z][A-Za-z0-9]*$/.test(productFeature), `${appKey}: invalid product feature id '${productFeature}'`);
      assert(Array.isArray(requiredCapabilities), `${appKey}: product feature '${productFeature}' must map to an array of native capabilities`);
      assert(new Set(requiredCapabilities).size === requiredCapabilities.length, `${appKey}: product feature '${productFeature}' has duplicate native capability requirements`);
      for (const capability of requiredCapabilities) {
        assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: product feature '${productFeature}' references unknown native capability '${capability}'`);
        assert(nativeCapabilities.includes(capability), `${appKey}: product feature '${productFeature}' requires undeclared native capability '${capability}'`);
      }
      if (requiredCapabilities.includes("localAuthentication")) biometricFeatureOwners.push(`${appKey}.${productFeature}`);
      if (requiredCapabilities.includes("application")) applicationFeatureOwners.push(`${appKey}.${productFeature}`);
      if (requiredCapabilities.includes("device")) deviceFeatureOwners.push(`${appKey}.${productFeature}`);
    }
  }

  if (manifest.global.systemArchitecture?.owners?.biometricUnlock?.status === "REQUIREMENT_REVIEW_PENDING") {
    assert(
      sameArray(biometricCapabilityApps, REQUIRED_BIOMETRIC_DECLARED_APPS),
      `biometric capability declarations must remain ${REQUIRED_BIOMETRIC_DECLARED_APPS.join(", ")} until the product decision is closed`,
    );
    assert(
      biometricFeatureOwners.length === 0,
      `biometric unlock is requirement-pending and cannot be bound to product features yet: ${biometricFeatureOwners.join(", ")}`,
    );
  }

  if (manifest.global.systemArchitecture?.owners?.applicationMetadata?.status === "CONSUMER_REVIEW_PENDING") {
    assert(
      sameArray(applicationCapabilityApps, REQUIRED_METADATA_DECLARED_APPS),
      `application metadata capability declarations must remain ${REQUIRED_METADATA_DECLARED_APPS.join(", ")} until consumer review closes`,
    );
    assert(
      applicationFeatureOwners.length === 0,
      `application metadata is consumer-review-pending and cannot be bound to product features without proof: ${applicationFeatureOwners.join(", ")}`,
    );
  }

  if (manifest.global.systemArchitecture?.owners?.deviceMetadata?.status === "CONSUMER_REVIEW_PENDING") {
    assert(
      sameArray(deviceCapabilityApps, REQUIRED_METADATA_DECLARED_APPS),
      `device metadata capability declarations must remain ${REQUIRED_METADATA_DECLARED_APPS.join(", ")} until consumer review closes`,
    );
    assert(
      deviceFeatureOwners.length === 0,
      `device metadata is consumer-review-pending and cannot be bound to product features without proof: ${deviceFeatureOwners.join(", ")}`,
    );
  }

  return manifest;
}

module.exports = {
  KNOWN_NATIVE_CAPABILITIES,
  REQUIRED_NAVIGATION_APPS,
  REQUIRED_NAVIGATION_STABILITY_GATES,
  REQUIRED_NAVIGATION_MIGRATION_ORDER,
  REQUIRED_BIOMETRIC_DECLARED_APPS,
  REQUIRED_METADATA_DECLARED_APPS,
  REQUIRED_MEDIA_OWNERS,
  REQUIRED_MEDIA_RULES,
  REQUIRED_MOBILITY_OWNERS,
  REQUIRED_MOBILITY_RULES,
  REQUIRED_SYSTEM_OWNERS,
  REQUIRED_SYSTEM_RULES,
  validateMobileFeatureCapabilityManifest,
};
