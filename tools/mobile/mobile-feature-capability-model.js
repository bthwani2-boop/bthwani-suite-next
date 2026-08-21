const KNOWN_NATIVE_CAPABILITIES = new Set([
  "router", "updates", "constants", "application", "device", "crypto", "image", "battery",
  "splashScreen", "localization", "localAuthentication", "fileSystem", "documentPicker", "imagePicker",
  "secureStore", "notifications", "audio", "camera", "video", "imageManipulator", "sharing", "webBrowser",
  "haptics", "keepAwake", "sqlite", "location", "backgroundLocation", "maps", "taskManager", "backgroundTask",
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
  assert(globalConfig.capabilityModelVersion === 2, "mobile capability model version must be 2");
}

function validateOwnershipMap(appKey, ownerKind, ownership, nativeCapabilities, options = {}) {
  const { allowEmptyCapabilities = false } = options;
  assert(isPlainObject(ownership) && Object.keys(ownership).length > 0, `${appKey}: ${ownerKind} must be a non-empty object`);

  const ownedCapabilities = new Set();
  for (const [ownerId, requiredCapabilities] of Object.entries(ownership)) {
    assert(/^[a-z][A-Za-z0-9]*$/.test(ownerId), `${appKey}: invalid ${ownerKind} id '${ownerId}'`);
    assert(Array.isArray(requiredCapabilities), `${appKey}: ${ownerKind} '${ownerId}' must map to an array`);
    if (!allowEmptyCapabilities) {
      assert(requiredCapabilities.length > 0, `${appKey}: ${ownerKind} '${ownerId}' must own at least one capability`);
    }
    assert(new Set(requiredCapabilities).size === requiredCapabilities.length, `${appKey}: ${ownerKind} '${ownerId}' has duplicate capability requirements`);
    for (const capability of requiredCapabilities) {
      assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: ${ownerKind} '${ownerId}' references unknown capability '${capability}'`);
      assert(nativeCapabilities.includes(capability), `${appKey}: ${ownerKind} '${ownerId}' requires undeclared capability '${capability}'`);
      ownedCapabilities.add(capability);
    }
  }
  return ownedCapabilities;
}

function validateApp(appKey, app) {
  assert(isPlainObject(app), `${appKey}: app manifest entry must be an object`);
  for (const key of ["name", "slug", "scheme", "androidPackage", "iosBundleIdentifier", "projectId"]) {
    assert(typeof app[key] === "string" && app[key].trim(), `${appKey}: ${key} is required`);
  }
  assert(!Object.prototype.hasOwnProperty.call(app, "features"), `${appKey}: legacy 'features' is forbidden; use productFeatures + runtimeConcerns + nativeCapabilities`);

  const nativeCapabilities = app.nativeCapabilities;
  assert(Array.isArray(nativeCapabilities) && nativeCapabilities.length > 0, `${appKey}: nativeCapabilities must be a non-empty array`);
  assert(new Set(nativeCapabilities).size === nativeCapabilities.length, `${appKey}: nativeCapabilities must not contain duplicates`);
  for (const capability of nativeCapabilities) {
    assert(KNOWN_NATIVE_CAPABILITIES.has(capability), `${appKey}: unknown native capability '${capability}'`);
  }

  const productOwnedCapabilities = validateOwnershipMap(
    appKey,
    "productFeatures",
    app.productFeatures,
    nativeCapabilities,
    { allowEmptyCapabilities: true },
  );
  const runtimeOwnedCapabilities = validateOwnershipMap(
    appKey,
    "runtimeConcerns",
    app.runtimeConcerns,
    nativeCapabilities,
  );

  const justifiedCapabilities = new Set([...productOwnedCapabilities, ...runtimeOwnedCapabilities]);
  for (const capability of nativeCapabilities) {
    assert(
      justifiedCapabilities.has(capability),
      `${appKey}: native capability '${capability}' has no product feature or runtime concern owner`,
    );
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
