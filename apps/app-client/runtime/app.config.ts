import type { ExpoConfig } from "expo/config";
import { defineBthwaniExpoApp } from "../../../tools/mobile/defineBthwaniExpoApp";

const config = defineBthwaniExpoApp("app-client");
type ExpoPlugin = NonNullable<ExpoConfig["plugins"]>[number];
const plugins = (config.plugins ?? []).map<ExpoPlugin>((plugin: ExpoPlugin) =>
  plugin === "expo-video"
    ? ["expo-video", { supportsPictureInPicture: true }]
    : plugin,
);

const appConfig: ExpoConfig = {
  ...config,
  userInterfaceStyle: "light",
  plugins,
};

export default appConfig;
