# PROJECT CONTEXT: Global Architecture, Standards & System Context

## 1. PROJECT OVERVIEW & GOAL

We are building a multi-tenant Enterprise Resource Planning (ERP) system tailored for company operations, project delivery, HR management, client relations, and financial accounting.

The primary system modules include:

- **Authentication & RBAC**: NextAuth.js with granular role-based access control (Roles, Permissions, Audit Logs).
- **HRM (Human Resource Management)**: Staff records, contracts, leaves, timesheets, and attendance.
- **CRM (Customer Relationship Management)**: Leads, pipeline status, and client management.
- **Project & Task Management**: Client contracts, multi-member project tracking, timesheets, and tasks.
- **Finance & Inventory**: Incomes, expenses, salary calculations, loan deductions, and office asset inventory tracking.
- **System Options & Setup**: Dynamic lookup options (`Option` model) and company profile configuration (`Setup` model).

---

## 2. TECHNICAL STACK & CONSTRAINTS

### Core Technology

- **Framework**: Next.js (App Router, React Server Components, Server Actions).
- **Language**: JavaScript ONLY (`.js` and `.jsx` extensions). Do NOT generate TypeScript (`.ts` or `.tsx`) files or types under any circumstances.
- **Database & ORM**: MySQL using Prisma ORM. Reference `@prisma/schema.prisma` for data modeling.
- **Authentication**: NextAuth.js managed via `@/lib/auth.js`.
- **UI Engine**: Vuexy Next.js Template (2026 version).

### Architectural Rules

1. **Server Actions First**: All data mutations and database queries must use Next.js Server Actions placed in `@/actions/`. Do NOT create legacy REST API routes (`/api/...`) unless explicitly requested for third-party webhooks.
2. **RBAC & Authorization**: Every Server Action must enforce session validation and permission checks using `@/lib/auth.js` before executing Prisma queries.
3. **Data Integrity**: Financial amounts must preserve two decimal places using Prisma `Decimal` types.
4. **File Extension Policy**: Always explicitly reference and create JavaScript files using `.js` or `.jsx`.

---

## 3. DESIGN SYSTEM & VUEXY TEMPLATE RULES

- Strictly follow the layout structures, SCSS/CSS variables, MUI components, and icon conventions provided by the Vuexy Next.js template.
- Do NOT introduce external UI frameworks, raw Tailwind overrides that conflict with Vuexy, or unstyled third-party elements.
- Utilize existing Vuexy form controls, tables, dialogs, badges, and card components for visual consistency.

---

## 4. WORKFLOW EXECUTION DIRECTIVES FOR CODEX

When assigned future coding tasks:

- **Minimal Changes**: Edit ONLY the files explicitly targeted in the prompt. Do not refactor unrelated files or make unprompted layout changes.
- **Error Handling**: Standardize Server Action responses to return `{ success: boolean, data?: any, error?: string }`.
- **Prisma Synchronization**: Strictly follow the structure defined in `@prisma/schema.prisma`.

---

## 5. LOCALIZATION RULES (UI-ONLY)

- **Supported Languages**: English (`en`) is the primary and default language. Pashto (`ps`) and Dari (`fa`) are also supported.
- **Dashboard UI Scope**: Localization applies ONLY to the Dashboard UI, including navigation, page headings, layout labels, table columns, form input labels and other form UI, dynamic status badges, buttons, and system messages.
- **English-Only Data & Inputs**: Database fields, dynamic content submissions, and record entries must remain strictly in English (`en`). Do NOT create multi-language database fields or duplicate form inputs across languages.
- **RTL Support**: When Pashto (`ps`) or Dari (`fa`) is selected, enforce Right-to-Left (RTL) layout switching through Vuexy's built-in RTL provider using `stylis-plugin-rtl`.

---

## 6. FILE STORAGE & VALIDATION RULES

- **Local File Storage Only**: Do not use third-party cloud storage services. All file uploads, including staff avatars, contract PDFs, and expense receipts, must be written directly to local server storage in `public/uploads/`.
- **Upload Implementation**: Handle local file writes within Next.js Server Actions using only Node.js built-in `fs/promises` and `path` modules.
- **Valibot Standard**: Maintain Valibot as the sole schema validation library for both client-side forms and server-side input sanitization inside Server Actions.
- **Client-Side Validation**: Integrate Valibot with `react-hook-form` through `@hookform/resolvers/valibot`.
- **Validation Package Policy**: Do NOT introduce Zod or refactor existing Vuexy Valibot schemas.

### 7. CODE REUSABILITY & COMPONENT ARCHITECTURE STANDARDS

- **DRY Logic Abstraction**: Do NOT duplicate complex business logic, repeated Server Action patterns, table filter/pagination utilities, or recurring form structures across multiple pages. Move shared patterns into centralized utility functions, custom hooks, or generic wrapper components.
- **Reusable Component Threshold**: Create dedicated reusable UI components or custom hooks when a structural pattern or UI layout is used repeatedly across **3 or more** different modules/pages.
- **Inline Component Allowance**: Do NOT over-engineer single-use abstractions or force minor UI snippets into separate files if used only 2-3 times with minimal code footprint (10-20 lines). Keep simple, localized logic inline unless reusability scales.
- **Server Action & Validation Consistency**: Use standard helper wrappers for handling Server Action responses, error sanitization, and Valibot schema execution across all backend actions.

