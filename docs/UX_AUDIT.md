# UX Audit Report — BlackBall POS

**Task:** `wt/ux-improvements/ux-audit-polish` · **Date:** 2026-08-16
**Scope:** Staff/admin app + public booking page — form ergonomics, keyboard support
(Enter / Esc), design-system consistency, and a second pass for small friction points.

---

## 1. Executive Summary

| # | Finding | Severity | Status |
| :--- | :--- | :--- | :--- |
| 1 | Enter-to-submit broken on 7 surfaces (div + `type="button"` instead of `<form>`) | HIGH | ✅ FIXED |
| 2 | Esc never closes modals/popovers (0 keydown handlers in `src/`) | HIGH | ✅ FIXED |
| 3 | No focus management in dialogs (no trap, restore, or scroll lock) | MEDIUM | ✅ FIXED |
| 4 | Radius chaos — 6 scales (`rounded-material`, `lg/xl/2xl/3xl`, hardcoded `rounded-[8px]`) | MEDIUM | ✅ FIXED (admin surfaces) |
| 5 | Page-title typography inconsistent (`font-black uppercase` vs `font-semibold`) | LOW | ✅ FIXED |
| 6 | Duplicate UI primitives (hand-rolled QR modal, raw buttons, inline badge maps) | MEDIUM | ✅ FIXED |
| 7 | Implicit-submit foot-gun — `Button` default type | LOW | ✅ FIXED |
| 8 | Native `window.confirm()` in table status menu | LOW | ⏳ DEFERRED — see §8 |
| 9 | No loading guard on several action buttons (double-click risk) | MEDIUM | ⏳ DEFERRED — see §8 |
| 10 | Hinglish error copy mixed with English copy | LOW | ⏳ DEFERRED — see §8 |

---

## 2. Enter-to-submit (HIGH)

### Root cause
Native Enter-to-submit only happens inside a real `<form>` with a default submit
button. Most screens were `<div>` + `onClick` handlers with `type="button"` buttons.

### Fixed surfaces (now real `<form onSubmit>` + `type="submit"` primary button)

| Surface | File |
| :--- | :--- |
| Change password (3 fields) | `src/app/(admin)/change-password/page.tsx` |
| Public booking details step (name/phone) | `src/features/booking/components/book-page.tsx` |
| Start counter bill dialog | `src/features/sessions/components/start-counter-bill-dialog.tsx` |
| Add session item dialog | `src/features/sessions/components/add-session-item-dialog.tsx` |
| Hourly rate rows | `src/features/rates/components/rates-page.tsx` |
| Bookable items — add + edit rows | `src/features/tables/components/bookable-items-page.tsx` |
| Settings — add product / branding / booking prefs / price rows | `src/features/settings/menu-settings-page.tsx` |

Already worked and left untouched: login, start-walk-in dialog, platform setup
(SaaS/franchise server-action forms).

**Defense-in-depth:** `Button` now defaults to `type="button"` explicitly —
nothing inside a form submits unless it opts in (prevents accidental double-submit
or surprise submits when rows are wrapped in forms later).

**Booking page note:** the fixed bottom CTA is the form's submit button and is
rendered *inside* the `<form>` (fixed positioning keeps it visually identical).
This avoids the `form="id"` attribute, which jsdom can't exercise and Safari
handles inconsistently.

---

## 3. Esc / keyboard support (HIGH)

- `Dialog` now closes on **Escape**, locks body scroll while open, traps Tab
  focus inside the panel, focuses the first focusable on open, and restores
  focus + scroll on close.
- `BookingQrDialog` was rebuilt on the shared `Dialog` (was a hand-rolled modal
  with zero keyboard support and no `role="dialog"`).
- `TableStatusMenu` popover closes on Escape.
- Walk-in / counter-bill / add-item / end / extend dialogs all inherit Esc via
  the shared `Dialog`.

---

## 4. Design-system consistency (MEDIUM)

What was changed (surgical — no redesign):

- **Radius:** `rounded-material` (8px) is the single admin radius. Replaced
  ~30 hardcoded `rounded-[8px]` in platform setup + temporary credential,
  `rounded-xl` popovers (status menu), `rounded-lg` shell pills,
  change-password inputs, booking/live-table/rates headings.
- **Buttons:** raw `<button>` elements replaced with the shared `Button`
  component (staff bookings Confirm/Cancel/Mark-paid, admin-shell Logout,
  QR dialog Download/Print/Copy) — same look via `twMerge` overrides.
