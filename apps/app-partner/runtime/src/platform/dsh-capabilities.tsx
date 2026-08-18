import React from "react";
import { Linking, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type MapPressEvent, type Region } from "react-native-maps";
import * as Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { colorRoles } from "@bthwani/ui-kit";
import {
  configureDshImagePickerAdapter,
  configureDshLinkingAdapter,
  configureDshLocationAdapter,
  configureDshMapRenderer,
  configureDshMobileNotificationRuntime,
  createDshBrowserLocationAdapter,
  createDshExpoImagePickerAdapter,
  createDshExpoLocationAdapter,
  createDshExpoNotificationRuntime,
  type DshMapCoordinate,
  type DshMapProps,
} from "@bthwani/dsh/mobile-capabilities";

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

const DEFAULT_CENTER: DshMapCoordinate = { latitude: 15.3694, longitude: 44.191 };

function isFiniteCoordinate(value: DshMapCoordinate | null | undefined): value is DshMapCoordinate {
  return Boolean(
    value
      && Number.isFinite(value.latitude)
      && Number.isFinite(value.longitude)
      && value.latitude >= -90
      && value.latitude <= 90
      && value.longitude >= -180
      && value.longitude <= 180,
  );
}

function mapRegion(coordinate: DshMapCoordinate, latitudeDelta: number, longitudeDelta: number): Region {
  return { latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta, longitudeDelta };
}

function DshRuntimeMap({
  selectedCoordinate,
  markers = [],
  onCoordinatePress,
  showsUserLocation = false,
  height = 260,
  latitudeDelta = 0.025,
  longitudeDelta = 0.025,
}: DshMapProps) {
  const mapRef = React.useRef<MapView | null>(null);
  const firstMarker = markers.find(isFiniteCoordinate);
  const center = isFiniteCoordinate(selectedCoordinate) ? selectedCoordinate : firstMarker ?? DEFAULT_CENTER;
  const selected = isFiniteCoordinate(selectedCoordinate) ? selectedCoordinate : null;
  const validMarkers = markers.filter(isFiniteCoordinate);

  React.useEffect(() => {
    if (!selected) return;
    mapRef.current?.animateToRegion(mapRegion(selected, latitudeDelta, longitudeDelta), 300);
  }, [latitudeDelta, longitudeDelta, selected]);

  const handlePress = (event: MapPressEvent) => {
    const coordinate = event.nativeEvent.coordinate;
    if (onCoordinatePress && isFiniteCoordinate(coordinate)) onCoordinatePress(coordinate);
  };

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      initialRegion={mapRegion(center, latitudeDelta, longitudeDelta)}
      onPress={handlePress}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsUserLocation}
      showsCompass
      toolbarEnabled={false}
      loadingEnabled
      style={{ width: "100%", height }}
    >
      {validMarkers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          title={marker.title}
          {...(marker.description ? { description: marker.description } : {})}
        />
      ))}
      {selected ? <Marker coordinate={selected} title="الموقع المحدد" pinColor={colorRoles.info} /> : null}
    </MapView>
  );
}

configureDshMapRenderer(DshRuntimeMap);