### 8. GLOBAL FORM, TABLE & ENTITY UI STANDARDS

- **Select/Dropdown Default Values**: Every Select or Dropdown field in forms and tables must explicitly declare a bound default fallback value, such as “Select Option” or an intentional default state. Never render a Select component with an undefined or unbound value.
- **Form Validation & Inline Errors**: Do not rely on native HTML `required` validation. All forms must use React Hook Form or explicit custom validation state and render localized inline error text beneath invalid fields using `FormHelperText` or an equivalent red helper message after submission.
- **Empty Table States**: Empty-state rows inside data tables must never receive row hover highlighting or hover background transitions. Every actionable entity table empty state must include a relevant creation/action button when the current user has permission to perform that action.
- **Entity Creation UI Pattern**: All entity create/edit forms must open in a slide-over side drawer to maintain consistency with HRM workflows. Options/master-data forms are the explicit exception and may continue using popup dialogs.

### 9. MANDATORY PAGE LAYOUT, FILTER, KPI & TABLE DENSITY RULES

1. **Clean Page Header Layout (No Top Header Cards)**:
   - Do NOT wrap page titles and descriptions inside isolated top Card wrappers.
   - Titles and descriptions must sit directly at the top-left of the page content area.
   - The primary action button (for example, "Log New Visitor" or "Add Staff") must sit cleanly integrated beside the filter bar, eliminating redundant header card containers.

2. **Mobile KPI Horizontal Scroll (`overflow-x-auto`)**:
   - KPI summary cards must NEVER stack vertically on mobile screens and consume the entire viewport height.
   - Wrap top KPI summary grids in a responsive horizontal scroll container each KPI card so users can scroll horizontally across metrics on mobile and tablet screens.

3. **Collapsed Filters Popover Button**:
   - Do NOT display multiple loose filter dropdowns side-by-side where they consume excessive horizontal or vertical space.
   - Keep the main search input visible on the left. Group every secondary filter dropdown (Status, Position, Department, Date Range, and similar controls) inside a single **Filters** popover/dropdown button using `<Button startIcon={<IconFilter />}>Filters (Count)</Button>`. Clicking the button must open a clean popover menu containing the current filter inputs.

4. **Strict Table Cell Content Density (Maximum 1-2 Lines)**:
   - Table rows must remain compact and low-density. Never stack three or four lines of text (for example, Name, Role, Phone, and Email) vertically in a single cell.
   - Limit cell content strictly to one or two clean lines. Move secondary details such as full addresses, exact durations, or internal notes into a hover tooltip, an entity detail drawer, or a separate table column.

5. **Hidden Table Scrollbar Track**:
   - Table scroll containers must preserve smooth horizontal scrolling without rendering visible scrollbar tracks or native scrollbar chrome.
   - Apply the global `no-scrollbar` utility to table wrappers so they use `scrollbar-width: none`, `-ms-overflow-style: none`, and `&::-webkit-scrollbar { display: none; }` behavior.

### 10. MANDATORY BREADCRUMB, INLINE SELECT & MULTI-CURRENCY ARCHITECTURE RULES

1. **Breadcrumb Header Standard**:
   - Replace heavy header card banners with a clean, lightweight reusable `<Breadcrumbs />` component across all dashboard pages.
   - Breadcrumb text must be responsive: extra-small on mobile (`text-xs`) and medium on desktop (`md:text-sm`), with clear path separators (`/` or `>`) and the active page title rendered with `font-semibold text-foreground`.

2. **Inline Table Select Styling**:
   - Status and other inline dropdown selectors placed directly inside data table cells must NEVER render browser-default gray backgrounds or hard borders.
   - Inline table selects must explicitly use transparent, borderless, shadowless styling equivalent to `bg-transparent border-none outline-none focus:ring-0 shadow-none`. This is mandatory for the HRM contracts table status dropdown.
   - Active selections must render as clean, soft-tinted status badges (for example, `bg-success/10 text-success`).

3. **Multi-Currency System Architecture**:
   - **System Base Currency**: Setup (`/setup`) manages the system base currency (`AFN` or `USD`, default `AFN`) and the default USD/AFN exchange rate (for example, `1 USD = 65 AFN`) so administrators can change the baseline later.
   - **Transaction-Level Currency**: Every monetary input form, including Leads Estimated Value, Invoices, Contracts, Payroll, Expenses, and future financial modules, must include a currency selector (`USD` or `AFN`) beside the amount field. New records default to the configured system base currency.
   - **Database Persistence & Rate Locking**: Every monetary Prisma model must persist the original transaction amount, `currency`, transaction `exchange_rate`, and a pre-calculated `amount_base`. Existing domain-specific amount fields may remain, but `amount_base` must contain that transaction's primary amount converted to the configured system base currency at submission time. The captured transaction exchange rate is historical data and must remain locked even if the global Setup rate changes later.
   - **Display & KPIs**: Tables display each record in its stored transaction currency. KPI totals aggregate the stored `amount_base` values directly in the System Base Currency rather than recalculating from the current global exchange rate.
   - **Conversion Semantics**: The configured exchange rate represents AFN per one USD (`1 USD = exchange_rate AFN`). Converting USD to AFN multiplies by the rate; converting AFN to USD divides by the rate.
   - **AFN Precision**: Afghan Afghani values display with zero decimal places and round to whole integers (for example, `1,000 AFN`). Never display `.00` or sub-units for AFN.
   - **USD Precision**: US Dollar values display with exactly two decimal places (for example, `$1,000.00`).

