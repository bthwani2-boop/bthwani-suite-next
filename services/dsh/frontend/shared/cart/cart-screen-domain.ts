import type { DshCartItem, DshFulfillmentMode } from "./cart.types";

export type QuickActionKey = "coupon" | "address" | "note" | "extra";

export type QuickActionMeta = {
  readonly title: string;
  readonly placeholder: string;
  readonly helper?: string;
  readonly saveLabel: string;
  readonly multiline?: boolean;
  readonly icon?: string;
};

export const QUICK_ACTION_META: Readonly<Record<QuickActionKey, QuickActionMeta>> = {
  coupon: {
    title: "إضافة قسيمة تخفيض",
    placeholder: "أدخل رمز التخفيض هنا",
    helper: "سيتم التحقق من صلاحية القسيمة وحساب الخصم من خادم DSH عند تأكيد checkout. لا يُحتسب أي خصم محلياً.",
    saveLabel: "حفظ القسيمة",
    icon: "pricetag-outline",
  },
  address: {
    title: "موقع التوصيل",
    placeholder: "اكتب العنوان بالتفصيل (المدينة، الحي، الشارع)",
    helper: "يمكنك تحديد الموقع تفاعلياً من الخريطة ووصف العنوان بدقة.",
    saveLabel: "حفظ العنوان الجديد",
    multiline: true,
    icon: "location-outline",
  },
  note: {
    title: "ملاحظات الطلب",
    placeholder: "اكتب ملاحظتك للمتجر أو الكابتن هنا",
    helper: "يمكنك تحديد تعليمات خاصة بالتحضير أو التوصيل.",
    saveLabel: "حفظ الملاحظة",
    multiline: true,
    icon: "document-text-outline",
  },
  extra: {
    title: "على طريقي",
    placeholder: "مثال: مناديل، ماء، بسبس...",
    helper: "اطلب إضافات بسيطة من طريق كابتن التوصيل.",
    saveLabel: "تأكيد الطلب الإضافي",
    multiline: true,
    icon: "add-circle-outline",
  },
};

export type ExecutionScheduleOption = {
  readonly value: string;
  readonly label: string;
  readonly fullLabel: string;
};

export type ExecutionScheduleOptions = {
  readonly dateOptions: readonly ExecutionScheduleOption[];
  readonly timeOptions: readonly ExecutionScheduleOption[];
};

function padSchedulePart(value: number) {
  return String(value).padStart(2, "0");
}

export function buildExecutionScheduleOptions(referenceDate = new Date()): ExecutionScheduleOptions {
  const dateOptions = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() + index + 1);
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const label = index === 0 ? "غدًا" : index === 1 ? "بعد غد" : `${dayNames[date.getDay()]}، ${date.getDate()}`;
    const fullLabel = `${dayNames[date.getDay()]}، ${date.getDate()} ${monthNames[date.getMonth()]}`;
    return {
      value: `${date.getFullYear()}-${padSchedulePart(date.getMonth() + 1)}-${padSchedulePart(date.getDate())}`,
      label,
      fullLabel,
    };
  });

  const timeOptions = [9, 11, 13, 15, 17, 19].map((hour) => {
    const period = hour >= 12 ? "م" : "ص";
    const displayHour = hour > 12 ? hour - 12 : hour;
    const label = `${displayHour}:00 ${period}`;
    return {
      value: `${padSchedulePart(hour)}:00`,
      label,
      fullLabel: label,
    };
  });

  return { dateOptions, timeOptions };
}

export type CartMapPosition = {
  readonly x: number;
  readonly y: number;
};

export type CartCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export type CartLandmark = {
  readonly lat: number;
  readonly lng: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly name: string;
  readonly x: number;
  readonly y: number;
};

export const LANDMARKS: readonly CartLandmark[] = [
  { lat: 15.3560, lng: 44.1800, latitude: 15.3560, longitude: 44.1800, name: "صنعاء، المدينة القديمة، باب اليمن", x: 160, y: 120 },
  { lat: 15.3400, lng: 44.1900, latitude: 15.3400, longitude: 44.1900, name: "صنعاء، حي حدة، شارع بيروت", x: 220, y: 190 },
  { lat: 15.3300, lng: 44.2000, latitude: 15.3300, longitude: 44.2000, name: "صنعاء، حي السبعين، ميدان السبعين", x: 240, y: 210 },
  { lat: 15.3200, lng: 44.1800, latitude: 15.3200, longitude: 44.1800, name: "صنعاء، شارع تعز، جولة تعز", x: 160, y: 230 },
  { lat: 15.3700, lng: 44.1900, latitude: 15.3700, longitude: 44.1900, name: "صنعاء، حي معين، شارع الستين", x: 120, y: 60 },
];

export type CartPriceSummary = {
  readonly subtotal: number;
  readonly deliveryFee: null;
  readonly discount: null;
  readonly grandTotal: null;
};

function readCartItemPrice(item: DshCartItem) {
  const priceStr = item.priceReference ? item.priceReference.replace(/[^\d.]/g, "") : "0";
  return Number.parseFloat(priceStr) || 0;
}

/**
 * This function is presentation-only. Delivery fees, coupons and final total
 * are resolved by the DSH checkout pricing engine and must never be invented in
 * app-client.
 */
export function buildCartPriceSummary(
  items: readonly DshCartItem[],
  _fulfillmentMode: DshFulfillmentMode,
  _couponCode: string,
): CartPriceSummary {
  const subtotal = items.reduce((acc, item) => acc + readCartItemPrice(item) * item.quantity, 0);
  return { subtotal, deliveryFee: null, discount: null, grandTotal: null };
}

function clampMapX(value: number) {
  return Math.max(10, Math.min(310, value));
}

function clampMapY(value: number) {
  return Math.max(10, Math.min(210, value));
}

export function normalizeCartMapPosition(position: CartMapPosition): CartMapPosition {
  return { x: clampMapX(position.x), y: clampMapY(position.y) };
}

export function mapPositionToCartCoordinates(position: CartMapPosition): CartCoordinates {
  const normalized = normalizeCartMapPosition(position);
  return {
    latitude: 15.3800 - (normalized.y / 220.0) * 0.0800,
    longitude: 44.1500 + (normalized.x / 320.0) * 0.0600,
  };
}

export function coordinatesToCartMapPosition(coordinates: CartCoordinates): CartMapPosition {
  return normalizeCartMapPosition({
    x: Math.round((coordinates.longitude - 44.1500) * 320.0 / 0.0600),
    y: Math.round((15.3800 - coordinates.latitude) * 220.0 / 0.0800),
  });
}

export function findClosestCartLandmark(position: CartMapPosition): CartLandmark {
  const normalized = normalizeCartMapPosition(position);
  let closestLandmark = LANDMARKS[0]!;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const landmark of LANDMARKS) {
    const dx = landmark.x - normalized.x;
    const dy = landmark.y - normalized.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      closestLandmark = landmark;
    }
  }
  return closestLandmark;
}
