# ERP Business Logic & Workflow Documentation

This document describes the business purpose, user interface, data inputs, calculations, permissions, and cross-module workflows implemented in the ERP platform. It is written for business owners, managers, operational users, and implementation teams.

## 1. Executive System Overview

The platform manages customer relationships, contracts, projects, employees, attendance, payroll, income, expenses, loans, inventory, and management reporting in one ERP workspace. It gives managers operational lists, status filters, summary cards, detail views, drawers, Kanban boards, reports, and audit visibility for day-to-day decisions. Customer work can move from visitor or lead capture to client, contract, project, task, invoice, payment, and financial reporting. Workforce data flows from staff records and attendance into leave management, payroll, loan deductions, and finance reporting. Company setup, configurable options, role permissions, currency settings, exchange rates, branding, and audit logs control how the system operates.

### End-to-end business pipeline

| Business stage               | Primary module              | Business result                                                                                                           |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Visitor or prospect captured | CRM                         | A visitor is registered or a lead is created with ownership and follow-up information.                                    |
| Opportunity qualified        | CRM                         | Lead status, value, source, assigned representative, notes, and activities are maintained.                                |
| Customer accepted            | CRM                         | A Won lead can be converted into an active client.                                                                        |
| Commercial agreement created | Contracts                   | A client-linked contract is created, dated, valued, assigned a type, and given a lifecycle status.                        |
| Delivery planned             | Projects & Tasks            | A project is linked to the client and optionally the contract; tasks and staff responsibilities are defined.              |
| Work performed               | Tasks, Timesheets, Expenses | Progress, actual hours, attendance, project expenses, and supporting records are captured.                                |
| Customer billed              | Invoices                    | An invoice is created from a contract, with issue date, due date, amount, and payment status.                             |
| Money collected              | Finance                     | Invoice payment creates a paid income record and closes the invoice.                                                      |
| Management review            | Dashboards & Reports        | Revenue, expenses, payroll, receivables, projects, pipeline, loans, inventory, and workforce indicators are consolidated. |

The implementation does not automatically create every downstream record: lead conversion creates a client, but contract, project, invoice, and finance records require separate user actions.

## 2. Module-by-Module Breakdown

### CRM

### Business purpose

CRM manages the relationship from visitor or prospect through lead qualification, customer conversion, and ongoing client management. It answers: who is the prospect, who owns the relationship, what is the opportunity worth, what happened last, what happens next, and what commercial records already exist?

### Key interface views

#### Visitors

- Visitor table with name, company, contact details, purpose, host, check-in status, and visit timing.
- Search and filters for host, status, and date range: today, last 7 days, last 30 days, or all.
- Check-in and checkout actions.
- Visitor form drawer and visitor-lead confirmation dialog.
- Summary cards for today’s visitors, active guests, completed visits, and converted visitors.

#### Leads

- Table view with lead, contact, source, status, estimated value, assigned representative, follow-up date, and actions.
- Kanban view with one column for each configured lead status.
- Search across lead title, company, contact, email, and phone.
- Filters for source, status, and assigned staff.
- Summary cards for active leads, pipeline value, follow-ups today, and conversion rate.
- Activity drawer for calls, meetings, emails, notes, and follow-up history.
- Individual actions for edit, activity, convert, and delete; there are no bulk actions.

#### Clients

- Client table with search, account-manager filter, and Active/Inactive status filter.
- Summary cards for active clients, lifetime revenue, active projects, and pending balance.
- Client profile modal with four areas: overview, relationships, finance, and activity.
- Relationship view connects the client to projects and contracts.
- Finance view shows invoices, paid revenue, and pending invoice amounts.

### Core forms and business inputs

