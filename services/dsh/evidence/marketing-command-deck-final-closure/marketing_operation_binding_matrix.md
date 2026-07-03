# marketing_operation_binding_matrix

resolved_commit_sha: 5d0d7d022c588f020f5bd7edbb3378684133d29a

```yaml
marketing_operation_binding_matrix:
  - operationId: listDshCampaigns
    route: GET /dsh/operator/marketing/campaigns
    handler: handleListCampaigns (marketing.go ListCampaigns)
    ui_binding: useCampaignsController -> CampaignsCommandDeck (control-panel, live)
    state: BOUND
  - operationId: createDshCampaign
    route: POST /dsh/operator/marketing/campaigns
    handler: handleCreateCampaign
    ui_binding: CampaignsCommandDeck "إطلاق الحملة"
    state: BOUND
  - operationId: getDshCampaign
    route: GET /dsh/operator/marketing/campaigns/{campaignId}
    handler: handleGetCampaign
    ui_binding: none (list-only in UI; get-by-id unused by control-panel)
    state: BACKEND_ONLY
  - operationId: updateDshCampaign
    route: PATCH /dsh/operator/marketing/campaigns/{campaignId}
    handler: handleUpdateCampaign
    ui_binding: none — CampaignsCommandDeck has no edit form, only create + remove(archive)
    state: BACKEND_ONLY
  - operationId: archiveDshCampaign
    route: DELETE /dsh/operator/marketing/campaigns/{campaignId}
    handler: handleDeleteCampaign (soft archive)
    ui_binding: CampaignsCommandDeck "حذف" (calls controller.remove -> archiveCampaign)
    state: BOUND
  - operationId: listDshMarketingBanners / createDshMarketingBanner / updateDshMarketingBanner / deleteDshMarketingBanner
    route: /dsh/operator/marketing/banners*
    handler: handleListBanners/handleCreateBanner/handleUpdateBanner/handleDeleteBanner
    ui_binding: NONE (MarketingHubScreen.tsx, the only consumer, was dead/unrouted and retired in this pass)
    state: BACKEND_ONLY, ORPHANED
  - operationId: listDshMarketingPromos / createDshMarketingPromo / updateDshMarketingPromo
    route: /dsh/operator/marketing/promos*
    handler: handleListPromos/handleCreatePromo/handleUpdatePromo
    ui_binding: NONE (same as above)
    state: BACKEND_ONLY, ORPHANED
```

Note: `getDshCampaign`/`updateDshCampaign` being BACKEND_ONLY is not itself a defect (a
list+create+archive-only UI is a legitimate product choice); the banners/promos ORPHANED state is
the defect, since a fully governed API (soft-delete, audit, target gate) sits unused while the UI
manages a parallel, differently-governed table for the same conceptual feature.
