import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import { Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";

export type BthwaniMapCoordinate = {
  readonly latitude: number;
  readonly longitude: number;
};

export type BthwaniMapMarker = BthwaniMapCoordinate & {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
};

export type BthwaniNativeMapProps = {
  readonly selectedCoordinate?: BthwaniMapCoordinate | null;
  readonly markers?: readonly BthwaniMapMarker[];
  readonly onCoordinatePress?: (coordinate: BthwaniMapCoordinate) => void;
  readonly showsUserLocation?: boolean;
  readonly height?: number;
  readonly latitudeDelta?: number;
  readonly longitudeDelta?: number;
  readonly emptyLabel?: string;
  readonly accessibilityLabel?: string;
};

const DEFAULT_CENTER: BthwaniMapCoordinate = {
  latitude: 15.3694,
  longitude: 44.1910,
};

function isFiniteCoordinate(
  value: BthwaniMapCoordinate | null | undefined,
): value is BthwaniMapCoordinate {
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

function mapRegion(
  coordinate: BthwaniMapCoordinate,
  latitudeDelta: number,
  longitudeDelta: number,
): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export function BthwaniNativeMap({
  selectedCoordinate,
  markers = [],
  onCoordinatePress,
  showsUserLocation = false,
  height = 260,
  latitudeDelta = 0.025,
  longitudeDelta = 0.025,
  emptyLabel = "حدد موقعًا لعرضه على الخريطة.",
  accessibilityLabel = "خريطة بثواني التفاعلية",
}: BthwaniNativeMapProps): React.ReactElement {
  const mapRef = React.useRef<MapView | null>(null);
  const firstMarker = markers.find(isFiniteCoordinate);
  const center = isFiniteCoordinate(selectedCoordinate)
    ? selectedCoordinate
    : firstMarker ?? DEFAULT_CENTER;

  React.useEffect(() => {
    if (!isFiniteCoordinate(selectedCoordinate)) return;
    mapRef.current?.animateToRegion(
      mapRegion(selectedCoordinate, latitudeDelta, longitudeDelta),
      300,
    );
  }, [latitudeDelta, longitudeDelta, selectedCoordinate]);

  const handlePress = React.useCallback((event: MapPressEvent) => {
    if (!onCoordinatePress) return;
    const coordinate = event.nativeEvent.coordinate;
    if (!isFiniteCoordinate(coordinate)) return;
    onCoordinatePress({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  }, [onCoordinatePress]);

  const validMarkers = markers.filter(isFiniteCoordinate);
  const hasSelectedCoordinate = isFiniteCoordinate(selectedCoordinate);

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
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
        style={[styles.map, { height }]}
      >
        {validMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            description={marker.description}
          />
        ))}
        {hasSelectedCoordinate ? (
          <Marker
            coordinate={{
              latitude: selectedCoordinate.latitude,
              longitude: selectedCoordinate.longitude,
            }}
            title="الموقع المحدد"
            pinColor={colorRoles.brandAction}
          />
        ) : null}
      </MapView>
      {!hasSelectedCoordinate && validMarkers.length === 0 ? (
        <View pointerEvents="none" style={styles.emptyOverlay}>
          <Text role="bodySm" tone="muted" style={styles.rtl}>{emptyLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceMuted,
  },
  map: {
    width: "100%",
  },
  emptyOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[4],
    backgroundColor: colorRoles.surfaceBase,
  },
  rtl: {
    textAlign: "right",
  },
});
