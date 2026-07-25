import React from "react";
import { View } from "react-native";
import * as Location from "expo-location";
import { Button, Surface, Text, spacing } from "@bthwani/ui-kit";
import type { DshPartnerOperationalScope } from "../../shared/partner/partner.types";
import {
  BthwaniNativeMap,
  type BthwaniMapCoordinate,
} from "../../shared/maps";

export function PartnerStoreScopeSheet({
  visible,
  onClose,
  options,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  options: readonly DshPartnerOperationalScope[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [deviceCoordinate, setDeviceCoordinate] = React.useState<BthwaniMapCoordinate | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  if (!visible) return null;
  const scopeLabel = options.length > 1 ? "الفروع" : "المتجر";
  const selectedScope = options.find((option) => option.scopeId === selectedId) ?? null;

  const locateDevice = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("صلاحية الموقع مطلوبة لعرض موقع الجهاز بالنسبة للفرع.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (position.mocked === true) {
        setLocationError("تم رفض موقع صادر من مزود وهمي.");
        return;
      }
      setDeviceCoordinate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError("تعذر قراءة موقع الجهاز الحالي.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <Surface tone="raised" padding={5} gap={4} radiusToken="xl" border={false} style={{ margin: spacing[4] }}>
      <Text role="titleMd">{scopeLabel}</Text>
      {options.map((option) => (
        <Button
          key={option.scopeId}
          label={option.displayName}
          tone={option.scopeId === selectedId ? "primary" : "secondary"}
          onPress={() => onSelect(option.scopeId)}
        />
      ))}

      <View style={{ gap: spacing[2] }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>
          سياق الموقع · {selectedScope?.displayName ?? "لا يوجد فرع محدد"}
        </Text>
        <Button
          label={locating ? "جارٍ تحديد الموقع…" : "عرض موقعي الحالي على الخريطة"}
          tone="secondary"
          size="sm"
          disabled={locating}
          onPress={() => void locateDevice()}
        />
        {locationError ? <Text role="caption" tone="danger" style={{ textAlign: "right" }}>{locationError}</Text> : null}
        <BthwaniNativeMap
          selectedCoordinate={deviceCoordinate}
          showsUserLocation
          height={220}
          accessibilityLabel="خريطة موقع الشريك بالنسبة للفرع المحدد"
          emptyLabel="اعرض موقع الجهاز للتحقق من سياق الفرع الحالي."
        />
        <Text role="caption" tone="muted" style={{ textAlign: "right" }}>
          هذه قراءة تشغيلية للموقع فقط؛ تعديل إحداثيات الفرع يبقى عبر مسار الميداني والمنصة المحكوم.
        </Text>
      </View>

      <Button label="إغلاق" onPress={onClose} />
    </Surface>
  );
}