- **Badges:** staff-bookings' private `statusStyles` map replaced with the
  shared `Badge` component.
- **Page titles:** standardized to `text-2xl font-black uppercase tracking-normal`
  (Settings, Change Password, Bookings, Counter bills section).
- **Icons:** QR dialog's emoji buttons (`✕ ⬇ 🖨 ✓`) replaced with Material
  Symbols, matching the rest of the app.
- **Button primitive hardening:** `forwardRef` + explicit `type` default (see §2).

Still intentionally non-uniform (customer-facing surfaces with their own genre):
public `book/` page, `login/`, landing page, `docs/`, `magic-login` — see §8.

---

## 5. Tests added/updated

| File | Coverage |
| :--- | :--- |
| `tests/components/dialog.test.tsx` (new) | Esc close, backdrop close, autofocus, focus trap (wrap both directions), scroll lock, focus restore |
| `tests/components/session-dialogs.test.tsx` | + StartCounterBillDialog: Enter submits, empty label blocked, Esc closes |
| `tests/components/rates-page.test.tsx` | + Enter in rate input submits that row |
| `tests/components/change-password.test.tsx` (new) | Enter submits valid form; short/mismatch passwords blocked client-side |
| `tests/components/book-page.test.tsx` (new) | Full public flow — table → duration → slot → details → Enter → booking action called |

Gate: `tsc --noEmit` ✅ · `vitest run tests/unit tests/components` 131/131 ✅

---

## 6. What a future "design system" pass should cover (non-blocking)

The Tailwind config already ships tokens (`primary/surface/background/outline/`,
`danger/success/warning`, `rounded-material`, `shadow-material`) but most components
hardcode raw `slate/lime/rose` values. A full migration to those tokens (e.g.
`bg-surface`, `text-danger`, `shadow-material`) would make retheming possible.
`MenuGroup` in `src/components/ui/menu.tsx` is dead weight (a flex-wrap div,
unused) — delete it. Consider extracting a `DocumentHeader` component for the
repeated `h1 + subtitle` pattern, and a `SelectField` for the repeated select
markup (already needed in 6 places).

---

## 7. Accessibility notes

Fixed: `role="dialog"` + `aria-modal` now on every modal, focus trap/restore,
scroll lock, explicit button label for QR close. Remaining known gaps:
- `dialog` uses `aria-label`; wiring `aria-labelledby` to the heading would be
  stricter, and content should ideally get `aria-describedby`.
- Status popovers (TableStatusMenu) still use plain divs — `role="menu"` +
  arrow-key navigation would be the proper upgrade.

---

## 8. Deferred / triaged items (second pass findings)

1. **Native `window.confirm()`** in table-status-menu — works, but breaks the
   app's visual language and is not testable in jsdom. Replace with a styled
   confirm dialog (needs a small generic `ConfirmDialog`).
2. **Missing busy states:** staff-bookings `run()`, `closeBillAndContinueSessionAction`,
   `closeCounterBillAction`, bookable-items `toggleActive` don't disable their
   buttons during flight → possible double-submit. Add `isPending` guards.
3. **No confirmation on End-session / Close-bill** for occupied tables —
   destructive actions with no undo. Recommend a confirm step (aligns with #1).
4. **Copy tone:** change-password + QR dialog copy is in Hinglish while the rest
   of the app is English ("Naya password kam se kam 8 characters…"). Pick one
   language per audience.
5. **Spacing scale drift:** repeated `space-y-4/5/6`, `gap-2/3` are consistent
   enough today; a spacing scale in the config would keep it that way.
6. **Focus styles:** global `:focus-visible` outline exists; some inputs rely on
   `focus:border-*` only — keeep both (border + outline) for keyboard users.
7. **Snackbar:** fixed bottom-right can overlap the booking page's fixed CTA on
   small screens; consider stacking above fixed footers.
8. **Mobile:** admin shell has no sidebar on small screens (nav links hidden) —
   staff phones can't navigate; out of scope for this pass, worth a follow-up.
9. **Public book page** keeps its own radii/colors deliberately; if brand
   coherence is desired, revisit after the token migration (§6).

---

## 9. Verification

- `npm run typecheck` — clean
- `npx vitest run tests/unit tests/components` — 29 files, 131 tests, all passing
- Integration/e2e suites intentionally not run (Neon DB + shared seed state)
