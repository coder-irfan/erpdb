# ERP System Summary

## Core Architecture & Tech Stack

- Next.js 16 App Router serves the localized dashboard, server actions, and route handlers.
- Prisma ORM maps ERP entities to MySQL; transactional writes protect invoices, payroll, loans, leave, and inventory ledgers.
- React/MUI dashboard UI is styled alongside Tailwind/PostCSS utilities; NextAuth issues active-user sessions with role/permission claims.

## Module Logic Summaries

### System Setup & RBAC
- Roles are data-driven: active role-permission mappings are loaded into the session; `super_admin` bypasses individual permission checks.
- APIs and server actions enforce module/action permissions and record material changes in `auditlog`.
- Employee timesheet reads/writes are scoped to the linked staff record; broad HR permissions retain team management access.

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