## Master RBAC & Permissions Blueprint

This blueprint defines system-wide Role-Based Access Control (RBAC) rules mapped directly to our `schema.prisma` models. Use this specification as the single source of truth when implementing server actions, API authorization checks, navigation menu visibility, and component-level permission rendering.

### 1. Super Admin (System Owner)

- **Setup (`SystemSetting`, `Setup`):** Read, Update (Controls global branding, currency, tax rates).
- **Options (`Option`):** Create, Read, Update, Delete (Controls all dropdowns like Lead Status, Task Priorities, Expense Types).
- **Auth & Roles (`User`, `Role`, `Permission`, `AuditLog`):** Create, Read, Update, Delete (Assigns roles to users, reviews security audit logs).
- **All Other Modules:** Full CRUD (Create, Read, Update, Delete) access to everything globally.

### 2. HR Manager (Human Resources)

- **HRM (`HrmStaff`, `HrmStaffContract`):** Create, Read, Update, Delete (Adds employees and manages employment contracts).
- **Attendance & Leaves (`HrmStaffLeave`, `HrmStaffTimesheet`):** Read (Global), Update (Approve/Reject leaves and timesheets).
- **Finance (Payroll & Loans) (`FinanceSalary`, `FinanceLoan`):** Create, Read, Update (Prepares draft salaries based on attendance and approves staff loan requests).
- **Options (`Option`):** Read (Views Leave Types, Contract Types).
- **Other Modules:** Restricted. No access to CRM, Projects, or general Finance.

### 3. Finance Manager (Accounting)

- **Finance (`FinanceIncome`, `FinanceExpense`):** Create, Read, Update, Delete (Logs all money in/out, sets exchange rates).
- **Invoicing (`ContractInvoice`):** Create, Read, Update, Delete (Generates bills for clients).
- **Payroll Execution (`FinanceSalary`):** Update (Takes HR-drafted salaries and marks them as "Paid", generating final payable amounts).
- **Inventory (`Inventory`):** Create, Read, Update, Delete (Tracks physical assets, SKUs, and reorder levels).
- **HRM & Contracts:** Read-Only (Views staff base salaries and signed contract values to verify financial data).

### 4. Sales Manager (CRM & Contracts)

- **CRM (`CrmLead`, `CrmClient`, `CrmVisitor`):** Create, Read, Update, Delete (Manages pipeline, converts leads to clients, tracks office visitors).
- **Contracts (`Contract`, `ContractNotification`):** Create, Read, Update (Drafts agreements, sets auto-renewals, manages expiration notifications).
- **Invoicing (`ContractInvoice`):** Read-Only (Views client payment status, cannot modify invoices).
- **Options (`Option`):** Read (Views Lead Sources, Contract Statuses).

### 5. Project Manager (Operations)

- **Projects (`Project`, `ProjectMember`):** Create, Read, Update (Builds projects, sets budgets, assigns staff members).
- **Tasks (`Task`):** Create, Read, Update, Delete (Creates Kanban boards, assigns tasks, sets due dates).
- **Timesheets (`HrmStaffTimesheet`):** Read (Project-specific), Update (Approves hours logged by staff against assigned projects).
- **CRM & Contracts:** Read-Only (Assigned only; views client details and contract scopes for assigned projects).

### 6. Standard Employee (Staff Member)

- **Main Dashboard:** Read (Personal metrics only: open tasks, leave balance).
- **HRM Self-Service:**
  - `HrmStaff`: Read (Own profile only).
  - `HrmStaffLeave`: Create (Submit requests), Read (Own history).
  - `HrmStaffTimesheet`: Create (Check-in/out), Read (Own history).
- **Tasks (`Task`):** Read (Where `assigned_to_id` = current staff ID), Update (Changes status to "Done", logs actual hours worked).
- **Finance Self-Service:**
  - `FinanceExpense`: Create (Submits personal reimbursement receipts).
  - `FinanceSalary`, `FinanceLoan`: Read (Views own payslips and loan balances).
- **Setup, Options, CRM, Contracts, Inventory:** Strictly Blocked.

---

### Implementation Guidelines

- **Global Permission Check:** If user has module-wide access (e.g., `finance:read`), query without user filter (e.g., `prisma.financeIncome.findMany()`).
- **Scoped Permission Check:** For non-manager roles (e.g., `tasks:read_assigned`), enforce relational constraints (e.g., `where: { assigned_to_id: currentStaffId }`).
- **UI & Navigation Guarding:** Filter navigation links and top-search palette using `hasPermission()` mapped to these rules.
