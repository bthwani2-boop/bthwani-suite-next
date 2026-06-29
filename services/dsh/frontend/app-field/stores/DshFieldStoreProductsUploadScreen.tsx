// app-field — DshFieldStoreProductsUploadScreen
// Dedicated products list and classification picker screen.
import React from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Text,
  TextField,
  Header,
  IconButton,
  spacing,
  radius,
  borders,
  colorRoles,
  Icon,
} from '@bthwani/ui-kit';

type DshFieldStoreProductsUploadScreenProps = {
  readonly storeId: string;
  readonly onBack: () => void;
};

type ProductItem = {
  readonly id: string;
  readonly name: string;
  readonly price: string;
};

function LocalSelectField({ label, value, options, onValueChange }: any) {
  return (
    <View style={{ gap: spacing[2], width: '100%' }}>
      {label && <Text role="label" style={{ textAlign: 'right' }}>{label}</Text>}
      <View style={{ gap: spacing[2] }}>
        {options.map((opt: any) => {
          const isSelected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onValueChange(opt.value)}
              style={{
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: borders.hairline,
                borderColor: isSelected ? colorRoles.brandAction : colorRoles.borderStrong,
                backgroundColor: isSelected ? colorRoles.brandActionSoft : 'transparent',
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ textAlign: 'right', fontWeight: isSelected ? 'bold' : 'normal' }}>{opt.label}</Text>
              {isSelected && <Text style={{ color: colorRoles.brandAction, fontWeight: 'bold' }}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DshFieldStoreProductsUploadScreen({
  storeId,
  onBack,
}: DshFieldStoreProductsUploadScreenProps) {
  const insets = useSafeAreaInsets();
  const [storeType, setStoreType] = React.useState('retail');
  const [mainCategory, setMainCategory] = React.useState('grocery');
  const [subCategory, setSubCategory] = React.useState('supermarket');

  const [newProductName, setNewProductName] = React.useState('');
  const [newProductPrice, setNewProductPrice] = React.useState('');
  const [errorName, setErrorName] = React.useState<string | undefined>(undefined);
  const [errorPrice, setErrorPrice] = React.useState<string | undefined>(undefined);

  const [items, setItems] = React.useState<readonly ProductItem[]>([]);

  const handleAddProduct = () => {
    if (!newProductName.trim()) {
      setErrorName('اسم المنتج مطلوب لإضافته للقائمة');
      return;
    }
    setErrorName(undefined);

    if (!newProductPrice.trim()) {
      setErrorPrice('سعر المنتج مطلوب');
      return;
    }
    const numericPrice = parseFloat(newProductPrice);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setErrorPrice('سعر المنتج يجب أن يكون قيمة موجبة صالحة');
      return;
    }
    setErrorPrice(undefined);

    const newProduct: ProductItem = {
      id: `prod-${items.length}-${Date.now()}`,
      name: newProductName.trim(),
      price: numericPrice.toFixed(2),
    };

    setItems((curr) => [...curr, newProduct]);
    setNewProductName('');
    setNewProductPrice('');
  };

  const handleRemoveProduct = (id: string) => {
    setItems((curr) => curr.filter((item) => item.id !== id));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}>
      <Header
        title="المنتجات والتصنيف"
        subtitle={`معرف المتجر: ${storeId}`}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'flex-end', gap: spacing[1] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>
            تصنيف المتجر ومنتجاته
          </Text>
          <Text role="caption" tone="muted" style={{ textAlign: 'right', marginTop: spacing[1] }}>
            قم بتحديد تصنيف المتجر وإدخال قائمة المنتجات التأسيسية.
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* Classification selects */}
        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[3], borderRadius: radius.md, gap: spacing[3] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>النوع والتصنيف التشغيلي</Text>

          <LocalSelectField
            label="نوع المتجر"
            value={storeType}
            options={[
              { label: 'متجر تجزئة', value: 'retail' },
              { label: 'مطعم / كافيه', value: 'restaurant' },
              { label: 'مخزن سحابي', value: 'darkstore' },
            ]}
            onValueChange={setStoreType}
          />

          <LocalSelectField
            label="التصنيف الرئيسي"
            value={mainCategory}
            options={[
              { label: 'بقالة ومواد غذائية', value: 'grocery' },
              { label: 'مطاعم ومأكولات', value: 'restaurant' },
              { label: 'صيدلية وعناية', value: 'pharmacy' },
            ]}
            onValueChange={setMainCategory}
          />

          <LocalSelectField
            label="التصنيف الفرعي للمتجر"
            value={subCategory}
            options={[
              { label: 'سوبرماركت متكامل', value: 'supermarket' },
              { label: 'تموينات صغيرة', value: 'minimarket' },
              { label: 'محل خضار وفواكه', value: 'vegetables' },
            ]}
            onValueChange={setSubCategory}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colorRoles.borderSubtle }} />

        {/* Add product form */}
        <View style={{ backgroundColor: colorRoles.surfaceMuted, padding: spacing[3], borderRadius: radius.md, gap: spacing[3] }}>
          <Text role="titleSm" style={{ textAlign: 'right', fontWeight: 'bold' }}>إضافة منتج جديد</Text>

          <TextField
            label="اسم المنتج"
            value={newProductName}
            onChangeText={(val) => {
              setNewProductName(val);
              if (val.trim()) setErrorName(undefined);
            }}
            {...(errorName ? { error: errorName } : {})}
            placeholder="مثال: برجر دجاج كلاسيك، حليب طازج"
          />

          <TextField
            label="سعر المنتج"
            value={newProductPrice}
            onChangeText={(val) => {
              setNewProductPrice(val);
              if (val.trim()) setErrorPrice(undefined);
            }}
            {...(errorPrice ? { error: errorPrice } : {})}
            placeholder="السعر شامل الضريبة"
          />

          <Button
            label="إضافة المنتج للقائمة"
            tone="primary"
            onPress={handleAddProduct}
            style={{ marginTop: spacing[2] }}
          />
        </View>

        {/* Products List */}
        <View style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[1], alignItems: 'flex-end' }}>
            <Text role="bodyStrong" style={{ textAlign: 'right' }}>
              {`المنتجات المضافة (${items.length})`}
            </Text>
            <Text role="caption" tone="muted" style={{ textAlign: 'right' }}>
              يجب إضافة منتج واحد على الأقل ليكون المتجر جاهزاً للعمل.
            </Text>
          </View>

          {items.length === 0 ? (
            <View
              style={{
                paddingVertical: spacing[4],
                gap: spacing[2],
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colorRoles.borderStrong,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="basket-outline" size={32} tone="muted" />
              <Text role="bodyStrong" tone="muted" style={{ textAlign: 'center' }}>
                لا توجد منتجات مضافة بعد
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing[2] }}>
              {items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing[3],
                    borderWidth: borders.hairline,
                    borderColor: colorRoles.borderStrong,
                    borderRadius: radius.sm,
                    backgroundColor: colorRoles.surfaceBase,
                  }}
                >
                  <View style={{ alignItems: 'flex-end', flex: 1, paddingEnd: spacing[3], gap: 2 }}>
                    <Text role="bodyStrong" style={{ textAlign: 'right', color: colorRoles.textPrimary }}>
                      {item.name}
                    </Text>
                    <Text role="bodySm" tone="success" style={{ textAlign: 'right' }}>
                      {item.price} ر.ي
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveProduct(item.id)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.xs,
                      backgroundColor: colorRoles.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: colorRoles.borderStrong,
                    }}
                  >
                    <Icon name="trash-outline" size={18} tone="danger" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          padding: spacing[3],
          paddingBottom: spacing[3] + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colorRoles.borderSubtle,
          backgroundColor: colorRoles.surfaceBase,
        }}
      >
        <Button
          label="حفظ وإغلاق"
          tone={items.length > 0 ? 'success' : 'secondary'}
          onPress={onBack}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

export default DshFieldStoreProductsUploadScreen;
