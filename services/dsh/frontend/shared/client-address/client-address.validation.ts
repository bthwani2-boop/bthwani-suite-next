import type { DshClientAddressDraft } from "./client-address.types";

function textLength(value: string | undefined): number {
  return value?.trim().length ?? 0;
}

export function validateClientAddressDraft(input: DshClientAddressDraft): string | null {
  const labelLength = textLength(input.label);
  if (labelLength < 1) return "اكتب اسمًا مختصرًا للعنوان.";
  if (labelLength > 80) return "اسم العنوان يجب ألا يتجاوز 80 حرفًا.";

  const recipientLength = textLength(input.recipientName);
  if (recipientLength < 2) return "اكتب اسم المستلم.";
  if (recipientLength > 160) return "اسم المستلم يجب ألا يتجاوز 160 حرفًا.";

  if (!/^\+[1-9][0-9]{7,14}$/.test(input.phoneE164.trim())) {
    return "رقم الهاتف يجب أن يكون بصيغة دولية صحيحة.";
  }

  const addressLength = textLength(input.addressLine);
  if (addressLength < 5) return "اختر موقعًا محكومًا أو اكتب وصفًا أوضح للتسليم.";
  if (addressLength > 500) return "وصف العنوان يجب ألا يتجاوز 500 حرف.";

  const areaLength = textLength(input.serviceAreaCode);
  if (areaLength < 1) return "الموقع المختار خارج مناطق الخدمة المعتمدة.";
  if (areaLength > 80) return "رمز منطقة الخدمة غير صالح.";

  if (textLength(input.building) > 120) return "بيان المبنى يجب ألا يتجاوز 120 حرفًا.";
  if (textLength(input.floor) > 40) return "بيان الدور يجب ألا يتجاوز 40 حرفًا.";
  if (textLength(input.unit) > 40) return "بيان الشقة يجب ألا يتجاوز 40 حرفًا.";
  if (textLength(input.deliveryInstructions) > 500) return "تعليمات التسليم يجب ألا تتجاوز 500 حرف.";

  if (input.latitude === undefined || input.longitude === undefined) {
    return "حدد موقعًا معتمدًا على الخريطة قبل الحفظ.";
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    return "خط العرض غير صالح.";
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    return "خط الطول غير صالح.";
  }

  return null;
}
