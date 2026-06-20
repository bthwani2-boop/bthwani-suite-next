
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "app-captain-next",
  slug: "app-captain-next",
  owner: "bthwani1",

  platforms: ["ios", "android"],

  scheme: "bthwani-captain-next",
  version: "0.1.0",

  orientation: "portrait",
  userInterfaceStyle: "light",

  android: {
    package: "com.bthwani.captain.next"
  },

  ios: {
    bundleIdentifier: "com.bthwani.captain.next"
  },

  extra: {
      eas: {
        projectId: "07382a76-4dc5-460f-b4a7-7105d724bae6"
      },
    appKey: "app-captain",
    appLine: "next",
    sourceRepo: "bthwani-suite-next"
  }
};

export default config;
