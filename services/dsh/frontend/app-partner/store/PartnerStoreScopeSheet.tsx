import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import { Button, Icon, Surface, Text, colorRoles, spacing } from "@bthwani/ui-kit";
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

  const scopeLabel = options.length > 1 ? "اختيار الفرع النشط" : "بيانات المتجر";
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />
          
          <View style={styles.headerRow}>
            <Text role="titleMd" style={styles.sheetTitle}>{scopeLabel}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Icon name="close-outline" size={24} tone="muted" />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.optionsList}>
              {options.map((option) => {
                const isSelected = option.scopeId === selectedId;
                return (
                  <Pressable
                    key={option.scopeId}
                    style={[styles.scopeOptionItem, isSelected && styles.scopeOptionItemSelected]}
                    onPress={() => {
                      onSelect(option.scopeId);
                      onClose();
                    }}
                  >
                    <Icon
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      tone={isSelected ? "brand" : "muted"}
                    />
                    <View style={styles.optionInfo}>
                      <Text role="bodyStrong" style={isSelected ? styles.optionTextSelected : undefined}>
                        {option.displayName}
                      </Text>
                      <Text role="caption" tone="muted">
                        {option.role === 'owner' ? 'المالك' : option.role === 'manager' ? 'مدير الفرع' : 'طاقم العمل'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.locationSection}>
              <Text role="bodyStrong" style={styles.sectionTitle}>
                سياق الموقع · {selectedScope?.displayName ?? "لا يوجد فرع محدد"}
              </Text>
              
              <Button
                label={locating ? "جارٍ تحديد الموقع…" : "عرض موقعي الحالي على الخريطة"}
                tone="secondary"
                size="sm"
                disabled={locating}
                onPress={() => void locateDevice()}
              />
              
              {locationError ? (
                <Text role="caption" tone="danger" style={styles.errorText}>
                  {locationError}
                </Text>
              ) : null}

              <View style={styles.mapWrapper}>
                <BthwaniNativeMap
                  selectedCoordinate={deviceCoordinate}
                  showsUserLocation
                  height={200}
                  accessibilityLabel="خريطة موقع الشريك بالنسبة للفرع المحدد"
                  emptyLabel="اعرض موقع الجهاز للتحقق من سياق الفرع الحالي."
                />
              </View>

              <Text role="caption" tone="muted" style={styles.disclaimerText}>
                هذه قراءة تشغيلية للموقع فقط؛ تعديل إحداثيات الفرع يبقى عبر مسار الميداني والمنصة المحكوم.
              </Text>
            </View>
          </ScrollView>

          <Button label="تم" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colorRoles.mediaScrimStrong,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colorRoles.surfaceBase,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[5],
    gap: spacing[3],
    shadowColor: colorRoles.shadowBase,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colorRoles.borderSubtle,
    alignSelf: "center",
    marginBottom: spacing[2],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colorRoles.borderSubtle,
  },
  sheetTitle: {
    color: colorRoles.textPrimary,
  },
  closeButton: {
    padding: spacing[1],
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    gap: spacing[4],
    paddingVertical: spacing[2],
  },
  optionsList: {
    gap: spacing[2],
  },
  scopeOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: 12,
    backgroundColor: colorRoles.surfaceMuted,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
    gap: spacing[3],
  },
  scopeOptionItemSelected: {
    borderColor: colorRoles.brandAction,
    backgroundColor: colorRoles.brandActionSoft,
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionTextSelected: {
    color: colorRoles.brandAction,
  },
  locationSection: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  sectionTitle: {
    color: colorRoles.textPrimary,
  },
  errorText: {
    marginTop: spacing[1],
  },
  mapWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  disclaimerText: {
    lineHeight: 18,
  },
});
