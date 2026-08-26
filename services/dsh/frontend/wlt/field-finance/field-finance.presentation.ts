export function commissionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    earned_pending_review: "قيد المراجعة",
    approved_pending_posting: "معتمد - قيد الترحيل",
    posted_pending_settlement: "مرحّل - قيد التسوية",
    held: "محجوز",
    pending: "قيد المراجعة",
    confirmed: "مؤكد - قيد التسوية",
    settled: "مسوّى",
    rejected: "مرفوض",
    reversed: "معكوس",
    paid: "مدفوع",
  };
  return map[status] ?? "قيد المعالجة";
}

export function commissionStatusTone(
  status: string,
): "action" | "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid" || status === "settled" || status === "confirmed") return "success";
  if (status === "rejected" || status === "reversed") return "danger";
  if (status === "held" || status === "pending") return "warning";
  return "action";
}

export function commissionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    field_visit_fee: "عمولة زيارة ميدانية",
    delivery_fee: "عمولة توصيل",
    platform_fee: "عمولة منصة",
    cod_fee: "عمولة تحصيل نقدي",
    partner_discount: "خصم الشريك",
  };
  return (map[type] ?? type) || "عمولة تشغيلية";
}

export function walletStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "نشطة",
    suspended: "موقوفة",
    closed: "مغلقة",
  };
  return map[status] ?? "قيد المراجعة";
}
