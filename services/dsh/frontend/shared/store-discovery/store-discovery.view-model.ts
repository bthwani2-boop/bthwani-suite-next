import type { DshStoreSummaryDto, DshStoreDetailDto } from "./store-discovery.types";

export type DshStoreCardViewModel = {
  readonly id: string;
  readonly displayName: string;
  readonly cityCode: string;
  readonly serviceAreaCode: string;
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly ratingLabel: string | null;
  readonly etaLabel: string | null;
  readonly heroImageSource: { uri: string } | null;
  readonly logoImageSource: { uri: string } | null;
  readonly statusBadge: string | null;
  readonly isFreeDelivery: boolean;
  readonly placeholderEmoji: string;
  readonly placeholderColor: string;
  readonly deliveryModeLabels: readonly string[];
};

export type DshStoreDetailViewModel = DshStoreCardViewModel & {
  readonly createdAt: string;
  readonly updatedAt: string;
};

// Media keys (dsh.store.*) are seed identifiers — not real URLs.
// Convert them to null so the card shows the emoji placeholder instead.
function resolveImageSource(raw: string | null | undefined): { uri: string } | null {
  if (raw == null || raw.trim() === "") return null;
  if (raw.startsWith("dsh.") || !raw.startsWith("http")) return null;
  return { uri: raw };
}

type CategoryMeta = { emoji: string; color: string; deliveryModes: string[] };

function resolveCategoryMeta(displayName: string): CategoryMeta {
  const lower = displayName.toLowerCase();
  if (lower.includes("bakery") || lower.includes("مخبز") || lower.includes("خبز")) {
    return { emoji: "🥖", color: "#D97706", deliveryModes: ["توصيل", "استلام"] };
  }
  if (lower.includes("market") || lower.includes("grocery") || lower.includes("سوق") || lower.includes("بقالة")) {
    return { emoji: "🏪", color: "#059669", deliveryModes: ["توصيل", "استلام", "⚡ ثواني"] };
  }
  if (lower.includes("restaurant") || lower.includes("مطعم") || lower.includes("cafe") || lower.includes("كافيه")) {
    return { emoji: "🍽️", color: "#EA580C", deliveryModes: ["توصيل", "استلام"] };
  }
  if (lower.includes("pharmacy") || lower.includes("صيدلية")) {
    return { emoji: "💊", color: "#7C3AED", deliveryModes: ["توصيل"] };
  }
  return { emoji: "🛍️", color: "#0A2F5C", deliveryModes: ["توصيل", "استلام"] };
}

export function toCardViewModel(dto: DshStoreSummaryDto): DshStoreCardViewModel {
  const isOpen = dto.status === "active";
  const isServiceable =
    dto.serviceability.status === "serviceable" ||
    dto.serviceability.status === "limited";

  const ratingCount = dto.ratingCount ?? 0;
  const ratingLabel =
    dto.ratingAverage != null && ratingCount > 0
      ? `${dto.ratingAverage.toFixed(1)} (${ratingCount})`
      : null;

  const etaLabel =
    dto.deliveryEtaMin != null && dto.deliveryEtaMax != null
      ? `${dto.deliveryEtaMin}–${dto.deliveryEtaMax} دقيقة`
      : null;

  const statusBadge =
    dto.status === "temporarily_closed"
      ? "مغلق مؤقتاً"
      : dto.status === "inactive"
        ? "غير متاح"
        : dto.serviceability.status === "limited"
          ? "توصيل محدود"
          : dto.serviceability.status === "out_of_area"
            ? "خارج نطاق التوصيل"
            : null;

  const meta = resolveCategoryMeta(dto.displayName);

  const isFreeDelivery = isOpen && dto.serviceability.status === "serviceable";

  return {
    id: dto.id,
    displayName: dto.displayName,
    cityCode: dto.cityCode,
    serviceAreaCode: dto.serviceAreaCode,
    isOpen,
    isServiceable,
    ratingLabel,
    etaLabel,
    heroImageSource: resolveImageSource(dto.heroImageUrl),
    logoImageSource: resolveImageSource(dto.logoUrl),
    statusBadge,
    isFreeDelivery,
    placeholderEmoji: meta.emoji,
    placeholderColor: meta.color,
    deliveryModeLabels: meta.deliveryModes,
  };
}

export function toDetailViewModel(dto: DshStoreDetailDto): DshStoreDetailViewModel {
  const card = toCardViewModel(dto);
  return {
    ...card,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
