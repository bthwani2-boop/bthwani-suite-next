import type { ExpoConfig } from "expo/config";

const manifest = {
  "global": {
    "owner": "bthwani1",
    "appLine": "next",
    "sourceRepo": "bthwani-suite-next",
    "version": "0.1.0",
    "node": "24.17.0",
    "pnpm": "10.34.2"
  },
  "apps": {
    "app-client": {
      "name": "app-client-next",
      "slug": "app-client-next",
      "scheme": "bthwani-client-next",
      "androidPackage": "com.bthwani.client.next",
      "iosBundleIdentifier": "com.bthwani.client.next",
      "projectId": "abec897b-1f5f-409d-8286-607a5a6b69e2"
    },
    "app-partner": {
      "name": "app-partner-next",
      "slug": "app-partner-next",
      "scheme": "bthwani-partner-next",
      "androidPackage": "com.bthwani.partner.next",
      "iosBundleIdentifier": "com.bthwani.partner.next",
      "projectId": "4cde7be0-7582-4a6b-9ae0-d74f2d149580"
    },
    "app-captain": {
      "name": "app-captain-next",
      "slug": "app-captain-next",
      "scheme": "bthwani-captain-next",
      "androidPackage": "com.bthwani.captain.next",
      "iosBundleIdentifier": "com.bthwani.captain.next",
      "projectId": "07382a76-4dc5-460f-b4a7-7105d724bae6"
    },
    "app-field": {
      "name": "app-field-next",
      "slug": "app-field-next",
      "scheme": "bthwani-field-next",
      "androidPackage": "com.bthwani.field.next",
      "iosBundleIdentifier": "com.bthwani.field.next",
      "projectId": "08b6c8dc-80a2-4271-9904-d941a3d98914"
    }
  }
} as const;

type BthwaniMobileAppKey = keyof typeof manifest.apps;

export function defineBthwaniExpoApp(appKey: BthwaniMobileAppKey): ExpoConfig {
  const app = manifest.apps[appKey];

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
    }
  };
}
