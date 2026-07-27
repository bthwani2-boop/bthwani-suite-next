import type { ExpoConfig } from "expo/config";
import { defineBthwaniExpoApp } from "../../../tools/mobile/defineBthwaniExpoApp";

const config = defineBthwaniExpoApp("app-client");
const plugins: NonNullable<ExpoConfig["plugins"]> = (config.plugins ?? []).map((plugin) =>
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
