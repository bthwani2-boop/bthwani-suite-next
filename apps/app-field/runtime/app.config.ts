
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "app-field-next",
  slug: "app-field-next",
  owner: "bthwani1",

  platforms: ["ios", "android"],

  scheme: "bthwani-field-next",
  version: "0.1.0",

  orientation: "portrait",
  userInterfaceStyle: "light",

  android: {
    package: "com.bthwani.field.next"
  },

  ios: {
    bundleIdentifier: "com.bthwani.field.next"
  },

  extra: {
    appKey: "app-field",
    appLine: "next",
    sourceRepo: "bthwani-suite-next"
  }
};

export default config;
