import type { HomeStoreCardViewModel } from "./home-discovery.view-model";

export type HomeStoreGroupViewModel = Readonly<{
  id: "popular" | "offers" | "rewards";
  title: string;
  description: string;
  stores: readonly HomeStoreCardViewModel[];
}>;

export type HomeStorePresentation = Readonly<{
  groups: readonly HomeStoreGroupViewModel[];
  feedStores: readonly HomeStoreCardViewModel[];
  claimedStoreIds: ReadonlySet<string>;
}>;

type GroupDefinition = Readonly<{
  id: HomeStoreGroupViewModel["id"];
  title: string;
  description: string;
  matches: (store: HomeStoreCardViewModel) => boolean;
}>;

const DEFINITIONS: readonly GroupDefinition[] = [
  {
    id: "popular",
    title: "الأكثر شعبية",
    description: "متاجر منشورة ومعلّمة بالشعبية من المصدر التشغيلي.",
    matches: (store) => store.isPopular,
  },
  {
    id: "offers",
    title: "عروض وتوصيل موفّر",
    description: "متاجر تحمل قسيمة فعلية أو توصيلًا مجانيًا.",
    matches: (store) => store.hasCouponBadge || store.isFreeDelivery,
  },
  {
    id: "rewards",
    title: "مكافآت أكثر",
    description: "متاجر لها مضاعف نقاط منشور أكبر من الواحد.",
    matches: (store) => (store.pointsMultiplier ?? 0) > 1,
  },
];

/**
 * Produces one deterministic placement per store before the general feed.
 * Priority is popular -> offers -> rewards. A store claimed by an earlier
 * section is removed from later sections and from the feed, eliminating the
 * repeated cards that previously appeared four times on the same home page.
 */
export function buildHomeStorePresentation(
  stores: readonly HomeStoreCardViewModel[],
): HomeStorePresentation {
  const claimed = new Set<string>();
  const groups: HomeStoreGroupViewModel[] = [];

  for (const definition of DEFINITIONS) {
    const selected: HomeStoreCardViewModel[] = [];
    for (const store of stores) {
      if (selected.length >= 6) break;
      if (claimed.has(store.id) || !definition.matches(store)) continue;
      selected.push(store);
      claimed.add(store.id);
    }
    if (selected.length > 0) {
      groups.push({
        id: definition.id,
        title: definition.title,
        description: definition.description,
        stores: selected,
      });
    }
  }

  return {
    groups,
    feedStores: stores.filter((store) => !claimed.has(store.id)),
    claimedStoreIds: claimed,
  };
}

export function buildHomeStoreGroups(
  stores: readonly HomeStoreCardViewModel[],
): readonly HomeStoreGroupViewModel[] {
  return buildHomeStorePresentation(stores).groups;
}
