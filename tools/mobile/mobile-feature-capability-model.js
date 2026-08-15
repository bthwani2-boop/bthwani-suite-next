const KNOWN_NATIVE_CAPABILITIES = new Set([
  "router",
  "updates",
  "constants",
  "application",
  "device",
  "crypto",
  "image",
  "battery",
  "splashScreen",
  "localization",
  "localAuthentication",
  "fileSystem",
  "documentPicker",
  "imagePicker",
  "secureStore",
  "notifications",
  "audio",
  "camera",
  "video",
  "imageManipulator",
  "sharing",
  "webBrowser",
  "keepAwake",
  "sqlite",
  "location",
  "backgroundLocation",
  "maps",
  "taskManager",
  "backgroundTask",
]);

const REQUIRED_NAVIGATION_APPS = [
  "app-client",
  "app-partner",
  "app-captain",
  "app-field",
];

const REQUIRED_NAVIGATION_STABILITY_GATES = [
  "productJourneys",
  "backendContracts",
  "mobileAppShell",
  "deepLinksAndNotifications",
  "regressionBaseline",
  "routeContracts",
  "parityTests",
];

const REQUIRED_NAVIGATION_MIGRATION_ORDER = [
  "app-field",
  "app-captain",
  "app-partner",
  "app-client",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameArray(left, right) {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function validateNavigationArchitecture(globalConfig) {
  const navigation = globalConfig?.navigationArchitecture;
  assert(isPlainObject(navigation), "mobile navigation architecture decision is required");
  assert(navigation.target === "expo-router", "mobile navigation target must be expo-router");
  assert(
    navigation.decision === "ADOPTED_TARGET_ARCHITECTURE",
    "Expo Router must remain the adopted target navigation architecture",
  );
  assert(
    navigation.implementation === "DEFERRED_UNTIL_STABILITY",
    "Expo Router migration must remain deferred until the stability gates are deliberately closed",
  );
  assert(
    sameArray(navigation.appliesTo, REQUIRED_NAVIGATION_APPS),
    `Expo Router target architecture must apply to ${REQUIRED_NAVIGATION_APPS.join(", ")}`,
  );
  assert(
    navigation.migrationMode === "ONE_APP_AT_A_TIME_FAIL_CLOSED",
    "Expo Router migration must be one app at a time and fail-closed",
  );
  assert(
    navigation.remoteBuildNow === false,
    "The architecture decision must not trigger an EAS remote build",
  );
  assert(
    sameArray(navigation.migrationOrder, REQUIRED_NAVIGATION_MIGRATION_ORDER),
    `Expo Router migration order must be ${REQUIRED_NAVIGATION_MIGRATION_ORDER.join(" -> ")}`,
  );
  assert(
    sameArray(navigation.requiredStabilityGates, REQUIRED_NAVIGATION_STABILITY_GATES),
    "Expo Router stability gates must remain explicit and ordered",
  );
}

function validateMobileFeatureCapabilityManifest(manifest) {
  assert(isPlainObject(manifest), "mobile manifest must be an object");
  assert(manifest.global?.capabilityModelVersion === 1, "mobile capability model version must be 1");
  validateNavigationArchitecture(manifest.global);
  assert(isPlainObject(manifest.apps) && Object.keys(manifest.apps).length > 0, "mobile manifest apps are required");

  for (const [appKey, app] of Object.entries(manifest.apps)) {
    assert(!Object.prototype.hasOwnProperty.call(app, "features"), `${appKey}: legacy 'features' is forbidden; use productFeatures + nativeCapabilities`);

    const nativeCapabilities = app.nativeCapabilities;
    assert(Array.isArray(nativeCapabilities) && nativeCapabilities.length > 0, `${appKey}: nativeCapabilities must be a non-empty array`);
    assert(new Set(nativeCapabilities).size === nativeCapabilities.length, `${appKey}: nativeCapabilities must not contain duplicates`);

    for (const capability of nativeCapabilities) {
      assert(typeof capability === "string" && KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: unknown native capability '${capability}'`);
    }

    assert(isPlainObject(app.productFeatures) && Object.keys(app.productFeatures).length > 0, `${appKey}: productFeatures must be a non-empty object`);

    for (const [productFeature, requiredCapabilities] of Object.entries(app.productFeatures)) {
      assert(/^[a-z][A-Za-z0-9]*$/.test(productFeature), `${appKey}: invalid product feature id '${productFeature}'`);
      assert(Array.isArray(requiredCapabilities), `${appKey}: product feature '${productFeature}' must map to an array of native capabilities`);
      assert(new Set(requiredCapabilities).size === requiredCapabilities.length, `${appKey}: product feature '${productFeature}' has duplicate native capability requirements`);

      for (const capability of requiredCapabilities) {
        assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: product feature '${productFeature}' references unknown native capability '${capability}'`);
        assert(nativeCapabilities.includes(capability), `${appKey}: product feature '${productFeature}' requires undeclared native capability '${capability}'`);
      }
    }
  }

  return manifest;
}

module.exports = {
  KNOWN_NATIVE_CAPABILITIES,
  REQUIRED_NAVIGATION_APPS,
  REQUIRED_NAVIGATION_STABILITY_GATES,
  REQUIRED_NAVIGATION_MIGRATION_ORDER,
  validateMobileFeatureCapabilityManifest,
};
