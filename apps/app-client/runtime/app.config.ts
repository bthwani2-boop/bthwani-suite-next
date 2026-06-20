import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "app-client-next",
  slug: "app-client-next",
  owner: "bthwani1",

  platforms: ["ios", "android"],

  scheme: "bthwani-client-next",
  version: "0.1.0",

  orientation: "portrait",
  userInterfaceStyle: "light",

  android: {
    package: "com.bthwani.client.next"
  },

  ios: {
    bundleIdentifier: "com.bthwani.client.next"
  },

  extra: {
    appKey: "app-client",
    appLine: "next",
    sourceRepo: "bthwani-suite-next",
    eas: {
      projectId: "abec897b-1f5f-409d-8286-607a5a6b69e2"
    }
  }
};

export default config;