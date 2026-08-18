const KNOWN_NATIVE_CAPABILITIES = new Set([
  "router", "updates", "constants", "application", "device", "crypto", "image", "battery",
  "splashScreen", "localization", "localAuthentication", "fileSystem", "documentPicker", "imagePicker",
  "secureStore", "notifications", "audio", "camera", "video", "imageManipulator", "sharing", "webBrowser",
  "keepAwake", "sqlite", "location", "backgroundLocation", "maps", "taskManager", "backgroundTask",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateGlobal(globalConfig) {
  assert(isPlainObject(globalConfig), "mobile manifest global config is required");
  for (const key of ["owner", "appLine", "sourceRepo", "version", "node", "pnpm", "runtimeTypeScript"]) {
    assert(typeof globalConfig[key] === "string" && globalConfig[key].trim(), `mobile global.${key} is required`);
  }
  assert(globalConfig.capabilityModelVersion === 1, "mobile capability model version must be 1");
}

function validateApp(appKey, app) {
  assert(isPlainObject(app), `${appKey}: app manifest entry must be an object`);
  for (const key of ["name", "slug", "scheme", "androidPackage", "iosBundleIdentifier", "projectId"]) {
    assert(typeof app[key] === "string" && app[key].trim(), `${appKey}: ${key} is required`);
  }
  assert(!Object.prototype.hasOwnProperty.call(app, "features"), `${appKey}: legacy 'features' is forbidden; use productFeatures + nativeCapabilities`);

  const nativeCapabilities = app.nativeCapabilities;
  assert(Array.isArray(nativeCapabilities) && nativeCapabilities.length > 0, `${appKey}: nativeCapabilities must be a non-empty array`);
  assert(new Set(nativeCapabilities).size === nativeCapabilities.length, `${appKey}: nativeCapabilities must not contain duplicates`);
  for (const capability of nativeCapabilities) {
    assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: unknown native capability '${capability}'`);
  }

  assert(isPlainObject(app.productFeatures) && Object.keys(app.productFeatures).length > 0, `${appKey}: productFeatures must be a non-empty object`);
  for (const [productFeature, requiredCapabilities] of Object.entries(app.productFeatures)) {
    assert(/^[a-z][A-Za-z0-9]*$/.test(productFeature), `${appKey}: invalid product feature id '${productFeature}'`);
    assert(Array.isArray(requiredCapabilities), `${appKey}: product feature '${productFeature}' must map to an array`);
    assert(new Set(requiredCapabilities).size === requiredCapabilities.length, `${appKey}: product feature '${productFeature}' has duplicate capability requirements`);
    for (const capability of requiredCapabilities) {
      assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: product feature '${productFeature}' references unknown capability '${capability}'`);
      assert(nativeCapabilities.includes(capability), `${appKey}: product feature '${productFeature}' requires undeclared capability '${capability}'`);
    }
  }
}

function validateMobileFeatureCapabilityManifest(manifest) {
  assert(isPlainObject(manifest), "mobile manifest must be an object");
  validateGlobal(manifest.global);
  assert(isPlainObject(manifest.apps) && Object.keys(manifest.apps).length > 0, "mobile manifest apps are required");
  for (const [appKey, app] of Object.entries(manifest.apps)) validateApp(appKey, app);
  return manifest;
}

module.exports = {
  KNOWN_NATIVE_CAPABILITIES,
  validateMobileFeatureCapabilityManifest,
};
