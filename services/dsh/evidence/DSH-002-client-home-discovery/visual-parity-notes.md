# DSH-002 Visual Parity Notes

## Reference: Donor UI (C:\bthwani-suite\dsh)

### Elements adopted and adapted from donor design

| Element | Donor | Target (DSH-002) | Decision |
|---|---|---|---|
| Header RTL | avatar + name + location + icons | `HomeDiscoveryShell` header | ADAPT_NORMALIZE |
| Hero banner carousel | full-width image + badge + CTA | `HomeHeroBannerSection` | ADAPT_NORMALIZE |
| Promo section | medal icon + title + CTA + category/video buttons | `HomePromoSection` | ADAPT_NORMALIZE |
| Filter rail | الكل / المفضلة / الأقرب / الجديدة with icons | `HomeFilterRailSection` | ADAPT_NORMALIZE |
| Categories section | icon grid | `HomeCategorySection` | ADAPT_NORMALIZE |
| Store feed | FlatList of premium cards | `HomeStoreFeedSection` | ADAPT_NORMALIZE |
| Store card (premium) | lock + heart + hero image + logo + rating + ETA + badges | `StoreCardPremium` (reused from DSH-001) | REUSE — no duplication |

### Color mapping (donor → ui-kit tokens)
- Primary orange → `colorRoles.brandAction`
- Open green → `statusScale.success`
- Pro badge orange → `colorRoles.brandAction`
- Free badge green → `statusScale.success`
- Rating chip bg → `neutralScale[0]` (white)
- Text primary → `colorRoles.textPrimary`
- Text secondary → `colorRoles.textSecondary`

### Layout decisions
- RTL enforced throughout via `textAlign: 'right'` and `flexDirection: 'row'`
- Banner carousel uses snap paging with dot indicator
- Filter rail is horizontal scrollable with pill chips
- Store feed is non-scrolling FlatList embedded in ScrollView shell

### What was REJECTED from donor
- Local design system tokens (donor had hardcoded hex colors) → REJECTED, rebuilt with ui-kit
- Direct Tamagui imports → REJECTED, all via @bthwani/ui-kit
- Mock/demo store arrays in frontend → REJECTED, all data from /dsh/home-discovery API
- Donor's preview/demo screen shapes → REJECTED

### Screenshot
`screenshot-app-client-home-discovery.png` — captured from physical device via Expo dev-client
