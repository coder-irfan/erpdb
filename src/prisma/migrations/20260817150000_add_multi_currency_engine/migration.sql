ALTER TABLE `Setup`
  ADD COLUMN `usd_afn_exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65;

ALTER TABLE `HrmStaff`
  ADD COLUMN `salary_currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `salary_exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `HrmStaff` SET `amount_base` = `salary`;

ALTER TABLE `HrmStaffContract`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `HrmStaffContract` SET `amount_base` = `base_salary`;

ALTER TABLE `HrmPayroll`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `HrmPayroll` SET `amount_base` = `net_salary`;

ALTER TABLE `CrmLead`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `CrmLead` SET `amount_base` = COALESCE(`estimated_value`, 0);

ALTER TABLE `Project`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `Project` SET `amount_base` = `budget`;

UPDATE `Contract` SET `exchange_rate` = 65 WHERE `exchange_rate` IS NULL;
ALTER TABLE `Contract`
  MODIFY COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `Contract`
SET `amount_base` = CASE WHEN `currency` = 'USD' THEN `total_amount` * `exchange_rate` ELSE `total_amount` END;

ALTER TABLE `ContractInvoice`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `ContractInvoice` SET `amount_base` = `amount`;

UPDATE `FinanceIncome` SET `exchange_rate` = 65 WHERE `exchange_rate` IS NULL;
ALTER TABLE `FinanceIncome`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  MODIFY COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `FinanceIncome` SET `amount_base` = `total_amount`;

UPDATE `FinanceExpense` SET `exchange_rate` = 65 WHERE `exchange_rate` IS NULL;
ALTER TABLE `FinanceExpense`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  MODIFY COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `FinanceExpense` SET `amount_base` = `sub_total`;

UPDATE `FinanceSalary` SET `exchange_rate` = 65 WHERE `exchange_rate` IS NULL;
ALTER TABLE `FinanceSalary`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  MODIFY COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `FinanceSalary` SET `amount_base` = `payable_amount`;

ALTER TABLE `FinanceLoan`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `FinanceLoan` SET `amount_base` = `total_amount`;

ALTER TABLE `Inventory`
  ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'AFN',
  ADD COLUMN `exchange_rate` DECIMAL(12, 4) NOT NULL DEFAULT 65,
  ADD COLUMN `amount_base` DECIMAL(14, 2) NOT NULL DEFAULT 0;
UPDATE `Inventory` SET `amount_base` = `unit_price`;
