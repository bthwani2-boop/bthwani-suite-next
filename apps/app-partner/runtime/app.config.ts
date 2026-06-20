
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "app-partner-next",
  slug: "app-partner-next",
  owner: "bthwani1",

  platforms: ["ios", "android"],

  scheme: "bthwani-partner-next",
  version: "0.1.0",

  orientation: "portrait",
  userInterfaceStyle: "light",

  android: {
    package: "com.bthwani.partner.next"
  },

  ios: {
    bundleIdentifier: "com.bthwani.partner.next"
  },

  extra: {
      eas: {
        projectId: "4cde7be0-7582-4a6b-9ae0-d74f2d149580"
      },
    appKey: "app-partner",
    appLine: "next",
    sourceRepo: "bthwani-suite-next"
  }
};

export default config;
