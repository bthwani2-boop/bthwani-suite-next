// Authority: services/dsh/frontend/app-client — addresses sub-screen.
// Sovereign shared: services/dsh/frontend/shared
// Maps provider integration: wired via control-panel/platform/Providers (future phase).

import React from 'react';
import { View } from 'react-native';
import {
  ActionStrip,
  Badge,
  Box,
  Button,
  Divider,
  Icon,
  MobileScrollView,
  Text,
  TextField,
  TopBar,
  radius,
  safeArea,
  spacing,
  useTheme,
} from '@bthwani/ui-kit';

export type AddressLocationScreenProps = {
  onBack?: () => void;
};

type SavedAddress = {
  id: string;
  label: string;
  isDefault: boolean;
};

const SEED_ADDRESSES: SavedAddress[] = [
  { id: 'addr-home',  label: 'المنزل',      isDefault: true  },
  { id: 'addr-work',  label: 'العمل',        isDefault: false },
  { id: 'addr-other', label: 'عنوان آخر',   isDefault: false },
];

interface AddressRowProps {
  address: SavedAddress;
  isLast?: boolean;
  onSetDefault: (id: string) => void;
  onEdit: (id: string) => void;
}

function AddressRow({ address, isLast = false, onSetDefault, onEdit }: AddressRowProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <ActionStrip
      icon={address.isDefault ? 'location' : 'location-outline'}
      title={address.label}
      subtitle={
        address.isDefault ? (
          <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
            <Badge label="افتراضي" tone="brand" />
          </View>
        ) : undefined
      }
      expanded={expanded}
      onPress={() => setExpanded(!expanded)}
      hideDivider={isLast}
    >
      <View style={{ gap: spacing[3], paddingTop: spacing[1] }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: spacing[2], marginTop: spacing[1] }}>
          {!address.isDefault && (
            <Button
              label="تعيين كافتراضي"
              tone="brand"
              size="sm"
              fullWidth={false}
              style={{ borderRadius: radius.xs2 }}
              onPress={() => { onSetDefault(address.id); setExpanded(false); }}
            />
          )}
          <Button
            label="تعديل"
            tone="secondary"
            size="sm"
            fullWidth={false}
            style={{ borderRadius: radius.xs2 }}
            onPress={() => { onEdit(address.id); setExpanded(false); }}
          />
        </View>
      </View>
    </ActionStrip>
  );
}

export function AddressLocationScreen({ onBack }: AddressLocationScreenProps) {
  const { theme } = useTheme();
  const [newLabel, setNewLabel] = React.useState('');
  const [addresses, setAddresses] = React.useState<SavedAddress[]>(SEED_ADDRESSES);

  const handleSetDefault = (id: string) =>
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));

  // Edit wired to Maps provider in a later phase (control-panel/platform/Providers)
  const handleEdit = (_id: string) => {};

  const handleSave = () => {
    if (!newLabel.trim()) return;
    setAddresses((prev) => [...prev, { id: `addr-${Date.now()}`, label: newLabel.trim(), isDefault: false }]);
    setNewLabel('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        variant="surface"
        title="العناوين والموقع"
        actions={
          onBack
            ? [{ id: 'back', icon: <Icon name="chevron-back" mirrored size={18} />, accessibilityLabel: 'العودة', onPress: onBack }]
            : []
        }
      />

      <MobileScrollView
        fill
        padding={4}
        gap={4}
        contentContainerStyle={{ paddingBottom: safeArea.comfortable + spacing[12] }}
      >
        <Text role="bodySm" tone="muted" style={{ textAlign: 'right' }}>
          أدخل عنوانك الوصفي أو حدد موقعك من الخريطة.
        </Text>

        <Box gap={3}>
          <TextField
            label="العنوان الوصفي"
            placeholder="مثال: المنزل، شارع الستين، بجانب صيدلية..."
            value={newLabel}
            onChangeText={setNewLabel}
            returnKeyType="done"
            textAlign="right"
          />

          <Button
            tone="secondary"
            leadingAccessory={<Icon name="map-outline" size={18} color={theme.brand} />}
            label="تحديد من الخريطة"
            onPress={() => { /* Maps provider — control-panel/platform/Providers future phase */ }}
          />

          <View
            style={{
              backgroundColor: theme.brandSurface,
              borderRadius: radius.sm2,
              borderWidth: 1,
              borderColor: theme.line,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
            }}
          >
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
              سيتم ربط اختيار الموقع بمزود الخرائط من لوحة التحكم لاحقًا.
            </Text>
          </View>

          <Button tone="brand" label="حفظ العنوان" onPress={handleSave} />
        </Box>

        <Divider style={{ marginVertical: spacing[1] }} />

        <View style={{ marginTop: spacing[4], gap: spacing[2] }}>
          <Text role="bodyStrong" tone="muted" style={{ textAlign: 'right', paddingHorizontal: spacing[4] }}>
            العناوين المحفوظة
          </Text>
          <Divider />
          {addresses.map((addr, idx) => (
            <AddressRow
              key={addr.id}
              address={addr}
              isLast={idx === addresses.length - 1}
              onSetDefault={handleSetDefault}
              onEdit={handleEdit}
            />
          ))}
          <Divider />
        </View>
      </MobileScrollView>
    </View>
  );
}

export default AddressLocationScreen;
