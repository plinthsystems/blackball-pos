# Enterprise Setup Command Center Design

## Purpose

The current Platform Setup screen proves the backend works, but it does not explain the business model clearly enough for selling the product. The redesign will turn `/platform/setup` into an enterprise-grade command center that explains how the software works when sold as SaaS, used for owned outlets, or used for franchise management.

The page is for the Platform Owner first. It should also be demo-friendly enough that a club owner, franchisee, or investor can understand the tenant hierarchy, access boundaries, and onboarding process without verbal explanation.

## Research Signals

Comparable enterprise tools use a few consistent patterns:

- Multi-location POS products lead with central visibility, configuration control, and per-location flexibility.
- Franchise systems distinguish franchisor, franchisee, outlet, and staff views.
- Permission systems are described by hierarchy and scope, not only by role names.
- Onboarding flows explain what records and logins get created before asking for form input.

The redesign should use those patterns while staying focused on the current app’s existing models: `Organization`, `Franchisee`, `Business`, `Employee`, `Subscription`, `RoyaltyRule`, roles, permissions, tables, pricing, and products.

## Product Model To Explain

The system supports three commercial modes:

1. **Independent SaaS Club**
   - Platform Owner creates an independent organization and one outlet.
   - Club Owner receives a store owner login.
   - Staff receives store-level access.
   - Subscription is attached to the organization/outlet.
   - Data is isolated to that tenant.

2. **Owned Outlets**
   - Platform Owner creates an organization for their own brand.
   - Multiple outlets can exist under the same organization.
   - Owner/HQ login can compare outlet performance.
   - Store staff remain scoped to their outlet.

3. **Franchise Network**
   - Platform Owner creates a franchise brand organization.
   - Franchisees are created under that organization.
   - Outlets are attached to franchisees.
   - Franchise HQ sees the whole brand network.
   - Franchisee users see only their outlets.
   - Royalty rules are configured per franchisee or brand.

## Page Structure

The redesigned screen will be a single command center with five sections.

### 1. Executive Summary

Top band with the title **Enterprise Setup Command Center** and a short message:

“Configure tenants, outlets, roles, subscriptions, and franchise rules from one place.”

Include compact metrics:

- Organizations
- Franchisees
- Outlets
- Plans

### 2. Operating Models

Three side-by-side model cards:

- **Sell as SaaS**
- **Manage owned outlets**
- **Run franchise network**

Each card should show:

- Who owns the account
- What gets created
- Who logs in
- What they can see
- The correct action to start

This replaces the current generic guide cards.

### 3. Hierarchy And Data Scope

Show a clear hierarchy lane:

`Platform Owner -> Organization/Brand -> Franchisee -> Outlet -> Store Team`

Below it, show the data visibility rule:

- Platform Admin: all tenants
- Franchise HQ: all outlets in their organization
- Franchisee Owner: only their franchisee outlets
- Store Owner/Manager: assigned outlet or organization stores
- Staff: live floor, billing, and food operations for assigned outlet

This is the core answer to “how will it work?”

### 4. Setup Playbooks

Replace raw form-first layout with playbook panels:

- **Create SaaS Club**
  - Creates organization, outlet, owner login, optional staff login, subscription, default table/rate/menu setup.

- **Create Franchise Outlet**
  - Creates/selects franchise brand, creates franchisee, outlet, owner login, subscription, royalty rule, default table/rate/menu setup.

Each playbook should include a “What this creates” checklist next to the form.

### 5. Demo And Login Guide

Add a concise “After setup” section:

- Give owner email and default password.
- Owner updates branding, rates, and menu.
- Staff runs live floor and billing.
- HQ/franchise users use dashboard/store switcher.

This section should not be marketing copy; it should be an operational checklist.

## Visual Direction

This page should be calmer and more enterprise than the live floor gaming theme.

Use:

- Dark admin shell to stay consistent.
- Dense but readable cards.
- Clear hierarchy lines and scoped labels.
- Small badges for role/account type.
- Tables or matrix blocks where clarity matters.

Avoid:

- Oversized decorative hero treatment.
- Too many glowing effects.
- Vague phrases like “self telling system” without operational meaning.
- Form fields before the operator understands the model.

## Implementation Scope

This iteration changes the frontend structure and copy of `/platform/setup`.

It should reuse the existing server actions:

- `createSaasSetupAction`
- `createFranchiseSetupAction`

It should reuse existing props:

- subscription plans
- organizations

It may add counts to the page query if simple:

- franchisee count
- outlet count

No new database models are required in this iteration.

## Tests

Update component tests for `PlatformSetupPage` to assert:

- Enterprise Setup Command Center title is visible.
- SaaS, owned outlet, and franchise operating models are visible.
- hierarchy text is visible.
- access matrix roles are visible.
- setup playbooks show what each action creates.
- existing form labels/buttons remain available.

Run:

- focused component/unit tests for platform setup and routing
- `npm run typecheck`
- full test suite if local database is available

## Success Criteria

The redesigned page succeeds if a viewer can answer these questions within one minute:

- If I sell to one club, what gets created?
- If I sell to a franchisee, what gets created?
- Who can see which outlets?
- Which login should I give to the owner or staff?
- How do subscriptions and royalties fit into the hierarchy?

The page should feel like enterprise setup software, not a simple demo form.
