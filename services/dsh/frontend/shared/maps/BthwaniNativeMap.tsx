import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, colorRoles, radius, spacing } from "@bthwani/ui-kit";
import { getDshMapRenderer, type DshMapCoordinate, type DshMapProps } from "../mobile-capabilities";

export type BthwaniMapCoordinate = DshMapCoordinate;

export type BthwaniNativeMapProps = DshMapProps & {
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
  const MapRenderer = getDshMapRenderer();
  const firstMarker = markers.find(isFiniteCoordinate);
  const center = isFiniteCoordinate(selectedCoordinate)
    ? selectedCoordinate
    : firstMarker ?? DEFAULT_CENTER;

  const validMarkers = markers.filter(isFiniteCoordinate);
  const hasSelectedCoordinate = isFiniteCoordinate(selectedCoordinate);

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      {MapRenderer ? (
        <MapRenderer
          {...(selectedCoordinate !== undefined ? { selectedCoordinate } : {})}
          markers={validMarkers}
          {...(onCoordinatePress ? { onCoordinatePress } : {})}
          showsUserLocation={showsUserLocation}
          height={height}
          latitudeDelta={latitudeDelta}
          longitudeDelta={longitudeDelta}
        />
      ) : null}
      {(!MapRenderer || (!hasSelectedCoordinate && validMarkers.length === 0)) ? (
        <View pointerEvents="none" style={styles.emptyOverlay}>
          <Text role="bodySm" tone="muted" style={styles.rtl}>
            {MapRenderer ? emptyLabel : "الخريطة غير متاحة في هذا runtime."}
          </Text>
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
