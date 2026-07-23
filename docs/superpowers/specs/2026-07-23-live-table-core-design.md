# Live Table Core Design

## Overview

Phase 1 builds the operational heart of the Pool & Snooker Club Management System: the staff/admin live table board and the backend session engine that keeps table availability, session timing, and billing-safe state transitions correct.

The application starts as a production-grade Next.js monolith with clean feature boundaries, Prisma/PostgreSQL persistence, service-layer business rules, and a Material Design 3-inspired admin interface. This phase is intentionally narrow: it creates a useful staff workflow and a durable foundation for booking, POS, billing, inventory, kitchen, customer portal, and reporting modules.

## Goals

- Provide a staff/admin dashboard that opens directly into a live table layout.
- Model tables, bookings, sessions, session extensions, invoices, payments, employees, roles, audit logs, and business settings in Prisma.
- Allow staff to start walk-in sessions, pause or resume sessions, extend sessions when no future conflict exists, end sessions, and move tables through operational states.
- Prevent overlapping active sessions and conflicting booking/session windows through backend validation and database constraints.
- Keep authoritative time and billing calculations on the backend.
- Establish a maintainable Next.js, TypeScript, Tailwind, Prisma, React Query, React Hook Form, and Zod foundation.
- Apply a restrained Material Design 3-inspired UI: clear hierarchy, light gray background, white surfaces, Google Blue primary actions, state colors only, Material Symbols icons, and dense staff-friendly layouts.

## Non-Goals

- Customer-facing landing website.
- Customer registration, login, invoices, or order history.
- Online checkout and payment capture.
- POS menu item ordering.
- Kitchen order management.
- Inventory stock deduction.
- PDF invoice generation.
- Detailed reports and analytics.
- Multi-branch support, memberships, tournaments, QR ordering, mobile apps, gift cards, loyalty programs, AI analytics, IoT lights, or CCTV integrations.

These modules will attach to the Phase 1 domain model later, but Phase 1 should not include empty screens for them.

## User Roles In Scope

Phase 1 includes role and permission data modeling, but only implements the staff/admin interface behavior needed for live table operations.

- Owner: full access to settings and all live table actions.
- Manager: live table actions, staff assignment, and operational overrides.
- Cashier: start, extend, end, and bill sessions.
- Staff: view tables, mark cleaning, and assist active sessions.

Authentication can be implemented with a local credentials provider in the initial app foundation, but advanced account lifecycle flows are outside Phase 1.

## Core Workflows

### Live Table Board

The default admin screen shows a responsive desktop-first table board. Each table card displays:

- Table number.
- Game type: Pool or Snooker.
- Status: Available, Reserved, Occupied, Cleaning, Maintenance, or Blocked.
- Customer name when known.
- Current session timer as a visual frontend display.
- Planned end time.
- Backend-calculated current bill estimate.
- Assigned staff member.
- Primary action for the current state.
- Secondary action menu for less frequent actions.

The board supports table filtering by status and game type. It refreshes from server state and is designed so Socket.io updates can be added without rewriting the component model.

### Walk-In Session

Staff can start a session without an online booking:

1. Select an available table.
2. Enter optional customer name and phone.
3. Choose duration: 30 minutes or 1 hour.
4. Assign staff member when applicable.
5. Start session.

The backend creates or links a lightweight customer record when customer details are provided, creates a session, marks the table occupied, and writes an audit log entry in a transaction.

### Session Lifecycle

A session can move through these states:

- Active.
- Paused.
- Completed.
- Cancelled.

The session stores start time, planned end time, actual end time, pause intervals, extensions, and billing snapshot data. The frontend timer is visual only. The final billable duration and current bill estimate come from backend services.

### Session Extension

Staff can extend an active session by 30 or 60 minutes. The backend checks for future bookings or sessions on the same table before allowing the extension.

If the extension would overlap a future booking or blocked table period, the request fails with a clear reason. The UI displays that reason in a dialog or snackbar and leaves the existing session unchanged.

### Table Operations

Staff can update operational states:

- Available to Blocked.
- Available to Maintenance.
- Available to Cleaning.
- Cleaning to Available.
- Maintenance to Available.
- Blocked to Available.

Occupied tables cannot be blocked or moved to maintenance without ending or transferring the session. Transfer table is modeled as a future-ready operation but not implemented in Phase 1.

### End Session

When staff ends a session, the backend records actual end time, calculates billable duration from authoritative server timestamps, creates an invoice draft for table charges, marks the table as cleaning by default, and writes audit logs.

Payment collection and final invoice settlement are outside Phase 1. The draft invoice gives the later billing module a real contract to build on.

## Architecture

### Application Shape

The project will use a Next.js App Router monolith:

- `app/` for routes and route-level layouts.
- `features/live-tables/` for table board UI, hooks, actions, and domain adapters.
- `features/sessions/` for session forms, lifecycle actions, and validation schemas.
- `server/` for repositories, services, authorization helpers, and audit logging.
- `prisma/` for schema and migrations.
- `tests/` for unit and integration tests.

