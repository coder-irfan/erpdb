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
