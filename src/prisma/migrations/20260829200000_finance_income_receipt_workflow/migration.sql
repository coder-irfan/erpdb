ALTER TABLE `Option`
  ADD COLUMN `requires_invoice` BOOLEAN NOT NULL DEFAULT false;

UPDATE `Option`
SET `requires_invoice` = true
WHERE `category` = 'INCOME_TYPE' AND `value` = 'CONTRACT_PAYMENT';

ALTER TABLE `FinanceIncome`
  ADD COLUMN `receipt_voucher_number` VARCHAR(191) NULL;

UPDATE `FinanceIncome`
SET `receipt_voucher_number` = CONCAT(
  'RCT-',
  YEAR(`created_at`),
  '-',
  UPPER(RIGHT(`id`, 8))
)
WHERE `receipt_voucher_number` IS NULL;

CREATE UNIQUE INDEX `FinanceIncome_receipt_voucher_number_key`
  ON `FinanceIncome`(`receipt_voucher_number`);
