---
name: bthwani-frontend-design-excellence
description: Enforce premium, modern, dynamic, mobile-first, RTL-correct, and visually stunning frontend design quality across all BThwani surfaces. Use for any UI/UX, frontend design, screen polish, visual hierarchy, micro-animations, or state handling tasks.
version: 2026.06.20-v1
---

# bthwani-frontend-design-excellence

## Purpose

Make every visible BThwani frontend experience visually breathtaking (Rich Aesthetics), dynamic, practical, modern, RTL-correct, mobile-first, and strongly aligned with BThwani product quality. 

This skill acts as the ultimate authority on *how* things should look and feel, complementing `bthwani-ui-kit-design-lock` which focuses on *where* things belong (ownership and governance).

## Mandatory BThwani Clauses

- **Centralized Design System**: Any reusable/repeatable frontend pattern must be centralized in the approved design system / `@bthwani/ui-kit`.
- **No Local Design Systems**: Do not use this skill to hardcode random colors, local design systems, or one-off visual hacks.
- **RTL Enforcement**: Arabic/RTL UI must be directionally correct.
- **Visual Evidence Required**: Visible UI changes require visual evidence (screenshots/recordings). Without it, the decision must be `NEEDS_VISUAL_EVIDENCE`.

## Design-Quality Pillars

### 1. Rich Aesthetics & Premium Polish (WOW Factor)
- **Colors**: Avoid generic colors (plain red, blue, green). Use curated, harmonious color palettes, sleek dark modes, and subtle gradients. Preserve deepBlue/orange/white identity through the central color system.
- **Typography**: Use modern typography (e.g., from Google Fonts like Inter, Roboto, or Outfit) instead of browser defaults.
- **Glassmorphism & Depth**: Utilize modern design techniques like glassmorphism (translucency with blur), proper shadow scaling, and layered depth to avoid flat, boring interfaces.
- **Overall Feel**: A premium interface must feel calm, confident, cohesive, practical, and low-noise.

### 2. Dynamic Design & Micro-Animations
- **Alive Interfaces**: The UI should feel responsive and alive. Achieve this with hover effects, active states, and interactive elements.
- **Micro-animations**: Add subtle micro-animations for enhanced user experience (e.g., smooth button presses, skeleton loading waves, fluid transitions between states).
- **Purposeful Motion**: Motion must clarify hierarchy, continuity, and state change. Avoid decorative motion that delays task completion or causes jank.

### 3. Information Architecture & Visual Hierarchy
- Identify the screen purpose, primary user action, secondary actions, and expected outcome. Remove unrelated content and decision noise.
- Confirm title, subtitle, primary action, important metrics, state, and next step are visually ordered.
- Avoid equal-weight cards, random emphasis, noisy borders, and scattered visual accents.

### 4. Layout Rhythm and Spacing
- Verify consistent spacing scale, section grouping, card rhythm, safe areas, and alignment.
- Avoid cramped UI, floating elements, oversized gaps, clipping, overflow, and unbounded scroll.

### 5. Mobile-First and Responsive Behavior
- **Mobile**: Prioritize thumb reach, safe area, hardware back behavior, and short vertical journeys.
- **Web**: Use practical density, clear panes/tabs/drawers. Avoid stretched mobile layouts on desktop unless intentionally justified.

### 6. RTL and Arabic Composition
- Icon + text cluster belongs together on the right side.
- Chevrons/actions belong opposite the content cluster.
- Text must align right unless a deliberate exception is justified.
- No centered Arabic list-row text unless intentionally designed and visually proven.

### 7. Interaction States & Edge Cases
- Verify default, pressed, focused, disabled, selected, expanded, collapsed, loading, empty, error, success, offline, and permission-denied states.
- Do not accept a component that only looks good in the happy path.

### 8. Accessibility and Touch Quality
- Verify sufficient contrast, semantic labels, readable size, focus visibility, screen-reader names, and touch target size (Accessibility is a design-quality gate).

## Required Execution Steps

1. Read `AGENTS.md`, `.agents/INDEX.md`, and this skill.
2. Read `bthwani-ui-kit-design-lock` for ownership/design-system boundaries.
3. Identify existing `@bthwani/ui-kit` exports before proposing any local UI.
4. Apply the design pillars (Aesthetics, Micro-animations, RTL, Spacing).
5. Verify with code gates and visual evidence.

## Output Contract

When invoked to review or design UI, always end with an assessment using this contract:

```text
skill: bthwani-frontend-design-excellence
scope:
ui_kit_sources:
design_intent:
rich_aesthetics_applied:
animations_and_states:
rtl_findings:
visual_evidence:
decision: PASS / PASS_WITH_WARNINGS / FIX_REQUIRED / NEEDS_VISUAL_EVIDENCE
next_action:
```
