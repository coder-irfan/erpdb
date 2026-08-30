-- Persist the precise posting-time FX quote separately from contract terms.
ALTER TABLE `FinanceExpense` ADD COLUMN `fx_snapshot_at` DATETIME(3) NULL;
ALTER TABLE `FinanceIncome` ADD COLUMN `fx_snapshot_at` DATETIME(3) NULL;
ALTER TABLE `FinanceLoan` ADD COLUMN `fx_snapshot_at` DATETIME(3) NULL;
ALTER TABLE `FinanceSalary` ADD COLUMN `fx_snapshot_at` DATETIME(3) NULL;
ALTER TABLE `LoanRepayment` ADD COLUMN `fx_snapshot_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
