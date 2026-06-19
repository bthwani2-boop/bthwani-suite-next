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
      projectId: "الصق_PROJECT_ID_الحقيقي_هنا"
    }
  }
};

export default config;

