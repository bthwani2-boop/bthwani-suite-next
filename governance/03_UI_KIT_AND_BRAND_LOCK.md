# 03 — UI Kit and Brand Lock

Status: ACTIVE_CANONICAL

## Authority

`shared/ui-kit` is the sole owner of reusable tokens, themes, primitives, components, and visual patterns shared across applications and service surfaces.

## Forbidden outside `shared/ui-kit`

- direct framework imports that bypass the public UI-kit contract;
- UI-kit deep imports;
- parallel local design systems;
- arbitrary raw colors where a governed token exists;
- duplicated reusable button, card, header, navigation, or state systems;
- screen-local reusable visual frameworks.

## Brand baseline

- Deep Blue: `#0A2F5C`
- Orange: `#FF500D`
- White: `#FFFFFF`

Brand values are consumed through governed tokens; this document is not permission to duplicate raw values across screens.

## Donor design migration

Donor screens and screenshots are references only, not code or runtime authority.

```text
donor reference
→ visual inventory
→ map to governed UI-kit contracts
→ rebuild in the current owner path
→ verify required states and surfaces
→ visual acceptance when applicable
```

## Evidence boundary

Static UI-kit guards may prove ownership and token rules only. UI or visual closure requires same-commit rendered evidence and applicable accessibility, RTL, interaction, and Product Owner acceptance.

## Acceptance condition

Accepted only when reusable UI remains owned by public UI-kit exports, surfaces do not create parallel design systems, brand tokens remain centralized, and visual claims are supported by the applicable visual evidence rather than static source inspection alone.
