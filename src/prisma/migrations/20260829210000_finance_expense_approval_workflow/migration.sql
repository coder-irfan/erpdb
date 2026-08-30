ALTER TABLE `financeexpense`
  ADD COLUMN `voucher_number` VARCHAR(191) NULL,
  ADD COLUMN `vendor_payee` VARCHAR(191) NOT NULL DEFAULT 'Legacy Payee',
  ADD COLUMN `approval_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN `approved_by_id` VARCHAR(191) NULL,
  ADD COLUMN `processed_by_id` VARCHAR(191) NULL,
  ADD COLUMN `approved_at` DATETIME(3) NULL,
  ADD COLUMN `paid_at` DATETIME(3) NULL,
  ADD COLUMN `rejection_reason` TEXT NULL;

UPDATE `financeexpense`
SET
  `voucher_number` = CONCAT('EXP-', YEAR(`expense_date`), '-', UPPER(RIGHT(`id`, 8))),
  `approval_status` = 'PAID',
  `approved_at` = `created_at`,
  `paid_at` = `expense_date`;

CREATE UNIQUE INDEX `FinanceExpense_voucher_number_key` ON `financeexpense`(`voucher_number`);
CREATE INDEX `FinanceExpense_approval_status_idx` ON `financeexpense`(`approval_status`);
CREATE INDEX `FinanceExpense_approved_by_id_fkey` ON `financeexpense`(`approved_by_id`);
CREATE INDEX `FinanceExpense_processed_by_id_fkey` ON `financeexpense`(`processed_by_id`);

ALTER TABLE `financeexpense`
  ADD CONSTRAINT `FinanceExpense_approved_by_id_fkey`
    FOREIGN KEY (`approved_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `FinanceExpense_processed_by_id_fkey`
    FOREIGN KEY (`processed_by_id`) REFERENCES `hrmstaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `generalledgerentry` (
  `id` VARCHAR(191) NOT NULL,
  `expense_id` VARCHAR(191) NOT NULL,
  `account_code` VARCHAR(191) NOT NULL,
  `entry_type` VARCHAR(191) NOT NULL DEFAULT 'DEBIT',
  `transaction_amount` DECIMAL(12, 2) NOT NULL,
  `transaction_currency` VARCHAR(191) NOT NULL,
  `exchange_rate` DECIMAL(12, 4) NOT NULL,
  `debit_base` DECIMAL(14, 2) NOT NULL,
  `credit_base` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `entry_date` DATE NOT NULL,
  `description` TEXT NOT NULL,
  `posted_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `GeneralLedgerEntry_expense_id_key` ON `generalledgerentry`(`expense_id`);
CREATE INDEX `GeneralLedgerEntry_account_code_entry_date_idx` ON `generalledgerentry`(`account_code`, `entry_date`);
CREATE INDEX `GeneralLedgerEntry_posted_by_user_id_fkey` ON `generalledgerentry`(`posted_by_user_id`);

ALTER TABLE `generalledgerentry`
  ADD CONSTRAINT `GeneralLedgerEntry_expense_id_fkey`
    FOREIGN KEY (`expense_id`) REFERENCES `financeexpense`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `GeneralLedgerEntry_posted_by_user_id_fkey`
    FOREIGN KEY (`posted_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `generalledgerentry` (
  `id`, `expense_id`, `account_code`, `entry_type`, `transaction_amount`,
  `transaction_currency`, `exchange_rate`, `debit_base`, `credit_base`,
  `entry_date`, `description`, `created_at`
)
SELECT
  CONCAT('gle-', `id`), `id`,
  IF(`project_id` IS NULL, 'EXPENSE-OVERHEAD', 'EXPENSE-PROJECT'),
  'DEBIT', `sub_total`, `currency`, `exchange_rate`, `amount_base`, 0.00,
  `expense_date`, CONCAT('Migrated expense: ', LEFT(`details`, 180)), `created_at`
FROM `financeexpense`;

INSERT IGNORE INTO `permission` (`id`, `key`, `module`, `description`, `created_at`)
VALUES
  ('perm-finance-expense-approve', 'finance_expense:approve', 'Finance', 'Approve or reject expense requests', CURRENT_TIMESTAMP(3)),
  ('perm-finance-expense-pay', 'finance_expense:pay', 'Finance', 'Execute approved expense disbursements', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO `rolepermission` (`id`, `role_id`, `permission_id`, `granted_at`)
SELECT CONCAT('rp-exp-', LEFT(`role`.`id`, 12), '-', RIGHT(`permission`.`id`, 8)), `role`.`id`, `permission`.`id`, CURRENT_TIMESTAMP(3)
FROM `role` CROSS JOIN `permission`
WHERE `role`.`name` IN ('super_admin', 'finance_manager')
  AND `permission`.`key` IN ('finance_expense:approve', 'finance_expense:pay');

INSERT IGNORE INTO `rolepermission` (`id`, `role_id`, `permission_id`, `granted_at`)
SELECT CONCAT('rp-exp-', LEFT(`role`.`id`, 12), '-', RIGHT(`permission`.`id`, 8)), `role`.`id`, `permission`.`id`, CURRENT_TIMESTAMP(3)
FROM `role` CROSS JOIN `permission`
WHERE `role`.`name` = 'project_manager'
  AND `permission`.`key` IN ('finance:read', 'finance_expense:read', 'finance_expense:approve');
