ALTER TABLE `FinanceIncome`
  ADD COLUMN `invoice_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `FinanceIncome_invoice_id_key` ON `FinanceIncome`(`invoice_id`);

ALTER TABLE `FinanceIncome`
  ADD CONSTRAINT `FinanceIncome_invoice_id_fkey`
  FOREIGN KEY (`invoice_id`) REFERENCES `ContractInvoice`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
