# DSH-002 Donor Extraction Audit

Slice: DSH-002 Client Home Discovery Parity  
Date: 2026-06-21  
Branch: starting-implementing-slices  
Auditor: automated (DSH-002 implementation agent)

## Decision Legend

| Decision | Meaning |
|---|---|
| ADOPT_AS_IS | Directly portable, no violations |
| ADAPT_NORMALIZE | Good pattern, needs token/import remapping |
| REWRITE_FROM_SPEC | Concept valid, code needs rebuild |
| REJECT | Violations or out of scope |

## Audit Table

| source_path | visual/logic asset | decision | reason | target_path | risk | required_proof |
|---|---|---|---|---|---|---|
| C:\bthwani-suite\dsh\frontend\app-client\screens\HomeScreen.tsx | Home screen orchestrator (hook wiring + shell split) | ADAPT_NORMALIZE | Clean separation; substitute imports; port hook composition | services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx | LOW | typecheck PASS |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeScreenShell.tsx | SectionList layout with sticky FilterRail + ListHeaderComponent | ADAPT_NORMALIZE | Port SectionList layout; remap color tokens; keep RTL via I18nManager | services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx | LOW | typecheck PASS |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomePromoSection.tsx | BannerCarousel (secondary) + promo card + category dials | ADAPT_NORMALIZE | Fix CSS var violation (var(--bthwani-brand-contrast)); remap colorPalette→colorRoles | services/dsh/frontend/app-client/home-discovery/HomePromoSection.tsx | MEDIUM | typecheck PASS, no raw hex |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeFilterRailSection.tsx | BThwaniFilterRail thin wrapper with sticky=true | ADAPT_NORMALIZE | Replace emoji icons with text labels; keep chip pattern | services/dsh/frontend/app-client/home-discovery/HomeFilterRailSection.tsx | LOW | typecheck PASS, 5 filters |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeStoreFeedSection.tsx | Per-item StoreCardPremium renderer + empty feed states | ADAPT_NORMALIZE | Use current project StoreCardPremium; map view-model adapter | services/dsh/frontend/app-client/home-discovery/HomeStoreFeedSection.tsx | LOW | typecheck PASS |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeStoreFeed.tsx | EmptyFeed component (search vs category empty) | ADOPT_AS_IS | Pure RN, no token issues | services/dsh/frontend/app-client/home-discovery/HomeStoreFeedSection.tsx | LOW | empty state visible in app |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeCategoryCarousel.tsx | Category dial tiles (56px icon + label) | ADAPT_NORMALIZE | Remap colorPalette.brand→colorRoles.brandAction; strip Outfit font | services/dsh/frontend/app-client/home-discovery/HomeCategorySection.tsx | LOW | typecheck PASS, no raw hex |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeOrbitSections.tsx | Bento-grid category sheet + ServiceOrbitCarousel | ADAPT_NORMALIZE | Remove colorPalette.white violations; replace with colorRoles.surfaceBase | services/dsh/frontend/app-client/home-discovery/HomeCategorySection.tsx | MEDIUM | guard:matrix PASS |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeHeaderSection.tsx | ModernPremiumHeader + SearchTopBar toggle | ADAPT_NORMALIZE | Verify both exist in current ui-kit; adopt if so | services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx | LOW | typecheck PASS |
| C:\bthwani-suite\dsh\frontend\app-client\parts\home\HomeVideoReelsSection.tsx | Video reels section | REJECT | Out of scope for DSH-002 | — | — | — |
| C:\bthwani-suite\ui-kit\src\components\store-card.tsx | StoreCardPremium (donor version with useBThwaniAppearance) | REJECT | Depends on tokens.components.commerce.* not in current ui-kit | — | — | Current project StoreCardPremium used instead |
| C:\bthwani-suite\ui-kit\src\components\banner.tsx | BannerCarousel (main/secondary variants) | ADAPT_NORMALIZE | Use current @bthwani/ui-kit BannerCarousel if exported; else rewrite with RN ScrollView | services/dsh/frontend/app-client/home-discovery/HomeHeroBannerSection.tsx | LOW | typecheck PASS |
| C:\bthwani-suite\ui-kit\src\components\button.tsx | BThwaniFilterChip + BThwaniFilterRail + BThwaniFilterSwipeBoundary | ADAPT_NORMALIZE | Use current ui-kit FilterBar or TouchableOpacity-based chips | services/dsh/frontend/app-client/home-discovery/HomeFilterRailSection.tsx | LOW | 5 filters, no raw hex |
| C:\bthwani-suite\dsh\frontend\shared\discovery\dsh-home-types.ts | DshHomeCategory, DiscoveryFilter ('all'|'favorites'|'nearest'|'new'|'offers') | ADAPT_NORMALIZE | Port to home-discovery.types.ts; use DTOs from generated client instead of manual types | services/dsh/frontend/shared/home-discovery/home-discovery.types.ts | LOW | typecheck PASS |
| C:\bthwani-suite\dsh\frontend\shared\discovery\home-service-config.ts | DSH_HOME_DISCOVERY_FILTERS (5 items with icon names) | ADAPT_NORMALIZE | Filter list now comes from API (backend returns 5 default filters); config not needed | services/dsh/backend/internal/homediscovery/repository.go | LOW | /dsh/home-discovery returns 5 filters |

## Violations Found in Donor (Not Ported)

| violation | location | fix applied |
|---|---|---|
| CSS variable `var(--bthwani-brand-contrast)` in RN context | HomePromoSection.tsx line ~152 | Used `neutralScale[0]` instead |
| Raw `fontFamily: 'Outfit-Bold'` / `'Outfit-Regular'` | donor store-card.tsx | Stripped; using system fonts |
| `colorPalette.white` / `colorPalette.brandSurface` / `colorPalette.brandStrong` | HomeOrbitSections.tsx | Remapped to `colorRoles.surfaceBase` / `brandScale.structure[50]` |
| `StatusBar` background-color raw hex | HomeScreenShell.tsx | Not ported; uses Screen from ui-kit |
| `width: SCREEN_WIDTH - 32` via Dimensions | donor store-card.tsx | Not used; current project StoreCardPremium used |
| `tokens.components.commerce.productCard` appearance path | donor ui-kit store-card.tsx | REJECTED; current project's StoreCardPremium used |
| `colorPalette.brandStrong` inside StyleSheet.create | HomeOrbitSections.tsx | Remapped to `brandScale.structure[200]` |

## Summary

- 13 donor assets evaluated
- 2 REJECTED (video reels out of scope; donor StoreCardPremium incompatible token system)
- 1 ADOPT_AS_IS (EmptyFeed pattern)
- 10 ADAPT_NORMALIZE (majority: token remapping + import substitution)
- 0 REWRITE_FROM_SPEC

Visual DNA preserved from donor: horizontal scrolling sections (banners, promos, categories), filter rail with 5 chips, store feed with premium cards, loading/empty/error/offline states.

All ui-kit tokens used exclusively from `@bthwani/ui-kit`. No raw hex, no direct Tamagui imports, no mock/demo/preview data.
