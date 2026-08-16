# Multi-Tenancy & Developer Testing Setup Guide

This document explains the testing setup, the multi-tenant architecture,
and the pre-configured demo accounts. It also covers the 1-click Magic
Login tools for fast developer iteration, QA testing, and stakeholder
walkthroughs.

---

## 1. Overview & Core Business Models

The application supports **two primary multitenancy business models**:

1. **🏢 Franchise Business Model (Multi-Outlet Enterprise):**
   - **Central HQ Account:** Franchisor Directors who oversee all outlets in their group, view combined revenue, manage global rate rules, and switch outlet context (`/hq/dashboard`).
   - **Outlet Manager Accounts:** Store Managers restricted strictly to their assigned outlet (`/live-tables`).

2. **🏬 Independent B2B SaaS Model (Standalone Store):**
   - Single-store owners who run independent pool/snooker clubs (`/dashboard`).

---

## 2. Seed Data & Credentials

### Default Password for ALL Test Accounts:
```text
Password@123
```

To reset or seed the demo database at any time, run:
```bash
npx tsx prisma/seed.ts
```

---

### 👑 Category 1: Franchise HQ Directors (Master HQ View)

| Organization Name | Director Name | Email | Password | Target Destination |
| :--- | :--- | :--- | :--- | :--- |
| **BlackBall Franchise Group** | Vikram Malhotra | `hq.blackball@example.com` | `Password@123` | `/hq/dashboard` |
| **CueNation Franchise Group** | Anish Roy | `hq.cuenation@example.com` | `Password@123` | `/hq/dashboard` |

---

### 🏪 Category 2: Franchise Outlet Managers (Single Outlet View)

| Franchise Group | Store / Outlet Name | Manager Name | Email | Password | Store Slug |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BlackBall** | Koramangala | Rahul Sharma | `owner@cueclub.example` | `Password@123` | `seed-business` |
| **BlackBall** | MG Road | Sanjay Patel | `manager.mgroad@blackball.example` | `Password@123` | `outlet-mg-road` |
| **BlackBall** | Indiranagar | Priya Nair | `manager.indiranagar@blackball.example` | `Password@123` | `outlet-indiranagar` |
| **CueNation** | Whitefield | Karthik Verma | `whitefield.manager@cuenation.example` | `Password@123` | `outlet-whitefield` |
| **CueNation** | HSR Layout | Deepak Rao | `hsr.manager@cuenation.example` | `Password@123` | `outlet-hsr` |

---

### 🏬 Category 3: Independent B2B SaaS Owners (Standalone Store View)

| Club Name | Location | Owner Name | Email | Password | Store Slug |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Royal Snooker Club** | JP Nagar | Arjun Reddy | `owner@royalsnooker.example` | `Password@123` | `saas-royal-snooker` |
| **Break & Run Lounge** | BTM | Varun Mehta | `owner@breakandrun.example` | `Password@123` | `saas-break-and-run` |
| **GameZone PS5 & Cue** | Hebbal | Karan Singh | `owner@gamezone.example` | `Password@123` | `saas-gamezone` |

---

## 3. Dev 1-Click Magic Login Link Generator

To switch between user roles and stores instantly without re-typing passwords, use the **Dev Magic Login Generator** page:

👉 **`http://localhost:3000/magic-login`**

### Direct 1-Click Magic Links for Quick Copy-Pasting:

- **BlackBall HQ Director:**  
  `http://localhost:3000/api/auth/magic-login?email=hq.blackball%40example.com&store=seed-business`

- **CueNation HQ Director:**  
  `http://localhost:3000/api/auth/magic-login?email=hq.cuenation%40example.com&store=outlet-whitefield`

- **BlackBall Koramangala Manager:**  
  `http://localhost:3000/api/auth/magic-login?email=owner%40cueclub.example&store=seed-business`

- **BlackBall MG Road Manager:**  
  `http://localhost:3000/api/auth/magic-login?email=manager.mgroad%40blackball.example&store=outlet-mg-road`

- **Royal Snooker Standalone Owner:**  
  `http://localhost:3000/api/auth/magic-login?email=owner%40royalsnooker.example&store=saas-royal-snooker`

---

## 4. How Authentication & Sessions Work Under the Hood

1. **Authentication Protocol:**  
   Standard login (`/login`) uses HMAC-SHA256 token generation. Password hashes are salted using Node native `crypto.scryptSync`.

2. **Session Cookies:**  
   Sessions are stored in browser `HttpOnly` cookies (`auth_session`). `HttpOnly` prevents client-side XSS token theft.

3. **Route Protection Middleware (`src/middleware.ts`):**  
   Protects app routes (`/hq/*`, `/dashboard`, `/live-tables`, `/rates`, `/settings`). Unauthenticated requests are automatically redirected to `/login`.

4. **Multi-Tenant Context Scoping (`src/server/auth/current-employee.ts`):**  
   Reads active session tokens and `demo_store_slug` cookies to resolve exact store permissions, live floor tables, rate configs, and billing records for that store only.
