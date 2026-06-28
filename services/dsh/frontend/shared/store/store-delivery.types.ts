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
