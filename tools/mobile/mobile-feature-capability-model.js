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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateMobileFeatureCapabilityManifest(manifest) {
  assert(isPlainObject(manifest), "mobile manifest must be an object");
  assert(manifest.global?.capabilityModelVersion === 1, "mobile capability model version must be 1");
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
  validateMobileFeatureCapabilityManifest,
};
