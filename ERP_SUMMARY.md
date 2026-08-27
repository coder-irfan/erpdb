# ERP System Summary

## Core Architecture & Tech Stack

- Next.js 16 App Router serves the localized dashboard, server actions, and route handlers.
- Prisma ORM maps ERP entities to MySQL; transactional writes protect invoices, payroll, loans, leave, and inventory ledgers.
- React/MUI dashboard UI is styled alongside Tailwind/PostCSS utilities; NextAuth issues active-user sessions with role/permission claims.

## Module Logic Summaries

### System Setup & RBAC

## 1. User Creation & Provisioning

- The Roles & Permissions screen calls `inviteUser` after validating the name, normalized lowercase email, role, and optional staff link.
- `User.email` is unique. An email owned by an accepted account is rejected; a stale unaccepted placeholder may be replaced. Revoking a pending invite deletes its user row, token, sessions, role links, and staff link, so the same email can be invited again.
- A new invite creates a `PENDING_ACTIVATION` user, connects one `Role`, stores only a SHA-256 hash of a random 48-hour token, and sends the raw token in the email link. If delivery fails, the transaction is compensated by removing the new placeholder and staff link.
- Accepting the one-time link atomically consumes the token, hashes the chosen password with bcrypt, sets `emailVerified`, and changes the account to `ACTIVE`.
- `User` and `Role` use a many-to-many relation. Each `Role` reaches permission strings through `RolePermission -> Permission`.
- Assigning a role replaces the user's current role set. For an accepted `INACTIVE` user, the same operation also changes the account back to `ACTIVE`; restoration email is not currently sent.

## 2. Authentication & Login Flow

- NextAuth Credentials login normalizes the email, loads the user, requires a password hash and `account_status = ACTIVE`, and verifies the password with bcrypt. Pending, inactive, and suspended users cannot sign in.
- NextAuth uses JWT sessions. On session evaluation, the JWT callback reloads the user, active roles, and their permission keys from the database; inactive users receive no role or permission claims.
- The session callback exposes `id`, `accountStatus`, `roles`, and `permissions` to server and client code.
- The application proxy accepts only tokens whose `accountStatus` claim is `ACTIVE`. Server authorization independently checks the refreshed session status.
- Removing accepted-user access sets `INACTIVE`, clears roles, deletes stored sessions/tokens, and therefore blocks subsequent authenticated work while retaining the account and business history.

## 3. Role & Permission Hierarchy (RBAC)

- Seeded roles are data-driven, not hard-coded authorization levels: `super_admin`, `hr_manager`, `finance_manager`, `inventory_manager`, `employee`, `project_manager`, and `sales_manager` each map to permission strings.
- HR permissions cover staff, contracts, leave, timesheets, payroll, and reports. Finance covers income, expenses, salary, loans, inventory, and reports. Inventory, project, sales, and employee roles receive narrower module permissions.
- Permission keys follow resource/action wording such as `hrm_staff:read`, `finance_income:write`, and `settings_roles:manage`.
- `super_admin` is the explicit bypass in both navigation filtering and `hasPermission`/`hasAnyPermission`/`hasAllPermissions`, so it does not depend on every individual check at runtime.
- Only a Super Admin may assign the `super_admin` role, and Super Admin users plus the current user's own account are protected from role/status/removal actions.

## 4. UI Scoping & API Protection

- Navigation items declare a required permission. Vertical menu, horizontal menu, and search use `filterNavByPermissions`; components and pages use RBAC helpers or `<Can>` for buttons and actions.
- UI hiding is convenience, not the security boundary. Server actions call `authorizeAction`, which requires an active session and at least one required permission.
- API routes use `authorizeAction` for operation-specific permissions or `requireAuthenticatedApi` for authenticated-only endpoints; the proxy rejects inactive JWTs before API/page handling.
- Role administration requires `settings:manage` or `settings_roles:manage`. Backend checks are repeated for every mutation, including protected-user and Super Admin assignment rules.

## 5. Database Relationships & Data Safety

- `User.staff` is the optional one-to-one link to `hrmstaff`; revoking an unaccepted invitation releases that link before deletion so the employee can be invited again.
- `AuditLog.user_id` is optional and database deletion uses `SET NULL`, while audit `details` retain target IDs/emails. Inventory movements and loan repayments also use nullable creator links, preserving ledger records.
- Accepted users can be referenced by staff, audit, authentication, and module history. They are never hard-deleted by access removal: status becomes `INACTIVE` and roles are cleared.
- Only `PENDING_ACTIVATION` rows, or legacy `INACTIVE` placeholders with no verified email, password, login, or OAuth account, qualify as unaccepted invitations and are hard-deleted.
- This database now correctly separates disposable invitation state from durable user history: pending revoke is a hard delete; accepted-account revoke is a soft disable; inactive role assignment is reactivation.

### HRM, Timesheets & Payroll

- Approved leave creates dated `LEAVE` timesheets with backups; rejection/reversal restores the prior attendance state.
- Monthly payroll uses working days, attendance, paid leave, join/termination dates, bonuses, and capped active-loan deductions.
- Paying payroll creates idempotent salary-deduction loan repayments in a serializable transaction.

### Finance, Invoices & Multi-Currency

- Income, expenses, salaries, contracts, invoices, loans, and stock retain currency, exchange rate, and base-currency values.
- Invoice payments aggregate income inside serializable settlement transactions, preventing overpayment and deriving unpaid/partial/paid status.
- Invoice-linked incomes now inherit the invoice currency and locked rate, avoiding mixed-currency settlement errors.

### Loans & Ledger Movements

- Loan state transitions are constrained; repayments use the repayment ledger as the source of truth and cannot exceed the balance.
- Loan quotes now persist the validated entered rate for new/pre-repayment currency changes; posted same-currency loans retain their locked rate.

### Inventory & Stock Movements

- Stock is ledger-based: additions, deductions, returns, and transfers calculate before/after quantities transactionally.
- Negative stock and invalid/backdated movement sequences are rejected; item status follows computed stock level.

### CRM, Contracts & Automated Email Alerts

- CRM links leads, clients, managers, contracts, projects, invoices, and activities through validated foreign-key relationships.
- Authorized cron calls check active contracts at 30/15/3 days, de-duplicate notification records, and isolate individual SMTP failures.
- Nodemailer requires SMTP configuration, HTML-escapes dynamic fields, and returns controlled failures rather than crashing the route.

## Audit Verdict & Logic Verification

- Role access: **PARTIAL** — authentication and permission enforcement pass; department-level isolation cannot pass because staff/roles have no department or per-record scope model. Add scope assignments and query policies before claiming department isolation.
- Financial calculations: **PASS** — conversion formulas, settlement tolerance, partial payments, payroll deductions, and inventory balances were traced; locked invoice currency/rate and loan quote persistence were fixed.
- Automated emails: **PASS** — cron secret validation, idempotent notification writes, escaped templates, and per-contract error handling are present. SMTP environment variables must be configured in deployment.
- Leave/payroll sync: **PASS** — approved leave is synchronized and reversible; payroll consumes paid leave and attendance while excluding non-working days.

## Audit Fixes / Remaining Edge Cases

- Fixed: module-only timesheet access no longer exposes or changes other employees’ records; bulk attendance requires broad HR write access.
- Fixed: an invoice receipt can no longer settle a balance using a mismatched currency/rate; new loans no longer discard a validated custom quote.
- Remaining design requirement: introduce departments/ownership scopes and apply them to CRM, finance, inventory, and HR queries for true department-level data isolation.
