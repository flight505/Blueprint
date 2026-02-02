# Glass UI Unification Design

**Date:** 2026-02-02
**Status:** Approved

## Overview

Unify Blueprint's UI with a consistent Glass Design System:

1. **Small buttons by default** — `Button` defaults to `size="sm"`
2. **Consistent component usage** — All buttons use `<Button>`, no inline styling
3. **Glass surfaces everywhere** — All panels, modals, dropdowns use glass styling
4. **Violet glow on active states** — Universal active state treatment

## Implementation Order

```
Phase 1: Update Button component (default to sm, add glass variant)
Phase 2: Audit & unify Storybook stories
Phase 3: Verify all stories render correctly
Phase 4: Apply unified components to App.tsx
Phase 5: Final verification & commit
```

## Button Component Changes

### Default Size

```typescript
// Before
size = 'md'

// After
size = 'sm'
```

### Size Reference

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | h-8 (32px) | px-3 | text-sm |
| `md` | h-10 (40px) | px-4 | text-sm |
| `lg` | h-12 (48px) | px-6 | text-base |

### New Glass Variant

```typescript
variants: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass'
```

**Glass variant styling:**
```css
bg-white/[0.07]
backdrop-blur-sm
border border-white/[0.10]
hover:bg-white/[0.11]
active:bg-white/[0.14]
```

### Violet Glow (All Variants)

```css
focus-visible:shadow-[0_0_0_2px_rgba(167,139,250,0.4)]
active:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_8px_rgba(167,139,250,0.12)]
```

## Glass Styling Tokens

### Surface Hierarchy

| Surface | Use Case | Classes |
|---------|----------|---------|
| `glass-base` | Backgrounds, sidebars | `bg-white/[0.02] backdrop-blur-sm` |
| `glass-surface` | Panels, cards | `bg-white/[0.04] backdrop-blur-md` |
| `glass-elevated` | Modals, dropdowns | `bg-white/[0.07] backdrop-blur-lg` |
| `glass-hover` | Hover states | `bg-white/[0.11]` |
| `glass-active` | Pressed/selected | `bg-white/[0.14]` |

### Border Treatment

```css
border border-white/[0.06]  /* subtle, default */
border border-white/[0.10]  /* medium, interactive */
border border-white/[0.14]  /* strong, focused */
```

### Violet Glow Levels

| Level | Use Case | Box Shadow |
|-------|----------|------------|
| Subtle | Hover hints | `0 0 8px rgba(167,139,250,0.08)` |
| Soft | Focus rings | `0 0 12px rgba(167,139,250,0.15)` |
| Medium | Active states | `0 0 16px rgba(167,139,250,0.25)` |
| Strong | Primary actions | `0 0 20px rgba(167,139,250,0.35)` |

### Active State Pattern

```css
shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3),0_0_12px_rgba(167,139,250,0.15)]
text-purple-400
```

## Component Update Plan

### Tier 1 — Core UI

| Component | Changes |
|-----------|---------|
| `Button` | Default to `sm`, add `glass` variant, violet glow |
| `TabBar` | Glass surface, violet glow on active tab |
| `CommandPalette` | Glass elevated surface, glass input |

### Tier 2 — Panels & Containers

| Component | Changes |
|-----------|---------|
| `SearchPanel` | Glass surface, use `<Button>` |
| `FileBrowser` | Glass surface, glass-hover states |
| `ChatMessage` | Glass surface for bubbles |
| `ApprovalGate` | Glass elevated, glass buttons |
| `ModelSelector` | Glass dropdown surface |

### Tier 3 — Feedback & Status

| Component | Changes |
|-----------|---------|
| `ConfidenceTooltip` | Glass elevated surface |
| `Skeleton` | Subtle glass shimmer |
| `ResearchProgress` | Glass surface, violet progress glow |
| `ThemeToggle` | Use `<Button variant="glass">` |

### Tier 4 — Screens

| Component | Changes |
|-----------|---------|
| `WelcomeScreen` | Glass cards, glass buttons |

### Already Complete

- `GlassSidebar` ✓

## App.tsx Integration

### Title Bar

```tsx
// From
className="bg-gray-100 dark:bg-gray-800"

// To
className="bg-white/[0.02] backdrop-blur-sm border-b border-white/[0.06]"
```

### Main Background

```tsx
className="bg-[#1f2335]" // Tokyo Night Storm background-dark
```

### Right Pane Header

```tsx
className="bg-white/[0.04] backdrop-blur-md border-b border-white/[0.06]"
```

### Button Replacements

- Export section buttons → `<Button variant="glass">`
- Context tab switcher → `<Button variant="ghost">` with active glow
- All inline `<button>` → appropriate `<Button>` variant

## Verification Checklist

### Storybook

- [ ] Default button size is `sm`
- [ ] Glass surfaces have visible backdrop blur
- [ ] Borders visible (`border-white/[0.06]`)
- [ ] Active states show violet glow
- [ ] Hover transitions smooth
- [ ] Focus rings visible (a11y)

### App.tsx

- [ ] Sidebar + panel renders correctly
- [ ] Title bar matches glass aesthetic
- [ ] Buttons consistently sized
- [ ] Tab switching shows violet glow
- [ ] Modals have elevated glass
- [ ] No jarring transitions

### Accessibility

- [ ] Focus indicators visible
- [ ] Contrast ratios maintained
- [ ] Keyboard navigation works
