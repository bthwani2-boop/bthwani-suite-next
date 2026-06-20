
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
    appKey: "app-captain",
    appLine: "next",
    sourceRepo: "bthwani-suite-next"
  }
};

export default config;