This keeps deployment simple while preserving boundaries that can later support services or workers.

### Domain Boundary

Session state changes must go through service functions. UI components and route handlers do not update Prisma models directly.

Primary services:

- `TableService`: reads table board state and changes operational table status.
- `SessionService`: starts, pauses, resumes, extends, and ends sessions.
- `PricingService`: calculates planned and actual table charges from pricing rules.
- `AuditLogService`: records user-visible state changes.

Repositories wrap Prisma queries and expose persistence-oriented methods. Services own business rules.

### Data Flow

1. UI form submits validated data through a server action or route handler.
2. Zod validates input at the boundary.
3. Authorization checks confirm the employee can perform the action.
4. Service opens a Prisma transaction.
5. Repository methods read and mutate rows inside the transaction.
6. Service checks overlap, status, and lifecycle invariants.
7. Service writes audit log entries.
8. UI invalidates React Query cache and refreshes board state.

### Real-Time Readiness

Phase 1 does not need a full Socket.io deployment, but state changes will emit internal domain events through a small event publisher interface. The first implementation can use an in-process no-op publisher. Later, Socket.io can subscribe to these events without changing service call sites.

Event names:

- `table.status_changed`.
- `session.started`.
- `session.paused`.
- `session.resumed`.
- `session.extended`.
- `session.ended`.

## Database Design

### Prisma Models

Phase 1 will include these Prisma models:

- `Business`: tenant/business record for the club.
- `BusinessSettings`: GST/tax, booking buffer, default currency, and operating rules.
- `Employee`: staff account profile.
- `Role`: role name and description.
- `Permission`: permission key.
- `EmployeeRole`: employee-role join table.
- `RolePermission`: role-permission join table.
- `Customer`: name, phone, email, visit metrics.
- `ClubTable`: table number, game type, current status, and pricing group.
- `Booking`: future online booking-ready model.
- `Session`: live play session.
- `SessionPause`: pause interval records.
- `SessionExtension`: extension history.
- `Invoice`: draft invoice record for table charges.
- `Payment`: payment-ready model, initially unused beyond schema contract.
- `AuditLog`: employee, action, entity, timestamp, and metadata.
- `Notification`: future-ready operational notifications.
- `TablePricing`: pricing rules by game type and duration.

POS and inventory models will be added in their own phase, not in this schema pass, because no Phase 1 workflow writes product or stock records.

### Important Fields

`ClubTable`:

- `id`.
- `businessId`.
- `number`.
- `gameType`: Pool or Snooker.
- `status`: Available, Reserved, Occupied, Cleaning, Maintenance, or Blocked.
- `pricingGroup`.
- `version` for optimistic locking.

`Session`:

- `id`.
- `businessId`.
- `tableId`.
- `customerId`.
- `assignedEmployeeId`.
- `status`.
- `startedAt`.
- `plannedEndAt`.
- `actualEndAt`.
- `pausedAt`.
- `billableSecondsSnapshot`.
- `createdByEmployeeId`.
- `version`.

`Booking`:

- `id`.
- `businessId`.
- `tableId`.
- `customerId`.
- `status`.
- `startsAt`.
- `endsAt`.
- `lockedUntil`.

`Invoice`:

- `id`.
- `businessId`.
- `sessionId`.
- `status`: Draft, Open, Paid, Cancelled.
- `subtotalAmount`.
- `taxAmount`.
- `discountAmount`.
- `totalAmount`.
- `currency`.

### Constraints and Indexes

- Unique table number per business.
- Indexed table status and game type for board queries.
- Indexed session table, status, start, and planned end times.
- Indexed booking table, status, starts, and ends.
- Unique draft invoice per session.
- Optimistic `version` fields on mutable operational records.

PostgreSQL exclusion constraints are preferred for preventing overlapping confirmed bookings and active sessions on the same table. Prisma migrations can add these constraints through raw SQL when Prisma schema syntax is insufficient.

## API and Server Actions

Phase 1 exposes focused endpoints or server actions:

- `getLiveTableBoard(businessId)`: returns table cards with current session summaries.
- `startWalkInSession(input)`: starts a new session for an available table.
- `pauseSession(input)`: pauses an active session.
- `resumeSession(input)`: resumes a paused session.
- `extendSession(input)`: extends a session if no future conflict exists.
- `endSession(input)`: ends a session and creates a draft invoice.
- `updateTableOperationalStatus(input)`: changes table status for available non-occupied tables.

All mutation inputs use Zod schemas. All mutation outputs return either a success object with updated entity IDs or a typed domain error with a user-safe message.

## UI Components

### Admin Shell

The admin shell contains:

- Left navigation rail on desktop.
- Top app bar with current business, date, and staff identity.
- Main content area with light gray background.
- White surface panels with subtle borders and Material-style elevation.

Navigation includes only working Phase 1 areas:

- Live Tables.
- Settings.

Future modules are not shown as disabled navigation items.

### Live Table Board Components

