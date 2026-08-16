# Users, Roles, & Permissions Matrix Guide

This guide lists all user account types, system roles, and granular
permissions. It shows which pages each user can access and what each user
can do on the platform.

---

## 1. Account Types & System Roles

The system defines **4 primary user roles** across two business models (Franchise Enterprise & Independent SaaS):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. HQ_ADMIN (HQ Director)                          │
│     Master Multi-Outlet Oversight, Consolidated Revenue, Global Rates     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────┐
│ 2. STORE_OWNER (SaaS Owner)   │                     │ 3. MANAGER (Outlet)   │
│ Full Single-Store Control     │                     │ Outlet Operations     │
└───────────┬───────────────────┘                     └───────────┬───────────┘
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │ 4. STORE_USER (Counter)   │
                         │ Live Floor & Table Timer  │
                         └───────────────────────────┘
```

---

## 2. Detailed Role Capabilities & Page Access

### 👑 1. Franchisor HQ Director (`HQ_ADMIN`)

- **Business Scope:** Multi-outlet Enterprise Franchise HQ. Oversees all stores in the franchise group (e.g. BlackBall or CueNation).
- **Accessible Pages:**
  - `/hq/dashboard` (Master HQ Analytics, Multi-Store Comparison, Combined Revenue)
  - `/dashboard` (Individual store performance view)
  - `/live-tables` (Live floor oversight)
  - `/rates` (Central rate configuration & tariff management)
  - `/settings` (Franchise group branding & store settings)
- **Capabilities:**
  - View total combined revenue, active table usage, and peak hour metrics across **ALL outlets**.
  - Switch store context instantly using the top **Outlet Switcher** dropdown.
  - Set central hourly rates, night surcharges, and game console rates for all outlets.
  - Manage franchise branding (logo, theme colors, app name).
  - Inspect sales breakdown by category (Pool/Snooker, PS5, Cafe F&B).
- **Restrictions:**
  - Cannot operate live floor session timers for another independent SaaS business outside their franchise group.

---

### 🏬 2. Independent SaaS Owner (`STORE_OWNER`)

- **Business Scope:** Single-store standalone business (e.g. Royal Snooker Club, Break & Run Lounge).
- **Accessible Pages:**
  - `/dashboard` (Store Revenue, Daily Sales Breakdown, Category Analytics)
  - `/live-tables` (Live Table Floor Grid & Active Sessions)
  - `/rates` (Store Hourly Pricing & Tariff Settings)
  - `/settings` (Store Branding & Operating Hours)
- **Capabilities:**
  - View complete daily, weekly, and monthly revenue metrics for their club.
  - Start, pause, extend, switch, and end live table/PS5 sessions.
  - Add F&B items (beverages, snacks, cigarettes) to open bills.
  - Generate final invoices, apply custom discounts, and collect cash/UPI/card payments.
  - Configure store hourly rates, minimum play times, and off-peak tariffs.
  - Update store branding, contact details, and receipt headers.
- **Restrictions:**
  - Cannot access `/hq/dashboard` (blocked by middleware; redirected automatically to `/dashboard`).
  - Cannot view or alter data belonging to other clubs.

---

### 🏪 3. Outlet Store Manager (`MANAGER`)

- **Business Scope:** Assigned Franchise Outlet (e.g. BlackBall Koramangala or CueNation Whitefield).
- **Accessible Pages:**
  - `/dashboard` (Outlet Sales & Performance Dashboard)
  - `/live-tables` (Live Floor Operations)
  - `/rates` (View & edit outlet rate rules if permitted)
  - `/settings` (Outlet operating hours & receipt settings)
- **Capabilities:**
  - Manage live floor sessions (Start, Pause, Extend, End, Table Swap).
  - Add cafe menu items to live sessions and process bill settlement.
  - View daily sales figures, table occupancy rates, and peak usage hours for their outlet.
  - Apply staff discounts or manual adjustments during bill checkout.
- **Restrictions:**
  - Cannot access `/hq/dashboard` or view financials of sister outlets (blocked by middleware).
  - Cannot change organization-wide franchise royalty settings.

---

### 👤 4. Front-Desk Staff / Cashier (`STORE_USER`)

- **Business Scope:** Counter operations & live table floor management.
- **Accessible Pages:**
  - `/live-tables` (Live Floor Grid)
  - `/dashboard` (View-only daily summary if enabled)
- **Capabilities:**
  - Start table timers when customers arrive.
  - Pause timers when customers take a break.
  - Extend session durations.
  - Add snacks, drinks, and cues to open session bills.
  - End sessions, print bills, and mark payment as completed (Cash/UPI).
- **Restrictions:**
  - Cannot access `/hq/dashboard` (blocked by middleware).
  - Cannot access the `/rates` page (hidden from the sidebar and blocked).
  - Cannot access the `/settings` page (hidden from the sidebar and blocked).
  - Cannot modify system rate tariffs or store financial configurations.

---

## 3. Permissions Matrix Table

| Granular Permission | Permission Description | HQ_ADMIN | STORE_OWNER | MANAGER | STORE_USER |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `hq.dashboard.read` | View Master Multi-Outlet Analytics (`/hq/dashboard`) | ✅ | ❌ | ❌ | ❌ |
| `dashboard.read` | View Store Performance Dashboard (`/dashboard`) | ✅ | ✅ | ✅ | 👁️ (Limited) |
| `tables.read` | View Live Floor Grid & Table Timers (`/live-tables`) | ✅ | ✅ | ✅ | ✅ |
| `sessions.start` | Start new table / PS5 play session | ✅ | ✅ | ✅ | ✅ |
| `sessions.pause` | Pause active table session timer | ✅ | ✅ | ✅ | ✅ |
| `sessions.extend` | Extend session duration | ✅ | ✅ | ✅ | ✅ |
| `sessions.end` | End session & finalize bill | ✅ | ✅ | ✅ | ✅ |
| `sessions.add_items` | Add F&B items (beverages, snacks) to session | ✅ | ✅ | ✅ | ✅ |
| `bills.manage` | Apply discounts, void items, process checkout | ✅ | ✅ | ✅ | ❌ |
| `rates.manage` | Create & update hourly rates & tariffs (`/rates`) | ✅ | ✅ | 👁️ (Optional) | ❌ |
| `settings.update` | Update store branding & configuration (`/settings`) | ✅ | ✅ | ❌ | ❌ |

---

## 4. Middleware Security & Route Enforcement Summary

```text
User Request ──► Middleware (src/middleware.ts)
                     │
                     ├── Unauthenticated? ─────────► Redirect to /login
                     │
                     ├── Visiting /hq/* ?
                     │       ├─ HQ_ADMIN? ────────► Allow Access (/hq/dashboard)
                     │       └─ Store User? ──────► Blocked! Redirect to /dashboard
                     │
                     └── Valid Session? ──────────► Allow Access (Load Scoped Store Data)
```
