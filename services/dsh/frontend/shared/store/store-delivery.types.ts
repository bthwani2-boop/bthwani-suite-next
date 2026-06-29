// Store delivery domain types — owned by DSH sovereign brain
// Financial owner: WLT. Settlement owner: Partner (not BThwani Captain).

export type StoreDeliveryPolicy =
  | 'free_delivery'
  | 'courier_per_delivery_payout'
  | 'store_retained_fee_salary_courier';

export type StoreDeliveryPricingSource =
  | 'bthwani_pricing'
  | 'store_fixed_price'
  | 'control_panel_zone_pricing';

export type StoreCourierCompensation =
  | 'none'
  | 'fixed_per_delivery'
  | 'percentage_of_delivery_fee';

export type StoreDeliveryOption<T extends string> = {
  readonly id: T;
  readonly label: string;
  readonly description: string;
};

export const STORE_DELIVERY_POLICY_OPTIONS: readonly StoreDeliveryOption<StoreDeliveryPolicy>[] = [
  { id: 'free_delivery', label: 'توصيل مجاني', description: 'المتجر يتحمل تكلفة التوصيل — لا رسوم على العميل.' },
  { id: 'courier_per_delivery_payout', label: 'مستحق لكل توصيلة', description: 'الموصل يحصل على مبلغ محدد عن كل طلب يوصله.' },
  { id: 'store_retained_fee_salary_courier', label: 'رسوم للمتجر + راتب للموصل', description: 'رسوم التوصيل تذهب للمتجر، والموصل على راتب ثابت.' },
] as const;

export const STORE_DELIVERY_PRICING_SOURCE_OPTIONS: readonly StoreDeliveryOption<StoreDeliveryPricingSource>[] = [
  { id: 'bthwani_pricing', label: 'تسعير بثواني', description: 'يعتمد جدول الأسعار الموحد من بثواني.' },
  { id: 'store_fixed_price', label: 'سعر ثابت من المتجر', description: 'المتجر يحدد سعرًا موحدًا للتوصيل لكل الطلبات.' },
  { id: 'control_panel_zone_pricing', label: 'تسعير المناطق — لوحة التحكم', description: 'يعتمد التسعير المناطقي المُدار من لوحة التحكم.' },
] as const;

export const STORE_COURIER_COMPENSATION_OPTIONS: readonly StoreDeliveryOption<StoreCourierCompensation>[] = [
  { id: 'none', label: 'لا مستحق إضافي', description: 'الموصل على راتب ثابت أو بدون عمولة منفصلة.' },
  { id: 'fixed_per_delivery', label: 'مبلغ ثابت لكل توصيلة', description: 'مبلغ محدد يُضاف لكل طلب يتم توصيله.' },
  { id: 'percentage_of_delivery_fee', label: 'نسبة من رسوم التوصيل', description: 'نسبة مئوية من رسوم التوصيل لكل طلب.' },
] as const;

export function isStoreDeliveryPolicyCompensationRequired(policy: StoreDeliveryPolicy): boolean {
  return policy !== 'free_delivery';
}

export function resolveStoreDeliveryPolicyLabel(policy: StoreDeliveryPolicy): string {
  return STORE_DELIVERY_POLICY_OPTIONS.find((option) => option.id === policy)?.label ?? policy;
}

export function resolveStoreDeliveryPricingSourceLabel(source: StoreDeliveryPricingSource): string {
  return STORE_DELIVERY_PRICING_SOURCE_OPTIONS.find((option) => option.id === source)?.label ?? source;
}

export function resolveStoreCourierCompensationLabel(compensation: StoreCourierCompensation): string {
  return STORE_COURIER_COMPENSATION_OPTIONS.find((option) => option.id === compensation)?.label ?? compensation;
}
