-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_fkey`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditlog` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `details` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_module_created_at_idx`(`module`, `created_at`),
    INDEX `AuditLog_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NULL,
    `contract_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `contract_duration` VARCHAR(191) NULL,
    `contract_type_id` VARCHAR(191) NOT NULL,
    `country_id` VARCHAR(191) NULL,
    `percentage` DECIMAL(5, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `level_id` VARCHAR(191) NULL,
    `signed_date` DATETIME(3) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `auto_renew` BOOLEAN NOT NULL DEFAULT false,
    `renewal_status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `document_url` TEXT NULL,
    `account_manager_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

    UNIQUE INDEX `Contract_contract_number_key`(`contract_number`),
    INDEX `Contract_account_manager_id_fkey`(`account_manager_id`),
    INDEX `Contract_client_id_status_id_idx`(`client_id`, `status_id`),
    INDEX `Contract_contract_type_id_fkey`(`contract_type_id`),
    INDEX `Contract_country_id_fkey`(`country_id`),
    INDEX `Contract_lead_id_fkey`(`lead_id`),
    INDEX `Contract_level_id_fkey`(`level_id`),
    INDEX `Contract_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contractinvoice` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `issued_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `remaining_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `ContractInvoice_invoice_number_key`(`invoice_number`),
    INDEX `ContractInvoice_client_id_fkey`(`client_id`),
    INDEX `ContractInvoice_contract_id_status_id_idx`(`contract_id`, `status_id`),
    INDEX `ContractInvoice_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contractnotification` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NOT NULL,
    `reminder_type` VARCHAR(191) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipient_email` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',

    INDEX `ContractNotification_contract_id_reminder_type_idx`(`contract_id`, `reminder_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crmactivity` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `activity_type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `activity_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_date` DATETIME(3) NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `CrmActivity_client_id_activity_date_idx`(`client_id`, `activity_date`),
    INDEX `CrmActivity_lead_id_activity_date_idx`(`lead_id`, `activity_date`),
    INDEX `CrmActivity_staff_id_idx`(`staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crmclient` (
    `id` VARCHAR(191) NOT NULL,
    `lead_id` VARCHAR(191) NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `primary_contact_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `tax_id` VARCHAR(191) NULL,
    `account_manager_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `CrmClient_lead_id_key`(`lead_id`),
    UNIQUE INDEX `CrmClient_email_key`(`email`),
    INDEX `CrmClient_account_manager_id_fkey`(`account_manager_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crmlead` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NULL,
    `contact_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `source_id` VARCHAR(191) NOT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `assigned_to_id` VARCHAR(191) NULL,
    `estimated_value` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `next_follow_up_date` DATETIME(3) NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    INDEX `CrmLead_assigned_to_id_fkey`(`assigned_to_id`),
    INDEX `CrmLead_source_id_fkey`(`source_id`),
    INDEX `CrmLead_status_id_created_at_idx`(`status_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crmvisitor` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `visited_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `check_out_time` DATETIME(3) NULL,
    `host_staff_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CHECKED_IN',
    `converted_lead_id` VARCHAR(191) NULL,

    UNIQUE INDEX `CrmVisitor_converted_lead_id_key`(`converted_lead_id`),
    INDEX `CrmVisitor_host_staff_id_idx`(`host_staff_id`),
    INDEX `CrmVisitor_status_visited_at_idx`(`status`, `visited_at`),
    INDEX `CrmVisitor_visited_at_idx`(`visited_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financeexpense` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NULL,
    `spent_by_id` VARCHAR(191) NULL,
    `payment_method_id` VARCHAR(191) NULL,
    `receipt_url` TEXT NULL,
    `expense_date` DATE NOT NULL,
    `details` TEXT NOT NULL,
    `expense_type_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `sub_total` DECIMAL(12, 2) NOT NULL,
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',

    INDEX `FinanceExpense_created_at_idx`(`created_at`),
    INDEX `FinanceExpense_expense_type_id_fkey`(`expense_type_id`),
    INDEX `FinanceExpense_payment_method_id_fkey`(`payment_method_id`),
    INDEX `FinanceExpense_project_id_fkey`(`project_id`),
    INDEX `FinanceExpense_spent_by_id_fkey`(`spent_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financeincome` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NULL,
    `contract_id` VARCHAR(191) NULL,
    `project_id` VARCHAR(191) NULL,
    `received_by_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `name` VARCHAR(191) NOT NULL,
    `pay_details` TEXT NULL,
    `income_type_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `remind_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `remind_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',

    INDEX `FinanceIncome_client_id_fkey`(`client_id`),
    INDEX `FinanceIncome_contract_id_fkey`(`contract_id`),
    INDEX `FinanceIncome_created_at_idx`(`created_at`),
    INDEX `FinanceIncome_income_type_id_fkey`(`income_type_id`),
    INDEX `FinanceIncome_invoice_id_fkey`(`invoice_id`),
    INDEX `FinanceIncome_project_id_fkey`(`project_id`),
    INDEX `FinanceIncome_received_by_id_fkey`(`received_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financeloan` (
    `id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NULL,
    `loan_type` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `entity_name` VARCHAR(191) NULL,
    `loan_number` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `monthly_deduction` DECIMAL(12, 2) NOT NULL,
    `repaid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `remaining_balance` DECIMAL(12, 2) NOT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `issue_date` DATE NOT NULL,
    `reason` TEXT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `FinanceLoan_loan_number_key`(`loan_number`),
    INDEX `FinanceLoan_approved_by_id_fkey`(`approved_by_id`),
    INDEX `FinanceLoan_staff_id_fkey`(`staff_id`),
    INDEX `FinanceLoan_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loanrepayment` (
    `id` VARCHAR(191) NOT NULL,
    `loan_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `repayment_date` DATE NOT NULL,
    `payment_method_id` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `reference_id` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL,
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoanRepayment_loan_id_repayment_date_idx`(`loan_id`, `repayment_date`),
    INDEX `LoanRepayment_payment_method_id_fkey`(`payment_method_id`),
    INDEX `LoanRepayment_created_by_user_id_fkey`(`created_by_user_id`),
    UNIQUE INDEX `LoanRepayment_loan_id_source_reference_id_key`(`loan_id`, `source`, `reference_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financesalary` (
    `id` VARCHAR(191) NOT NULL,
    `timesheet_summary` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `staff_id` VARCHAR(191) NOT NULL,
    `timesheet_month` VARCHAR(191) NOT NULL,
    `total_month_days` INTEGER NOT NULL,
    `worked_days` DECIMAL(5, 1) NOT NULL,
    `off_days` DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
    `base_salary` DECIMAL(12, 2) NOT NULL,
    `base_daily_rate` DECIMAL(12, 2) NOT NULL,
    `earned_salary` DECIMAL(12, 2) NOT NULL,
    `bonus_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `loan_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `payable_amount` DECIMAL(12, 2) NOT NULL,
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `loan_status` VARCHAR(191) NULL DEFAULT 'PENDING',
    `payment_date` DATE NULL,
    `processed_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',

    INDEX `FinanceSalary_processed_by_id_fkey`(`processed_by_id`),
    UNIQUE INDEX `FinanceSalary_staff_id_timesheet_month_key`(`staff_id`, `timesheet_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hrmstaff` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `father_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `educations` TEXT NULL,
    `tazkira_no` VARCHAR(191) NULL,
    `position` VARCHAR(191) NOT NULL,
    `salary` DECIMAL(12, 2) NOT NULL,
    `guarantor_name` VARCHAR(191) NULL,
    `guarantor_phone` VARCHAR(191) NULL,
    `guarantor_license` VARCHAR(191) NULL,
    `join_date` DATETIME(3) NOT NULL,
    `termination_date` DATE NULL,
    `contract_period` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `salary_currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `salary_exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `HrmStaff_email_key`(`email`),
    UNIQUE INDEX `HrmStaff_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hrmstaffcontract` (
    `id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `contract_number` VARCHAR(191) NOT NULL,
    `contract_type_id` VARCHAR(191) NOT NULL,
    `position_title` VARCHAR(191) NOT NULL,
    `base_salary` DECIMAL(12, 2) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `document_url` TEXT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `content_html` TEXT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `HrmStaffContract_contract_number_key`(`contract_number`),
    INDEX `HrmStaffContract_contract_type_id_status_id_idx`(`contract_type_id`, `status_id`),
    INDEX `HrmStaffContract_staff_id_status_id_idx`(`staff_id`, `status_id`),
    INDEX `HrmStaffContract_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hrmstaffleave` (
    `id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `leave_type_id` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `total_days` DECIMAL(4, 1) NOT NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT true,
    `reason` TEXT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `approved_by_user_id` VARCHAR(191) NULL,

    INDEX `HrmStaffLeave_approved_by_id_fkey`(`approved_by_id`),
    INDEX `HrmStaffLeave_approved_by_user_id_idx`(`approved_by_user_id`),
    INDEX `HrmStaffLeave_leave_type_id_start_date_idx`(`leave_type_id`, `start_date`),
    INDEX `HrmStaffLeave_staff_id_start_date_idx`(`staff_id`, `start_date`),
    INDEX `HrmStaffLeave_status_id_start_date_end_date_idx`(`status_id`, `start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hrmstafftimesheet` (
    `id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NULL,
    `leave_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `check_in_time` DATETIME(3) NULL,
    `check_out_time` DATETIME(3) NULL,
    `hours_worked` DECIMAL(5, 2) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `HrmStaffTimesheet_date_status_idx`(`date`, `status`),
    INDEX `HrmStaffTimesheet_project_id_fkey`(`project_id`),
    INDEX `HrmStaffTimesheet_leave_id_fkey`(`leave_id`),
    INDEX `HrmStaffTimesheet_staff_id_date_idx`(`staff_id`, `date`),
    UNIQUE INDEX `HrmStaffTimesheet_staff_id_date_key`(`staff_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hrmleaveattendancebackup` (
    `id` VARCHAR(191) NOT NULL,
    `leave_id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `record_existed` BOOLEAN NOT NULL DEFAULT false,
    `original_status` VARCHAR(191) NULL,
    `original_project_id` VARCHAR(191) NULL,
    `original_check_in_time` DATETIME(3) NULL,
    `original_check_out_time` DATETIME(3) NULL,
    `original_hours_worked` DECIMAL(5, 2) NULL,
    `original_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HrmLeaveAttendanceBackup_staff_id_date_idx`(`staff_id`, `date`),
    UNIQUE INDEX `HrmLeaveAttendanceBackup_leave_id_date_key`(`leave_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companyholiday` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyHoliday_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `sku_code` VARCHAR(191) NOT NULL,
    `quantity_in_stock` INTEGER NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `reorder_level` INTEGER NOT NULL DEFAULT 5,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `Inventory_sku_code_key`(`sku_code`),
    INDEX `Inventory_category_id_status_id_idx`(`category_id`, `status_id`),
    INDEX `Inventory_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventorymovement` (
    `id` VARCHAR(191) NOT NULL,
    `inventory_id` VARCHAR(191) NOT NULL,
    `movement_type` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `quantity_before` INTEGER NOT NULL,
    `quantity_after` INTEGER NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference_id` VARCHAR(191) NULL,
    `related_inventory_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryMovement_inventory_id_occurred_at_idx`(`inventory_id`, `occurred_at`),
    INDEX `InventoryMovement_reference_id_idx`(`reference_id`),
    INDEX `InventoryMovement_related_inventory_id_idx`(`related_inventory_id`),
    INDEX `InventoryMovement_created_by_user_id_fkey`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `option` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `color_code` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_paid_leave` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `description` TEXT NULL,

    INDEX `Option_category_idx`(`category`),
    UNIQUE INDEX `Option_category_value_key`(`category`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `id` VARCHAR(191) NOT NULL,
    `contract_id` VARCHAR(191) NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `project_code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `priority_id` VARCHAR(191) NOT NULL,
    `project_area` VARCHAR(191) NULL,
    `project_sponsor` VARCHAR(191) NULL,
    `project_manager_id` VARCHAR(191) NULL,
    `estimated_hours` DECIMAL(8, 2) NULL,
    `actual_hours` DECIMAL(8, 2) NULL DEFAULT 0.00,
    `budget` DECIMAL(12, 2) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `actual_end_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `Project_project_code_key`(`project_code`),
    INDEX `Project_client_id_status_id_idx`(`client_id`, `status_id`),
    INDEX `Project_contract_id_fkey`(`contract_id`),
    INDEX `Project_priority_id_fkey`(`priority_id`),
    INDEX `Project_project_manager_id_fkey`(`project_manager_id`),
    INDEX `Project_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectmember` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectMember_staff_id_fkey`(`staff_id`),
    UNIQUE INDEX `ProjectMember_project_id_staff_id_key`(`project_id`, `staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rolepermission` (
    `id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RolePermission_permission_id_fkey`(`permission_id`),
    UNIQUE INDEX `RolePermission_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setup` (
    `id` VARCHAR(191) NOT NULL,
    `scope` ENUM('GLOBAL') NOT NULL DEFAULT 'GLOBAL',
    `app_name` VARCHAR(191) NOT NULL DEFAULT 'ERP System',
    `company_name` VARCHAR(191) NOT NULL,
    `company_logo` TEXT NULL,
    `currency_code` VARCHAR(191) NOT NULL DEFAULT 'AFN',
    `currency_symbol` VARCHAR(191) NOT NULL DEFAULT '؋',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'YYYY-MM-DD',
    `fiscal_year_start` VARCHAR(191) NOT NULL DEFAULT '01-01',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `company_address` TEXT NULL,
    `company_email` VARCHAR(191) NULL,
    `company_phone` VARCHAR(191) NULL,
    `company_tax_id` VARCHAR(191) NULL,
    `signatory_name` VARCHAR(191) NULL,
    `signatory_stamp` TEXT NULL,
    `signatory_title` VARCHAR(191) NULL,
    `default_work_end` VARCHAR(191) NOT NULL DEFAULT '17:30',
    `default_work_start` VARCHAR(191) NOT NULL DEFAULT '08:30',
    `weekend_days` VARCHAR(191) NOT NULL DEFAULT '5',
    `usd_afn_exchange_rate` DECIMAL(12, 4) NOT NULL,

    UNIQUE INDEX `Setup_scope_key`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `systemsetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `lightLogoUrl` VARCHAR(191) NULL,
    `darkLogoUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status_id` VARCHAR(191) NOT NULL,
    `priority_id` VARCHAR(191) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `estimated_hours` DECIMAL(6, 2) NULL,
    `actual_hours` DECIMAL(6, 2) NULL DEFAULT 0.00,
    `due_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Task_created_by_id_fkey`(`created_by_id`),
    INDEX `Task_priority_id_fkey`(`priority_id`),
    INDEX `Task_project_id_status_id_idx`(`project_id`, `status_id`),
    INDEX `Task_status_id_fkey`(`status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskassignee` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `staff_id` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `taskassignee_staff_id_idx`(`staff_id`),
    INDEX `taskassignee_task_id_idx`(`task_id`),
    UNIQUE INDEX `taskassignee_task_id_staff_id_key`(`task_id`, `staff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NULL,
    `account_status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_ACTIVATION') NOT NULL DEFAULT 'ACTIVE',
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `last_login_at` DATETIME(3) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificationtoken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_userroles` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_userroles_AB_unique`(`A`, `B`),
    INDEX `_userroles_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `AuditLog_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_account_manager_id_fkey` FOREIGN KEY (`account_manager_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `crmclient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_contract_type_id_fkey` FOREIGN KEY (`contract_type_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crmlead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract` ADD CONSTRAINT `Contract_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractinvoice` ADD CONSTRAINT `ContractInvoice_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `crmclient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractinvoice` ADD CONSTRAINT `ContractInvoice_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractinvoice` ADD CONSTRAINT `ContractInvoice_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contractnotification` ADD CONSTRAINT `ContractNotification_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmactivity` ADD CONSTRAINT `CrmActivity_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `crmclient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmactivity` ADD CONSTRAINT `CrmActivity_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crmlead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmactivity` ADD CONSTRAINT `CrmActivity_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmclient` ADD CONSTRAINT `CrmClient_account_manager_id_fkey` FOREIGN KEY (`account_manager_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmclient` ADD CONSTRAINT `CrmClient_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crmlead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmlead` ADD CONSTRAINT `CrmLead_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmlead` ADD CONSTRAINT `CrmLead_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmlead` ADD CONSTRAINT `CrmLead_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmvisitor` ADD CONSTRAINT `CrmVisitor_converted_lead_id_fkey` FOREIGN KEY (`converted_lead_id`) REFERENCES `crmlead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crmvisitor` ADD CONSTRAINT `CrmVisitor_host_staff_id_fkey` FOREIGN KEY (`host_staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeexpense` ADD CONSTRAINT `FinanceExpense_expense_type_id_fkey` FOREIGN KEY (`expense_type_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeexpense` ADD CONSTRAINT `FinanceExpense_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeexpense` ADD CONSTRAINT `FinanceExpense_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeexpense` ADD CONSTRAINT `FinanceExpense_spent_by_id_fkey` FOREIGN KEY (`spent_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `crmclient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_income_type_id_fkey` FOREIGN KEY (`income_type_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_received_by_id_fkey` FOREIGN KEY (`received_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeincome` ADD CONSTRAINT `FinanceIncome_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `contractinvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeloan` ADD CONSTRAINT `FinanceLoan_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeloan` ADD CONSTRAINT `FinanceLoan_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financeloan` ADD CONSTRAINT `FinanceLoan_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loanrepayment` ADD CONSTRAINT `LoanRepayment_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `financeloan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loanrepayment` ADD CONSTRAINT `LoanRepayment_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loanrepayment` ADD CONSTRAINT `LoanRepayment_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financesalary` ADD CONSTRAINT `FinanceSalary_processed_by_id_fkey` FOREIGN KEY (`processed_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financesalary` ADD CONSTRAINT `FinanceSalary_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaff` ADD CONSTRAINT `HrmStaff_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffcontract` ADD CONSTRAINT `HrmStaffContract_contract_type_id_fkey` FOREIGN KEY (`contract_type_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffcontract` ADD CONSTRAINT `HrmStaffContract_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffcontract` ADD CONSTRAINT `HrmStaffContract_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffleave` ADD CONSTRAINT `HrmStaffLeave_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffleave` ADD CONSTRAINT `HrmStaffLeave_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffleave` ADD CONSTRAINT `HrmStaffLeave_leave_type_id_fkey` FOREIGN KEY (`leave_type_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffleave` ADD CONSTRAINT `HrmStaffLeave_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstaffleave` ADD CONSTRAINT `HrmStaffLeave_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstafftimesheet` ADD CONSTRAINT `HrmStaffTimesheet_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstafftimesheet` ADD CONSTRAINT `HrmStaffTimesheet_leave_id_fkey` FOREIGN KEY (`leave_id`) REFERENCES `hrmstaffleave`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmstafftimesheet` ADD CONSTRAINT `HrmStaffTimesheet_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmleaveattendancebackup` ADD CONSTRAINT `HrmLeaveAttendanceBackup_leave_id_fkey` FOREIGN KEY (`leave_id`) REFERENCES `hrmstaffleave`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hrmleaveattendancebackup` ADD CONSTRAINT `HrmLeaveAttendanceBackup_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `Inventory_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `Inventory_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `InventoryMovement_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventorymovement` ADD CONSTRAINT `InventoryMovement_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `Project_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `crmclient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `Project_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `Project_priority_id_fkey` FOREIGN KEY (`priority_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `Project_project_manager_id_fkey` FOREIGN KEY (`project_manager_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `Project_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectmember` ADD CONSTRAINT `ProjectMember_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectmember` ADD CONSTRAINT `ProjectMember_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolepermission` ADD CONSTRAINT `RolePermission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolepermission` ADD CONSTRAINT `RolePermission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `Task_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `Task_priority_id_fkey` FOREIGN KEY (`priority_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `Task_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `Task_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskassignee` ADD CONSTRAINT `taskassignee_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskassignee` ADD CONSTRAINT `taskassignee_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `hrmstaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `User_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_userroles` ADD CONSTRAINT `_userroles_A_fkey` FOREIGN KEY (`A`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_userroles` ADD CONSTRAINT `_userroles_B_fkey` FOREIGN KEY (`B`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
