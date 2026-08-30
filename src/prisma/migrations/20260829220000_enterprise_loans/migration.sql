ALTER TABLE `financeloan`
  ADD COLUMN `lender_type` VARCHAR(191) NULL,
  ADD COLUMN `repayment_start_date` DATE NULL,
  ADD COLUMN `auto_deduct` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `annual_interest_rate` DECIMAL(7,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN `tenure_months` INTEGER NULL,
  ADD COLUMN `disbursement_bank_account` VARCHAR(191) NULL;

CREATE TABLE `loanrepaymentschedule` (
  `id` VARCHAR(191) NOT NULL,
  `loan_id` VARCHAR(191) NOT NULL,
  `installment_number` INTEGER NOT NULL,
  `due_date` DATE NOT NULL,
  `opening_principal` DECIMAL(14,2) NOT NULL,
  `principal_amount` DECIMAL(14,2) NOT NULL,
  `interest_amount` DECIMAL(14,2) NOT NULL,
  `payment_amount` DECIMAL(14,2) NOT NULL,
  `remaining_principal` DECIMAL(14,2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',
  `paid_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `LoanRepaymentSchedule_loan_id_installment_key`(`loan_id`, `installment_number`),
  INDEX `LoanRepaymentSchedule_due_date_status_idx`(`due_date`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `LoanRepaymentSchedule_loan_id_fkey` FOREIGN KEY (`loan_id`) REFERENCES `financeloan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE `financeloan`
SET `repayment_start_date` = `issue_date`, `auto_deduct` = (`loan_type` = 'STAFF')
WHERE `repayment_start_date` IS NULL;

UPDATE `financeloan`
SET `lender_type` = CASE WHEN `loan_type` = 'BANK' THEN 'BANK' ELSE 'EXTERNAL_BUSINESS' END,
    `loan_type` = 'CORPORATE',
    `auto_deduct` = false
WHERE `loan_type` IN ('BANK', 'EXTERNAL');
