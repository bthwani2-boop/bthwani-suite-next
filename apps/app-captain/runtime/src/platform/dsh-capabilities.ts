import { Linking, Platform } from "react-native";
import * as Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  configureDshImagePickerAdapter,
  configureDshLinkingAdapter,
  configureDshLocationAdapter,
  configureDshMobileNotificationRuntime,
  createDshBrowserLocationAdapter,
  createDshExpoImagePickerAdapter,
  createDshExpoLocationAdapter,
  createDshExpoNotificationRuntime,
} from "../../../../../services/dsh/frontend/shared/mobile-capabilities";

const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";

configureDshLocationAdapter(
  platform === "web" ? createDshBrowserLocationAdapter() : createDshExpoLocationAdapter(Location),
);
configureDshLinkingAdapter({
  getInitialUrl: () => Linking.getInitialURL(),
  addUrlListener: (listener) => Linking.addEventListener("url", ({ url }) => listener(url)),
});
configureDshImagePickerAdapter(createDshExpoImagePickerAdapter(ImagePicker));
configureDshMobileNotificationRuntime(createDshExpoNotificationRuntime({
  platform,
  notifications: Notifications,
  constants: Constants,
  secureStore: SecureStore,
  crypto: Crypto,
  linking: Linking,
}));
