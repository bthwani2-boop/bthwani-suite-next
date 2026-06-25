import React from "react";
import { StyleSheet, View } from "react-native";
import { useIdentitySession } from "@bthwani/core-identity";
import {
  Badge,
  Button,
  Card,
  Header,
  ListItem,
  LoadingState,
  ScrollScreen,
  StateView,
  Text,
  TextField,
  spacing,
} from "@bthwani/ui-kit";
import { usePartnerCatalogController } from "../../shared/catalog";

export function PartnerCatalogManagementScreen() {
  const identity = useIdentitySession();
  const controller = usePartnerCatalogController(identity.state.kind);
  const [categoryName, setCategoryName] = React.useState("");
  const [productName, setProductName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [priceReference, setPriceReference] = React.useState("");

  if (identity.state.kind !== "authenticated") return null;

  if (controller.state.kind === "loading") {
    return <LoadingState title="جاري تحميل كتالوج المتجر…" />;
  }

  if (controller.state.kind === "permission_denied") {
    return (
      <StateView
        title="لا تملك صلاحية إدارة الكتالوج"
        description="تأكد من أنك مسجّل كشريك نشط ومرتبط بمتجر."
      />
    );
  }

  if (controller.state.kind === "error") {
    return (
      <StateView
        title="تعذر تحميل الكتالوج"
        description={controller.state.message}
        actionLabel="إعادة المحاولة"
        onActionPress={controller.retry}
      />
    );
  }

  const categories = controller.state.kind === "success" ? controller.state.catalog.categories : [];
  const products = controller.state.kind === "success" ? controller.state.catalog.products : [];
  const storeId = controller.state.kind === "success" ? controller.state.catalog.storeId : controller.state.storeId;

  return (
    <ScrollScreen>
      <Header
        title="إدارة كتالوج المتجر"
        subtitle={`بيانات حقيقية مرتبطة بالمتجر ${storeId ?? ""}`}
        actions={<Badge label={`${products.length} منتج`} tone="info" />}
      />
      <Card>
        <View style={styles.form}>
          <Text role="titleMd">إضافة تصنيف</Text>
          <TextField label="اسم التصنيف" value={categoryName} onChangeText={setCategoryName} />
          <Button
            label="حفظ التصنيف"
            disabled={categoryName.trim().length === 0 || controller.action === "submitting"}
            onPress={() => void controller.createCategory({ name: categoryName.trim(), description: "", sortOrder: categories.length + 1 })}
          />
        </View>
      </Card>
      <Card>
        <View style={styles.form}>
          <Text role="titleMd">إضافة منتج</Text>
          <TextField label="اسم المنتج" value={productName} onChangeText={setProductName} />
          <TextField label="SKU" value={sku} onChangeText={setSku} />
          <TextField label="مرجع السعر من WLT" value={priceReference} onChangeText={setPriceReference} />
          <Button
            label="حفظ المنتج"
            disabled={!productName.trim() || !sku.trim() || !priceReference.trim() || controller.action === "submitting"}
            onPress={() => void controller.createProduct({
              categoryId: categories[0]?.id ?? null,
              name: productName.trim(),
              description: "",
              sku: sku.trim(),
              priceReference: priceReference.trim(),
            })}
          />
        </View>
      </Card>
      <Text role="titleMd">المنتجات</Text>
      <Card>
        {products.length === 0
          ? <Text tone="muted">لا توجد منتجات بعد.</Text>
          : products.map((product) => (
              <ListItem
                key={product.id}
                title={product.name}
                subtitle={`${product.sku} · ${product.priceReference}`}
                trailing={<Badge label={product.isActive ? "نشط" : "متوقف"} tone={product.isActive ? "success" : "neutral"} />}
              />
            ))}
      </Card>
      <Button
        label="إرسال الكتالوج للاعتماد"
        tone="success"
        disabled={products.length === 0 || controller.action === "submitting"}
        onPress={() => void controller.submit()}
      />
      {controller.action === "error" && <Text tone="danger">تعذر حفظ التغيير. أعد تحميل النسخة وحاول مجددًا.</Text>}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing[4], gap: spacing[3] },
});