| Form                              | Key fields                                                                                                              | Business meaning and calculation                                                                                                                                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor registration              | Full name, phone, email, company, purpose, host, notes                                                                  | Records the reason for the visit and the internal employee responsible for hosting it. Full name, phone, purpose, and host are required; email is optional during registration but required before visitor conversion.                                                              |
| Create/Edit Lead                  | Title, company, contact, email, phone, source, status, assigned staff, estimated value, currency, next follow-up, notes | Captures the opportunity, commercial potential, ownership, and next action. Title, contact, email, source, status, and currency are required. Value cannot be negative; AFN and USD are supported. The system stores a base-currency equivalent using the configured exchange rate. |
| Lead activity                     | Type, subject, description, due date                                                                                    | Creates a dated interaction or task owned by the current staff user. Subject and activity type are required; description and due date are optional.                                                                                                                                 |
| Client registration               | Company, primary contact, email, phone, tax number, account manager, status, address, notes                             | Creates or updates a customer relationship. Company, contact, email, phone, and status are required.                                                                                                                                                                                |
| Client activity                   | Call, meeting, email, note, or follow-up; subject, description, due date                                                | Records post-conversion relationship history and planned customer actions.                                                                                                                                                                                                          |
| Lead-source/status administration | Name and description                                                                                                    | Lets authorized administrators control the values used in lead forms, filters, and pipeline columns. Options can be activated, deactivated, edited, or deleted.                                                                                                                     |

### CRM lifecycle and automation

1. A visitor can be converted into a lead only when an email, host, Walk-in source, and New status are available.
2. Visitor information is copied into the lead, including contact details, host ownership, purpose, notes, and a conversion activity.
3. A lead is advanced through configured statuses. Status changes create completed follow-up history entries.
4. A lead can be converted only once. Conversion creates an Active client, transfers company/contact details and account ownership, marks the lead Won, and records a conversion activity.
5. Conversion is blocked when a client already exists with the same email.
6. Lead conversion does not create a contract, project, invoice, or finance record.

### Contracts & Invoices

### Business purpose

Contracts formalize client, HR, and other third-party agreements. Invoices turn client-contract obligations into receivables, while payment recording moves collected money into Finance.

### Key interface views

#### Contracts

- Contract list with tabs or filters for all, active, draft, expiring, expired, and other lifecycle states.
- Search and filters by client, status, type, and contract domain.
- Summary cards for active count/value, expiring count/value, active revenue, and total contract value.
- Contract detail modal showing linked client, lead, projects, invoices, status, dates, value, and renewal information.
- Contract print/preview capability and contract expiration auditing.
- Status can be updated independently; deleting a contract is blocked when projects or invoices depend on it.

#### Invoices

- Invoice list with search and filters for status, client, contract, and due-date range.
- Summary cards for total invoiced, paid revenue, overdue count/value, and outstanding balance.
- Invoice detail and print views.
- Payment dialog for recording a full payment.
- Status changes are available, but Paid must be achieved through payment recording rather than a simple status selection.

### Core forms and business inputs

| Form              | Key fields                                                                                                                                           | Business meaning and calculation                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer contract | Client, optional linked lead, title, contract type, duration, total amount, currency, exchange rate, start date, status, auto-renew, account manager | Defines the customer agreement, commercial value, term, owner, and renewal behavior. Client, title, type, duration, amount, currency, exchange rate, dates, and status drive validation. End date is calculated from start date and duration. |
| HR staff contract | Staff member, contract type/template, position title, base salary, currency, start/end dates, status                                                 | Defines the employee’s employment terms and salary context. It uses the shared contract engine but follows HR-specific inputs.                                                                                                                |
| Other contract    | Entity/title, purpose/type, amount, currency, exchange rate, start/end dates, status                                                                 | Records third-party agreements such as vendor procurement, office leases, software subscriptions, and maintenance contracts.                                                                                                                   |
| Invoice           | Client contract, client, amount, currency, exchange rate, issue date, due date, status                                                               | Creates a billing or retainer receivable directly against a client contract. The client must match the selected contract; amount and exchange rate must be positive; due date cannot precede issue date. Base-currency amount is calculated for reporting. |
| Invoice payment   | Payment date, full invoice amount, payment method, notes                                                                                             | Records collection of the complete invoice amount. Partial payment is not accepted by this workflow.                                                                                                                                          |

