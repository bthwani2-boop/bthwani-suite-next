# marketing_partner_offer_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_partner_offer_matrix:
  - check: does partner self-publish an offer (bypassing review)?
    finding: usePartnerOffersController has isBackedByApi:false; no backend table/handler exists;
      PartnerOffersCommandDeck (control-panel/operator side) disables approve/toggle/remove.
    result: N/A — cannot self-publish through a feature with no backend.
  - check: does the backend reject partner-offer targeting rather than silently allow it?
    finding: ValidateTarget(target_type="offer") always returns (false, "offer targeting is not yet
      backed by a partner-offer table"); verified by TestMarketingTargetVisibilityGateDBIntegration,
      re-run live in this pass (PASS).
    result: PASS
  - check: is there an app-partner submission surface for offers at all?
    finding: >-
      YES — services/dsh/frontend/app-partner/account/PromotionsScreen.tsx ("اقتراح عرض جديد" /
      "العروض المقترحة"). It does NOT use usePartnerOffersController from shared/marketing at all
      (it only imports the PartnerOfferRecord/PartnerOfferStatus *types*); it keeps its own fully
      independent `useState<PartnerOfferRecord[]>([])` and `handleSubmitOffer` that pushes into that
      local array with `id: offer-${Date.now()}` and status "inbound". There is no NotBackedNotice,
      no isBackedByApi flag, and no disclosure of any kind — a partner who submits an offer here sees
      it move to a "قيد المراجعة" (pending review) tab with a success message ("تم إرسال العرض
      للمراجعة التسويقية") that is entirely false: nothing was sent anywhere, and the "offer" vanishes
      on next reload/app restart. This is a second, independent local-only fake, disconnected from
      (and not disclosed like) the operator-side usePartnerOffersController.
    verification_command: rg -n "useState<PartnerOfferRecord" services/dsh/frontend/app-partner/account/PromotionsScreen.tsx
    result: PARTIALLY FIXED in this pass — the false success message ("تم إرسال العرض للمراجعة
      التسويقية") was replaced with an honest one ("تم حفظ العرض محليًا فقط. ميزة الإرسال الفعلي
      لمراجعة التسويق غير مفعّلة بعد على هذا السطح.") plus a code comment pointing at this matrix.
      Still FIX_REQUIRED as a feature: the screen still has no real backend, so drafts are still
      lost on reload; the button is left enabled (rather than disabled) so partners can keep drafting,
      but they can no longer be told a submission succeeded when it didn't. Building
      dsh_partner_offers end-to-end remains open — see zero_defect_closure_matrix.md.
    verification_command: rg -n "تم حفظ العرض محليًا فقط" services/dsh/frontend/app-partner/account/PromotionsScreen.tsx
```
