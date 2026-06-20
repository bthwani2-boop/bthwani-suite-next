const manifest = require("./mobile-apps.manifest.json");

function defineBthwaniExpoApp(appKey) {
  const app = manifest.apps[appKey];

  if (!app) {
    throw new Error("Unknown BThwani mobile app: " + appKey);
  }

  return {
    name: app.name,
    slug: app.slug,
    owner: manifest.global.owner,

    platforms: ["ios", "android"],

    scheme: app.scheme,
    version: manifest.global.version,

    orientation: "portrait",
    userInterfaceStyle: "light",

    android: {
      package: app.androidPackage
    },

    ios: {
      bundleIdentifier: app.iosBundleIdentifier
    },

    extra: {
      appKey,
      appLine: manifest.global.appLine,
      sourceRepo: manifest.global.sourceRepo,
      eas: {
        projectId: app.projectId
      }
    },
    experiments: {
      reactCompiler: true
    }
  };
}

module.exports = {
  defineBthwaniExpoApp
};
