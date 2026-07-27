import { defineBthwaniExpoApp } from "../../../tools/mobile/defineBthwaniExpoApp";

const config = defineBthwaniExpoApp("app-client");

export default {
  ...config,
  userInterfaceStyle: "automatic" as const,
  plugins: (config.plugins ?? []).map((plugin: NonNullable<typeof config.plugins>[number]) =>
    plugin === "expo-video"
      ? ["expo-video", { supportsPictureInPicture: true }]
      : plugin,
  ),
};