### Contract and invoice workflow

- Contracts receive generated contract numbers and retain a lifecycle status such as Draft, Active, Expired, or Cancelled.
- Contract duration determines the calculated end date for standard contract domains.
- An invoice must reference a contract and the matching client.
- Invoice records cannot be edited, deleted, or manually marked Paid after payment has been recorded.
- Recording payment creates a Finance income entry linked to the invoice, client, and contract, then marks the invoice Paid.
- Contract expiration auditing identifies expired or soon-to-expire contracts and supports notifications where configured.

### Projects & Tasks

### Business purpose

Projects manage delivery commitments, budget, schedule, ownership, and performance after a client engagement is accepted. Tasks break project work into actionable assignments and allow managers to compare planned hours with actual effort.

### Key interface views

#### Projects

- Project table with project code, title, client, manager, status, priority, budget, dates, and progress indicators.
- Search and filters for client, manager, status, and priority.
- Summary cards for active projects, budget/value, actual versus estimated hours, and overdue projects.
- Project detail modal with overview, team/members, timesheets, expenses, and income relationships.
- Inline project status updates, edit, delete, and detail actions.

#### Tasks

- Table and Kanban views.
- Search across task title, description, and project.
- Filters for project, priority, status, and assignee.
- Summary cards for total tasks, in-progress work, overdue work, and actual versus estimated hours.
- Task detail modal, task edit drawer, and log-hours dialog.
- Staff with limited task permissions see tasks they created or were assigned; users with global read access see the wider task scope.

### Core forms and business inputs

| Form               | Key fields                                                                                                                                                                  | Business meaning and calculation                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project            | Title, description, client, optional contract, manager, status, priority, estimated hours, area, sponsor, budget, currency, exchange rate, start/end dates, actual end date | Defines the delivery engagement. Client, title, status, priority, budget, currency, exchange rate, start date, and end date are required. Dates must be valid and end date cannot precede start date. Base budget is calculated in company currency. |
| Task               | Title, project, description, assignees, status, priority, estimated hours, actual hours, due date                                                                           | Assigns a unit of work to one or more staff members. Title, project, status, and priority are required. Hours cannot be negative; due date is optional.                                                                                              |
| Log task hours     | Hours to add                                                                                                                                                                | Increases actual task hours by a positive amount and updates progress reporting.                                                                                                                                                                     |
| Project membership | Staff member and role, where managed from the project detail area                                                                                                           | Defines who participates in a project and supports delivery visibility.                                                                                                                                                                              |

### Project and task workflow

1. A project is created for an active client and may be linked to a contract.
2. Project status and priority establish delivery urgency and lifecycle.
3. Tasks are created under the project, assigned to staff, and tracked in table or Kanban form.
4. Statuses marked completed record completion timing; overdue indicators compare due/end dates with the current date.
5. Actual hours can be entered directly on tasks or gathered through related operational records, allowing planned-versus-actual progress views.
6. Project detail connects delivery effort to timesheets, expenses, income, team members, client, and contract.

### HRM & Workforce

### Business purpose

HRM maintains employee master data, employment status, attendance, leave requests, staff contracts, and workforce reporting. It provides the people and attendance inputs used by payroll and operational management.

### Key interface views

#### Staff

- Staff list with search, status, position, and organizational information.
- Staff summary cards and staff detail modal.
- Staff drawer for personal, employment, guarantor, and education information.
- Attendance history and related employment/contract context.

#### Attendance / Timesheets

- Date-based attendance view with staff records and summary indicators.
- Attendance drawer for Present, Absent, or Leave.
- Present status exposes check-in and check-out times; absent or leave clears those time inputs.
- Notes support attendance context, including approved leave references.
- Printing supports attendance documentation.

#### Leave management

