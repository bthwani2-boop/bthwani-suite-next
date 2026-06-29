import type { WltDshFieldCommissionReference } from "./wlt-dsh-field-commission.types";

export interface WltFieldCommissionViewModel {
  readonly id: string;
  readonly formattedAmount: string;
  readonly statusLabel: string;
  readonly statusColor: string;
  readonly canUploadEvidence: boolean;
  readonly description: string;
  readonly createdAtFormatted: string;
}

export function toFieldCommissionViewModel(
  ref: WltDshFieldCommissionReference
): WltFieldCommissionViewModel {
  const formattedAmount = `${(ref.amountMinorUnits / 100).toFixed(2)} ${ref.currency}`;
  let statusLabel = "";
  let statusColor = "";
  let canUploadEvidence = false;

  switch (ref.status) {
    case "not_available":
      statusLabel = "غير متوفر";
      statusColor = "gray";
      break;
    case "loading":
      statusLabel = "جارٍ التحميل...";
      statusColor = "blue";
      break;
    case "eligible_pending_review":
      statusLabel = "مؤهل وقيد المراجعة";
      statusColor = "orange";
      break;
    case "approved_pending_settlement":
      statusLabel = "موافق عليه وقيد التسوية";
      statusColor = "yellow";
      break;
    case "settled":
      statusLabel = "تمت التسوية";
      statusColor = "green";
      break;
    case "held_for_evidence":
      statusLabel = "معلق بانتظار الإثبات";
      statusColor = "red";
      canUploadEvidence = true;
      break;
    case "rejected":
      statusLabel = "مرفوض";
      statusColor = "darkred";
      break;
    case "error":
      statusLabel = "خطأ";
      statusColor = "red";
      break;
  }

  return {
    id: ref.id,
    formattedAmount,
    statusLabel,
    statusColor,
    canUploadEvidence,
    description: ref.description,
    createdAtFormatted: new Date(ref.createdAt).toLocaleDateString("ar-YE"),
  };
}
