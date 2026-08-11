# Split Enterprise Setup Flow Design

## Goal

The platform setup experience should feel like enterprise onboarding, not a long document with forms at the bottom. A platform admin should understand the operating model first, then choose a focused setup path for SaaS tenants or franchise outlets.

## Root Cause

SaaS setup currently creates tenant records successfully when a valid plan is submitted, but the page stays visually unchanged after submit. There is no success confirmation, created account summary, or next step, so the user reasonably thinks the setup did not work. The server action also creates records before subscription creation, so an invalid plan can leave partial tenant data.

## Design

`/platform/setup` becomes the setup home. It shows the commercial models, tenant hierarchy, access model, live platform metrics, and clear calls to action for setup flows. It does not contain large setup forms.

`/platform/setup/saas` becomes the SaaS club setup page. It contains a focused form for an independent club, a short explanation of what will be created, recent SaaS tenants, and a success state after creation with the outlet name, owner login, optional staff login, default password, and next dashboard link.

`/platform/setup/franchise` becomes the franchise setup page. It contains a focused form for brand, franchisee, outlet, plan, and royalty percent. Its success state shows the franchise brand, franchisee owner login, outlet, royalty rule, and next dashboard link.

The setup actions should validate the selected plan before creating tenant data and should use Prisma transactions so setup either fully succeeds or fully fails. After success, each action redirects to its own setup page with a success query parameter that can render the confirmation handoff.

## Testing

Component tests should cover the setup home links and the two focused setup pages. Unit tests should cover successful setup redirect behavior and ensure invalid plan input does not create partial records.