- `LiveTablePage`: route-level composition and data loading.
- `TableBoardToolbar`: filters, refresh control, and quick status counts.
- `TableGrid`: responsive table card grid.
- `TableCard`: status, customer, timing, bill estimate, and actions.
- `StartWalkInDialog`: form for starting a walk-in session.
- `ExtendSessionDialog`: extension choices and conflict messages.
- `EndSessionDialog`: confirms billable summary before ending.
- `TableStatusMenu`: cleaning, maintenance, block, and unblock actions.
- `SnackbarHost`: user-safe success and error messages.

The UI should be dense, legible, keyboard navigable, and fast for repeated staff use.

### Visual Rules

- Use Inter or Roboto.
- Use Material Symbols for iconography.
- Use Google Blue for primary actions.
- Use green, amber, and red only for state communication.
- Avoid decorative gradients, emojis, glassmorphism, neon colors, oversized typography, and marketing-style cards.
- Keep cards at 8px radius or less.
- Avoid nested cards.
- Ensure text fits within controls across desktop and tablet widths.

## Validation and Error Handling

Validation occurs at three levels:

- Zod schemas validate request input.
- Services enforce business invariants.
- Database constraints protect concurrency and overlapping time ranges.

User-safe domain errors:

- `TABLE_NOT_AVAILABLE`: table is not available for a new session.
- `SESSION_NOT_ACTIVE`: action requires an active session.
- `SESSION_NOT_PAUSED`: resume requires a paused session.
- `EXTENSION_CONFLICT`: future booking or block prevents extension.
- `OVERLAPPING_SESSION`: table already has a conflicting session.
- `INVALID_STATUS_TRANSITION`: requested table or session transition is not allowed.

Unexpected errors are logged server-side and shown as a neutral failure message in the UI.

## Security and Authorization

Phase 1 includes the permission model and enforces action-level permissions. Each mutation receives the current employee context and checks the required permission key.

Permission examples:

- `tables.read`.
- `tables.update_status`.
- `sessions.start`.
- `sessions.pause`.
- `sessions.resume`.
- `sessions.extend`.
- `sessions.end`.
- `settings.update`.

Audit logs record who performed each state-changing action, what entity changed, and relevant metadata such as old status, new status, start time, end time, and extension duration.

## Testing Strategy

### Unit Tests

Unit tests cover:

- Session billing duration calculation.
- Pause and resume duration behavior.
- Table status transition rules.
- Extension conflict decisions.
- Zod validation for session mutations.

### Integration Tests

Integration tests cover service methods with a test database:

- Starting a walk-in session marks the table occupied and creates audit logs.
- Starting a session fails if the table is occupied, cleaning, maintenance, or blocked.
- Extending a session fails when a future booking would overlap.
- Ending a session creates a draft invoice and marks the table cleaning.
- Concurrent start attempts cannot create overlapping active sessions.

### UI Tests

Component and E2E tests cover:

- Table board renders all table states.
- Walk-in session dialog submits valid data and displays validation errors.
- Extension conflict error is visible to staff.
- Keyboard focus moves correctly through dialogs and primary actions.

## Accessibility

The admin UI follows WCAG 2.2 AA expectations:

- Visible focus indicators.
- Semantic buttons and form labels.
- Dialogs with accessible names and focus traps.
- Sufficient contrast for text and status indicators.
- Keyboard-accessible menus and actions.
- Status changes communicated through text, not color alone.

## Performance

The live table board should remain fast with hundreds of tables:

- Server-side data shaping for board cards.
- Indexed table, session, and booking reads.
- React Query cache with explicit invalidation after mutations.
- Pagination or grouping hooks available for future multi-room layouts.
- Minimal client state; backend remains authoritative.

## Phase 1 Completion Criteria

Phase 1 is complete when:

- The app scaffold runs locally.
- Prisma schema and migrations exist for the Phase 1 domain.
- Seed data creates one business, roles, employees, pricing, and a realistic set of pool and snooker tables.
- Live Tables is the default admin screen.
- Staff can start, pause, resume, extend, end, block, unblock, mark cleaning, and mark maintenance where allowed.
- Backend services prevent overlapping sessions and invalid extensions.
- Ending a session creates a draft invoice from backend-calculated duration.
- Unit, integration, and UI/E2E tests cover the critical session lifecycle.
- The UI follows the restrained Material Design 3-inspired direction from the master prompt.

## Future Phase Interfaces

Phase 1 leaves clean extension points:

- Online booking will use `Booking`, table availability checks, and overlap constraints.
- POS will attach order totals to `Session` and `Invoice`.
- Kitchen order management will attach order status updates to session orders.
- Inventory will react to fulfilled order items.
- PDF billing will finalize and render `Invoice`.
- Reporting will read sessions, invoices, payments, and table utilization.
- Real-time updates will subscribe to domain events through Socket.io.

## Open Decisions Resolved For Phase 1

- Phase 1 is admin-first, not customer-first.
- Only working navigation items are shown.
- Transfer table is not implemented in Phase 1.
- Payment collection is not implemented in Phase 1.
- POS and inventory tables are deferred until their workflows are implemented.
- Socket.io integration is prepared through event interfaces but full live push can be implemented after the service contracts are stable.
