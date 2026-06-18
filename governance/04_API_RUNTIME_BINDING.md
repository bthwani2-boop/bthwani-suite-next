# API Runtime Binding

Required chain:

OpenAPI contract
→ generated types/client
→ service frontend shared adapter
→ surface view-model
→ screen state
→ runtime evidence

Forbidden:

- direct fetch inside screens
- undocumented endpoints
- screen-shaped APIs
- mock/demo success paths
- silent catch without visible state
