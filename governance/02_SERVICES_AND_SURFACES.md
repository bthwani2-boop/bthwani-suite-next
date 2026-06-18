# Services and Surfaces

Canonical services:
- dsh
- wlt
- knz
- arb
- amn
- esf
- mrf
- snd
- kwd

Rule:
apps are shell only.
services own full-stack capsules.
frontend lives under services/<service>/frontend/<surface>.

Reserved Service Activation Rule:
No package.json can be added inside any reserved/inactive service directory before the existence of:
- SERVICE_BLUEPRINT.md
- service.manifest.ts
- contracts/<service>.openapi.yaml
- check script
- approved slice
