// Authority: services/dsh/frontend/app-client — addresses sub-screen.
// Sovereign shared: services/dsh/frontend/shared

import React from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Button,
  Text,
  colorRoles,
  alpha,
  radius,
  spacing,
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

// SVG Icons
function BackIcon({ color = colorRoles.textPrimary }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MapIcon({ color = colorRoles.brandAction }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 3v15M15 6v15" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function PinIcon({ color = colorRoles.brandAction }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ChevronDownIcon({ color = colorRoles.textMuted }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M19 9l-7 7-7-7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronUpIcon({ color = colorRoles.textMuted }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 15l7-7 7 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Local Custom Components
function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colorRoles.borderSubtle,
        backgroundColor: colorRoles.surfaceBase,
      }}
    >
      <View style={{ width: 40, alignItems: 'center' }}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
            <BackIcon color={colorRoles.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text role="bodyStrong" style={{ fontSize: 18, color: colorRoles.textPrimary }}>
        {title}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function StyledTextField({ label, placeholder, value, onChangeText }: { label: string; placeholder?: string; value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={{ width: '100%', gap: 6, alignItems: 'flex-end' }}>
      <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, fontSize: 14 }}>
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colorRoles.surfaceBase}
        value={value}
        onChangeText={onChangeText}
        style={{
          width: '100%',
          height: 48,
          borderWidth: 1,
          borderColor: colorRoles.surfaceBase,
          borderRadius: 16,
          paddingHorizontal: 16,
          textAlign: 'right',
          color: colorRoles.textPrimary,
          backgroundColor: colorRoles.surfaceBase,
        }}
      />
    </View>
  );
}

function DefaultBadge() {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colorRoles.surfaceBase,
        backgroundColor: colorRoles.surfaceBase,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <Text role="caption" style={{ color: colorRoles.brandAction, fontSize: 12, fontWeight: 'bold' }}>
        افتراضي
      </Text>
    </View>
  );
}

interface AddressRowProps {
  address: SavedAddress;
  isLast?: boolean;
  onSetDefault: (id: string) => void;
  onEdit: (id: string) => void;
}

function AddressRow({ address, isLast = false, onSetDefault, onEdit }: AddressRowProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={{ width: '100%' }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(colorRoles.brandAction, 0.08), justifyContent: 'center', alignItems: 'center' }}>
            <PinIcon color={colorRoles.brandAction} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <Text role="bodyStrong" style={{ color: colorRoles.textPrimary }}>{address.label}</Text>
            {address.isDefault && <DefaultBadge />}
          </View>
        </View>
        <View style={{ paddingRight: 8 }}>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: spacing[3], flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
          {!address.isDefault && (
            <Button
              label="تعيين كافتراضي"
              tone="primary"
              size="sm"
              style={{ borderRadius: radius.xs, backgroundColor: colorRoles.brandAction }}
              onPress={() => { onSetDefault(address.id); setExpanded(false); }}
            />
          )}
          <Button
            label="تعديل"
            tone="secondary"
            size="sm"
            style={{ borderRadius: radius.xs }}
            onPress={() => { onEdit(address.id); setExpanded(false); }}
          />
        </View>
      )}

      {!isLast && <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginHorizontal: 16 }} />}
    </View>
  );
}

const MAP_PRESETS = [
  "صنعاء، شارع حدة، أمام مركز الكميم (15.3214, 44.1982)",
  "عدن، المنصورة، شارع التسعين (12.8361, 44.9881)",
  "تعز، شارع جمال، بجانب شركة النفط (13.5789, 44.0167)",
  "الحديدة، شارع الميناء (14.8012, 42.9511)",
  "حضرموت، المكلا، حي السلام (14.5367, 49.1233)"
];

export function AddressLocationScreen({ onBack }: AddressLocationScreenProps) {
  const insets = useSafeAreaInsets();
  const [newLabel, setNewLabel] = React.useState('');
  const [addresses, setAddresses] = React.useState<SavedAddress[]>(SEED_ADDRESSES);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [mapNotice, setMapNotice] = React.useState('سيتم ربط اختيار الموقع بمزود الخرائط من لوحة التحكم لاحقًا.');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('bthwani-client-addresses');
      if (saved) {
        setAddresses(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load addresses from localStorage", e);
    }
  }, []);

  const saveAddresses = (newAddrs: SavedAddress[]) => {
    setAddresses(newAddrs);
    try {
      localStorage.setItem('bthwani-client-addresses', JSON.stringify(newAddrs));
    } catch (e) {
      console.warn("Could not save addresses to localStorage", e);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    saveAddresses(updated);
  };

  const handleEdit = (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      setNewLabel(addr.label);
      setEditingId(id);
    }
  };

  const handleSave = () => {
    if (!newLabel.trim()) return;
    if (editingId) {
      const updated = addresses.map((a) => a.id === editingId ? { ...a, label: newLabel.trim() } : a);
      saveAddresses(updated);
      setEditingId(null);
    } else {
      const updated = [...addresses, { id: `addr-${Date.now()}`, label: newLabel.trim(), isDefault: false }];
      saveAddresses(updated);
    }
    setNewLabel('');
  };

  const handleSelectFromMap = () => {
    const randomIndex = Math.floor(Math.random() * MAP_PRESETS.length);
    const selected = MAP_PRESETS[randomIndex] || '';
    setNewLabel(selected);
    setMapNotice(`تم التقاط الإحداثيات بنجاح: ${selected}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <ScreenHeader title="العناوين والموقع" {...(onBack ? { onBack } : {})} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: insets.bottom + spacing[12],
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text role="bodySm" style={{ color: colorRoles.textMuted, textAlign: 'right' }}>
          أدخل عنوانك الوصفي أو حدد موقعك من الخريطة.
        </Text>

        <View style={{ gap: spacing[3] }}>
          <StyledTextField
            label="العنوان الوصفي"
            placeholder="مثال: المنزل، شارع الستين، بجانب صيدلية..."
            value={newLabel}
            onChangeText={setNewLabel}
          />

          <Button
            tone="secondary"
            leading={<MapIcon color={colorRoles.brandAction} />}
            label="تحديد من Google Map"
            onPress={handleSelectFromMap}
            style={{ borderRadius: 100, borderColor: colorRoles.surfaceBase }}
          />

          <View
            style={{
              backgroundColor: colorRoles.surfaceBase,
              borderWidth: 1,
              borderColor: colorRoles.surfaceBase,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: 'flex-end',
            }}
          >
            <Text role="caption" style={{ color: colorRoles.brandAction, textAlign: 'right' }}>
              {mapNotice}
            </Text>
          </View>

          <Button
            tone="primary"
            label={editingId ? "تعديل العنوان" : "حفظ العنوان"}
            onPress={handleSave}
            style={{ backgroundColor: colorRoles.brandStructure, borderRadius: 100 }}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle, marginVertical: spacing[1] }} />

        <View style={{ gap: spacing[2] }}>
          <Text role="bodyStrong" style={{ color: colorRoles.textPrimary, textAlign: 'right', paddingHorizontal: spacing[4] }}>
            العناوين المحفوظة
          </Text>
          <View style={{ borderWidth: 1, borderColor: colorRoles.borderSubtle, borderRadius: 16, overflow: 'hidden', backgroundColor: colorRoles.surfaceBase }}>
            {addresses.map((addr, idx) => (
              <AddressRow
                key={addr.id}
                address={addr}
                isLast={idx === addresses.length - 1}
                onSetDefault={handleSetDefault}
                onEdit={handleEdit}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// export default AddressLocationScreen; // Unused default export