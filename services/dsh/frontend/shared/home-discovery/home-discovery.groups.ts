import type { HomeStoreCardViewModel } from "./home-discovery.view-model";

export type HomeStoreGroupViewModel = Readonly<{
  id: "popular" | "offers" | "rewards";
  title: string;
  description: string;
  stores: readonly HomeStoreCardViewModel[];
}>;

export function buildHomeStoreGroups(
  stores: readonly HomeStoreCardViewModel[],
): readonly HomeStoreGroupViewModel[] {
  const definitions: readonly HomeStoreGroupViewModel[] = [
    {
      id: "popular",
      title: "الأكثر شعبية",
      description: "متاجر منشورة ومعلّمة بالشعبية من المصدر التشغيلي.",
      stores: stores.filter((store) => store.isPopular).slice(0, 6),
    },
    {
      id: "offers",
      title: "عروض وتوصيل موفّر",
      description: "متاجر تحمل قسيمة فعلية أو توصيلًا مجانيًا.",
      stores: stores
        .filter((store) => store.hasCouponBadge || store.isFreeDelivery)
        .slice(0, 6),
    },
    {
      id: "rewards",
      title: "مكافآت أكثر",
      description: "متاجر لها مضاعف نقاط منشور أكبر من الواحد.",
      stores: stores
        .filter((store) => (store.pointsMultiplier ?? 0) > 1)
        .slice(0, 6),
    },
  ];

  return definitions.filter((group) => group.stores.length > 0);
}
