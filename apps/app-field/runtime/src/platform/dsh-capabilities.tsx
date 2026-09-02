import React from "react";
import { Linking, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { colorRoles } from "@bthwani/ui-kit";
import { configureDshMobileCapabilities } from "@bthwani/dsh/mobile-runtime-capabilities";

const platform = Platform.OS === "android" || Platform.OS === "ios" ? Platform.OS : "web";

configureDshMobileCapabilities({
  platform,
  constants: Constants,
  crypto: Crypto,
  documentPicker: DocumentPicker,
  imagePicker: ImagePicker,
  linking: Linking,
  location: Location,
  map: { React, MapView, Marker, providerGoogle: PROVIDER_GOOGLE, infoColor: colorRoles.info },
  notifications: Notifications,
  secureStore: SecureStore,
});
