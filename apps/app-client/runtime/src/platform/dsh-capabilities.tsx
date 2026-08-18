import React from "react";
import { Linking, Platform } from "react-native";
import * as Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  configureDshLocationAdapter,
  configureDshLinkingAdapter,
  configureDshMobileNotificationRuntime,
  configureDshVideoRenderer,
  createDshBrowserLocationAdapter,
  createDshExpoLocationAdapter,
  createDshExpoNotificationRuntime,
  type DshVideoSurfaceProps,
} from "../../../../../services/dsh/frontend/shared/mobile-capabilities";
import { VideoView, useVideoPlayer } from "expo-video";

const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";

configureDshLocationAdapter(
  platform === "web" ? createDshBrowserLocationAdapter() : createDshExpoLocationAdapter(Location),
);
configureDshLinkingAdapter({
  getInitialUrl: () => Linking.getInitialURL(),
  addUrlListener: (listener) => Linking.addEventListener("url", ({ url }) => listener(url)),
});

configureDshMobileNotificationRuntime(createDshExpoNotificationRuntime({
  platform,
  notifications: Notifications,
  constants: Constants,
  secureStore: SecureStore,
  crypto: Crypto,
  linking: Linking,
}));

function DshRuntimeVideoSurface({ uri, active, style }: DshVideoSurfaceProps) {
  const player = useVideoPlayer({ uri, useCaching: true }, (instance) => {
    instance.loop = true;
  });

  React.useEffect(() => {
    if (active) player.play();
    else player.pause();
    return () => player.pause();
  }, [active, player]);

  return (
    <VideoView
      player={player}
      style={style as never}
      nativeControls={false}
      contentFit="cover"
      surfaceType="textureView"
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
    />
  );
}

configureDshVideoRenderer(DshRuntimeVideoSurface);