- Leave list with employee, leave type, date range, calculated days, reason, and status.
- Filters and summary cards for pending, approved, rejected, or used leave information.
- Leave drawer for submission or editing and approval/rejection status actions.

#### HR reports and staff contracts

- HR reports consolidate workforce, attendance, leave, and payroll-related indicators with print support.
- Staff contracts use the shared contract interface with HR-specific fields and lifecycle.

### Core forms and business inputs

| Form           | Key fields                                                                                                                                                                         | Business meaning and calculation                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff          | First/last name, father name, email, phone, address, national ID, position, salary, salary currency, join date, contract period, system user, status, guarantor details, education | Creates the employee master record used by HR, task assignment, attendance, payroll, and ownership fields. First/last name, phone, email, position, salary, salary currency, join date, and status are required or defaulted. Salary must be greater than zero. |
| Attendance     | Date, staff, status, check-in, check-out, notes                                                                                                                                    | Records daily presence. Date, staff, status, and valid times are checked; times are mainly required for Present records.                                                                                                                                        |
| Leave request  | Staff, leave type, start date, end date, reason, initial status                                                                                                                    | Records time away from work. The interface calculates leave days and blocks invalid or zero-day ranges. Managers can submit with Pending or Approved initial status where permitted.                                                                            |
| Staff contract | Staff, HR contract type/template, position title, base salary, currency, start/end dates, status                                                                                   | Defines formal employment terms and links HR administration to the shared contract lifecycle.                                                                                                                                                                   |

### HR workflow

- Staff status controls whether an employee is available for assignments, payroll generation, or operational selection.
- Leave dates are validated and the interface calculates total leave days before submission.
- Approved leave can be reflected in attendance records as Leave.
- Attendance records provide worked, absent, and leave counts for monthly payroll generation.

### Payroll

### Business purpose

Payroll calculates monthly employee pay from salary, calendar days, attendance, bonuses, and loan deductions, then records payment and loan repayment effects.

### Key interface views

- Month selector and employee search.
- Status filter for Draft or Paid payroll records.
- Summary cards for total payroll, paid amount, pending amount, and loan deductions.
- Generate monthly payroll action.
- Salary adjustment drawer with live calculation preview.
- Payslip modal and printable payslip.
- Pay confirmation dialog and deletion protection for paid salaries.

### Core forms and business inputs

| Form              | Key fields                                                                               | Business meaning and calculation                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate payroll  | Payroll month                                                                            | Creates one draft payroll record per eligible active employee who does not already have a record for that month. It reads attendance and active loan balances.                                                                            |
| Salary adjustment | Worked days, off days, bonus, loan deduction, currency, exchange rate, timesheet summary | Recalculates earned salary and payable salary. Daily rate is base salary divided by month days; earned salary is daily rate multiplied by worked days; payable salary is earned salary plus bonus minus loan deduction, never below zero. |
| Mark salary paid  | Confirmation only                                                                        | Changes the payroll record to Paid, records payment date and processor, and applies the scheduled deduction against active loans.                                                                                                         |

### Payroll workflow

1. Generate payroll for a selected month.
2. Active staff without an existing record are included.
3. Attendance determines worked, absent, leave, and off-day counts.
4. Active staff loans create scheduled deductions, limited so deductions do not exceed earned gross pay.
5. Payroll remains Draft while adjustments are possible.
6. Marking it Paid locks the record and applies deductions to the relevant loans.
7. Payroll base amounts feed finance dashboards and finance reports.

### Finance

### Business purpose

Finance records money received, money spent, employee pay, loans, and financial reporting data. It provides the financial control layer for receivables, expenses, cash movement, payroll cost, and management profitability.

### Key interface views

#### Income

- Income table with search and filters for client, project, income type, and payment status.
- Summary cards for total income, collected amount, pending receivables, and overdue receivables.
- Income form drawer, detail modal, and print view.
- Payment status is derived from total amount and paid amount: Pending, Partial, or Paid.

