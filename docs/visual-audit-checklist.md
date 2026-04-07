# Visual Audit Checklist — Clean Premium UI

Tanggal audit: **2026-04-07**  
Scope: `public/dashboard.html`, `public/history.html`, `public/settings.html`, `public/login.html`, `public/style.css`.

## 1) Scorecard (Current)

| Area | Score | Notes |
|---|---:|---|
| Spacing consistency | **86/100** | Major sections already use a coherent spacing rhythm (`18/22/26px` patterns). |
| Contrast accessibility | **80/100** | Primary/secondary text strong; muted text was low and has been improved to `#718096`. |
| Typography hierarchy | **84/100** | Heading/body/mono separation is good; can tighten scale rules for section labels. |
| Icon consistency | **92/100** | Main UI now standardized to Material Symbols Rounded with shared sizing rules. |
| Overall “clean premium” | **86/100** | Solid baseline; next gains are mostly micro-typography + spacing tokens. |

---

## 2) Checklist (Pass/Needs Improvement)

### Spacing & Layout
- [x] Sidebar, topbar, and content container have stable spacing system.
- [x] Metric cards and section cards use consistent paddings and border radii.
- [ ] Define a strict spacing token ladder (8/12/16/24/32) and map every component to it.
- [ ] Normalize button horizontal padding across sizes (`btn`, `btn-sm`) for more visual rhythm.

### Contrast & Legibility
- [x] Main text color is highly readable on dark base.
- [x] Accent colors (green/yellow/red/primary) are readable in status chips.
- [x] Muted text contrast improved by updating `--text-muted` to `#718096`.
- [ ] Re-check tiny text (`11px–12px`) on low-brightness mobile devices and bump to `12px+` where possible.

### Typography Hierarchy
- [x] Clear distinction between topbar title, card values, metadata, and helper text.
- [x] Monospace usage for numbers/logs is consistent.
- [ ] Create a typography scale spec (e.g., H1 20, H2 16, body 14, caption 12) and enforce globally.
- [ ] Slightly increase section-title weight/letter-spacing consistency for premium look.

### Icon System Consistency
- [x] Navigation and actions now use one icon family (Material Symbols Rounded).
- [x] Shared icon sizing/alignment rules exist in global CSS.
- [ ] Add explicit icon usage rules (filled vs outlined, semantic mapping).
- [ ] Ensure all dynamic buttons created from JS use icon wrappers consistently.

### Motion & Interaction
- [x] Hover and focus interactions are present on cards/buttons/inputs.
- [ ] Add consistent focus-visible ring style for keyboard navigation across all interactive components.
- [ ] Standardize animation durations (`150ms/200ms`) and easing usage for premium feel.

---

## 3) Quick Wins (High Impact, Low Effort)

1. **Enforce spacing tokens in one place** (CSS custom properties) and refactor ad-hoc inline spacings.  
2. **Add `:focus-visible` style standard** for all controls (buttons, links, inputs).  
3. **Set caption minimum size to 12px** to improve readability on mobile.  
4. **Create icon semantics map** (`dashboard`, `history`, `settings`, `logout`, `download`, etc.) for future consistency.

---

## 4) Contrast Snapshot (Key Pairs)

Measured against `--bg-base: #070c18`:

- `--text-primary #f1f5f9` → **17.83:1** (excellent)
- `--text-secondary #94a3b8` → **7.62:1** (excellent)
- `--text-muted #718096` → **4.87:1** (passes normal text target)
- `--primary-light #60a5fa` → **7.68:1**

---

## 5) Definition of Done (Clean Premium v1)

- [ ] All UI components mapped to spacing + typography tokens.
- [ ] No inline magic spacing values unless documented exception.
- [ ] Contrast for normal text ≥ 4.5:1 in default theme.
- [ ] Icon semantics documented and reused consistently.
- [ ] Keyboard focus states clearly visible on all key controls.

