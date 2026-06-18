# 03 — UI Kit and Brand Lock

Status: CANONICAL

## Authority

`shared/ui-kit` is the only owner of reusable tokens, themes, primitives, components, and visual patterns.

## Forbidden outside shared/ui-kit

- direct Tamagui imports
- ui-kit deep imports
- local design systems
- raw random colors
- duplicated reusable Button/Card/Header systems
- screen-local reusable visual frameworks

## Brand

- Deep Blue: `#0A2F5C`
- Orange: `#FF500D`
- White: `#FFFFFF`

## Donor design migration

Donor screens are visual references, not code authority.

Flow:

```text
donor screenshot → visual inventory → map to ui-kit → rebuild → compare → accept with evidence
```

## Acceptance condition

Accepted only when screens use public ui-kit exports and UI work has visual evidence before closure.