#### Expenses

- Expense table with search and filters for expense type, project, and staff member.
- Summary cards for total expenses, project expenses, overhead, and current-month expenses.
- Expense form drawer, detail modal, receipt upload, and print view.

#### Loans

- Loan table with status and type context, remaining balance, monthly deduction, and repayment actions.
- Loan summary cards and detail modal.
- Loan form drawer for staff, external, or bank loans.
- Repayment dialog for manual repayments.

#### Reports and dashboard

- Finance reports for income, expenses, loans, inventory, and salary.
- Date presets, custom dates, category filters, display-currency selection, and reporting exchange rate.
- Table pagination, charts, print, PDF export, and CSV export.
- Executive dashboard combines income, expenses, salaries, pipeline, contracts, projects, tasks, workforce, loans, receivables, and low-stock alerts according to user capability.

### Core forms and business inputs

| Form             | Key fields                                                                                                                                          | Business meaning and calculation                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Income           | Name, client, project, contract, invoice, income type, total amount, paid amount, currency, exchange rate, receiver, payment details, reminder date | Records revenue or receivables and can be linked to customer delivery records. Remaining balance equals total minus paid amount; status is derived from payment progress. Client relationships must remain consistent across linked project, contract, and invoice. |
| Expense          | Details, expense type, project, employee who spent, payment method, expense date, quantity, unit price, currency, exchange rate, receipt            | Records operational or project cost. Subtotal equals quantity multiplied by unit price; project linkage separates project cost from overhead. Base-currency and USD views are calculated for reporting.                                                             |
| Loan             | Loan type, staff or external entity, total amount, monthly deduction, currency, exchange rate, issue date, reason                                   | Records a repayment obligation. Staff loans connect to payroll deductions; external and bank loans use an entity name.                                                                                                                                              |
| Manual repayment | Repayment amount and source                                                                                                                         | Reduces remaining loan balance and can close the loan when the balance reaches zero.                                                                                                                                                                                |

### Finance workflow and calculations

- All monetary modules support AFN and USD and retain a base-currency equivalent using an exchange rate.
- Income status is calculated from total and paid amounts; outstanding and overdue values are derived from remaining balance and reminder date.
- Expenses calculate quantity times unit price and classify the result as project-linked or overhead.
- Invoice payment creates a paid finance income entry, so it is reflected in collected revenue and cannot be recorded twice.
- Salary payment contributes payroll cost to financial dashboards and can reduce active loan balances.
- The executive dashboard calculates net profit as total income minus expenses minus payroll.

### Inventory

### Business purpose

Inventory controls item identity, categories, stock quantity, reorder thresholds, valuation, and stock movement. It helps managers prevent stock-outs and identify items that require replenishment.

### Key interface views

- Inventory table with search and filters for category, status, and stock state.
- Summary cards for total items, total inventory value, low-stock items, and out-of-stock items.
- Item form drawer, stock adjustment dialog, and delete confirmation.
- Low-stock items appear in dashboard urgent-action areas where the user has inventory visibility.

### Core forms and business inputs

| Form               | Key fields                                                                                         | Business meaning and calculation                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory item     | Name, SKU, category, quantity in stock, reorder level, unit price, status, currency, exchange rate | Defines the item and its replenishment policy. Name, category, quantity, reorder level, unit price, status, currency, and exchange rate are validated. SKU is optional but must follow the accepted format when supplied. |
| Stock adjustment   | Direction In/Out and quantity                                                                      | Adds or removes stock. Stock cannot go below zero. The system automatically recalculates the stock state/status from quantity and reorder level.                                                                          |
| Inventory category | Name, description, active state                                                                    | Maintains the categories used for stock classification and filtering.                                                                                                                                                     |

### Inventory workflow

- New items can receive a generated SKU when no SKU is entered.
- Stock-in and stock-out adjustments are audited.
- An outbound adjustment is rejected when available stock is insufficient.
- Quantity and reorder level determine whether an item is in stock, low stock, or out of stock.
- Inventory valuation and stock alerts feed inventory summaries and management reporting.

### System Setup, Options & Audit

### Business purpose

Setup controls the organization-wide rules that affect calculations, documents, attendance defaults, branding, and user experience. Options administration controls configurable statuses, categories, types, priorities, sources, payment methods, and other lookup values.

### Key interface views

- Setup tabs for general company information, localization, branding, signatories, and theme.
- Options pages for CRM, contracts, HRM, finance, inventory, and other configuration categories.
- Roles and permissions pages with module-by-module permission selection.
- Audit log list for reviewing user actions and operational history.

### Core setup inputs

| Area                  | Key inputs                                                               | Business effect                                                                                                |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Company               | Company name, application name, email, phone, tax ID, address            | Appears in operational context and printed documents.                                                          |
| Localization          | Base currency, USD/AFN exchange rate, default work start/end             | Drives currency conversions, payroll, finance summaries, and attendance defaults.                              |
| Branding              | Company logo, light/dark logos, favicon, signatory stamp                 | Controls printed contracts, reports, and application identity.                                                 |
| Signatories           | Signatory name and title                                                 | Identifies authorized signers on formal documents.                                                             |
| Configurable options  | Label/name, description, active state, ordering/defaults where supported | Controls selectable statuses, types, sources, priorities, leave types, payment methods, and report categories. |
| Roles and permissions | Role name/status and selected module permissions                         | Determines who can view, create, update, delete, approve, or manage each area.                                 |

## 3. Cross-Module Automation & Data Flow

### Customer and revenue flow

- **Visitor converted to lead:** Visitor contact information, purpose, notes, host, Walk-in source, New status, and a conversion activity are copied into a new lead.
- **Lead converted to client:** Lead company/contact information and assigned representative become an Active client; the lead becomes Won and receives a conversion activity.
- **Client to contract:** Contracts select active clients and can optionally retain the originating lead for traceability.
- **Contract to project:** Projects require a client and may be linked to a matching contract.
- **Contract to invoice:** Invoice creation requires a contract and matching client; contract amount, currency, and exchange rate can prefill the invoice.
- **Invoice paid to income:** Full invoice payment creates a paid finance income record, links it to the invoice/client/contract, and marks the invoice Paid.
- **Client profile consolidation:** Client details expose related lead origin, projects, contracts, invoices, paid revenue, pending invoices, and activities.

### Delivery and operational flow

- **Project to tasks:** Tasks must belong to a project; project selection controls task context and visibility.
- **Task to progress:** Task status, due date, estimated hours, actual hours, and completion timing drive task progress and overdue indicators.
- **Project to financial operations:** Project detail connects timesheets, expenses, income, budget, and actual effort for delivery review.
- **Project and task dashboard:** Active projects, pending tasks, completed-task ratio, logged hours, estimated hours, and due dates feed operational dashboard cards.

### Workforce and payroll flow

- **Staff to assignment:** Active or non-terminated staff can be selected as project managers, task assignees, account managers, hosts, receivers, and spenders according to permissions.
- **Leave to attendance:** Approved leave can be represented as Leave attendance and is included in workforce and payroll calculations.
- **Attendance to payroll:** Monthly payroll reads Present, Absent, Leave, and hours-worked records to calculate worked days and payroll notes.
- **Loan to payroll:** Active staff loans create scheduled monthly deductions, converted as needed between currencies and capped at earned gross pay.
- **Payroll paid to loans:** Marking salary Paid applies the deduction to loan balances, updates repayment progress, and can close a fully repaid loan.
- **Payroll to finance:** Salary amounts and payment status are included in finance totals, net-profit calculations, dashboards, and payroll reports.

### Finance and reporting flow

- **Income and expenses to dashboard:** Base-currency income, expenses, and payroll populate cash-flow trends, distributions, net profit, and growth indicators.
- **Receivables to urgent actions:** Unpaid or partially paid income with remaining balances and reminder dates appears in outstanding-receivable areas.
- **Contracts to urgent actions:** Contracts approaching their end date appear in contract-expiry monitoring and dashboard alerts.
- **Inventory to urgent actions:** Items at or below reorder level appear as low-stock alerts for users with inventory access.
- **Audit trail:** Creates, updates, deletes, status changes, payments, payroll actions, repayments, stock adjustments, and conversions are recorded for accountability.

### Important automation boundaries

- Winning a lead does not automatically create a contract, project, invoice, or finance record.
- Creating a contract does not automatically create a project or invoice.
- Creating an invoice does not automatically record income; income is created when payment is recorded, or separately through the Finance income workflow.
- Creating a project does not automatically create tasks, staff assignments, expenses, or invoices.
- Inventory changes do not automatically create a purchase order or supplier transaction.
- Payroll generation creates Draft payroll; a user must review, adjust if needed, and mark it Paid.

## 4. Role-Based Capabilities

The application uses permission-based access rather than relying only on job-title labels. The exact capability of a named role depends on the permissions assigned to that role, while super administrators bypass normal permission checks.

| Role or user type                      | Typical access and decisions                                                                                                                                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Super administrator / administrator    | Broad visibility and control across CRM, contracts, projects, tasks, HRM, payroll, finance, inventory, setup, roles, permissions, and audit logs. Can configure options, manage users/roles, and perform sensitive create/update/delete actions.                                                     |
| Sales or CRM manager                   | View and manage visitors, leads, clients, sources, statuses, assignments, activities, conversion, and customer relationship history when CRM read/write permissions are assigned. Can monitor pipeline value, follow-ups, and conversion. Contract and invoice access requires separate permissions. |
| Account manager / sales representative | Maintain assigned customer relationships, leads, activities, follow-ups, and client records according to assigned CRM permissions. Can be selected as lead owner or account manager. Conversion and deletion require write/delete permission.                                                        |
| Project manager                        | View and manage projects when project permissions are granted; assign project members, monitor budget/schedule, update statuses, and manage delivery tasks. Project-manager role users may have broader project/task visibility than ordinary staff.                                                 |
| Task staff / operational staff         | See tasks they created or were assigned when operating under assigned scope. Can update permitted task statuses, log hours, and contribute work records. Global task visibility and task creation require the relevant permissions.                                                                  |
| HR manager                             | Manage staff, staff contracts, leave, attendance, payroll, and loan-related workflows when the relevant HRM/payroll/finance permissions are assigned. Makes workforce, leave, payroll, and employee-loan decisions.                                                                                  |
| HR or attendance staff                 | Record staff information, daily attendance, leave details, and supporting notes within assigned permissions. Approval or payroll authority is not implied by attendance access.                                                                                                                      |
| Finance manager / finance staff        | Manage income, expenses, invoices, payments, loans, payroll finance effects, inventory finance data, reports, and currency-based calculations according to finance permissions. Payment and deletion actions are protected by record state.                                                          |
| Inventory manager / stock staff        | View inventory, create or edit items, adjust stock, monitor reorder levels, and manage categories when inventory permissions are assigned. Stock-out adjustments are rejected when they exceed available quantity.                                                                                   |
| Read-only manager or auditor           | View permitted tables, details, summaries, reports, relationships, and audit history without create/edit/delete capability. Approval, payment, conversion, and status changes require explicit write permissions.                                                                                    |

### Permission principles

- Read access exposes the relevant list, detail, summaries, filters, and reports.
- Write access enables creation, editing, status changes, activities, conversions, payment actions, payroll generation, and stock adjustments where supported.
- Delete access is separate and is blocked for records that are already referenced or financially settled.
- Task visibility can be global or limited to created/assigned work depending on the user’s permissions.
- Active staff, active lookup options, matching clients/contracts, and valid relationships are checked before records are saved.
- Audit entries provide accountability for sensitive business actions.
