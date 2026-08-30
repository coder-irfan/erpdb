ALTER TABLE `financesalary`
    MODIFY `payment_date` DATETIME(3) NULL;

ALTER TABLE `financeexpense`
    ADD COLUMN `payroll_salary_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `FinanceExpense_payroll_salary_id_key`
    ON `financeexpense`(`payroll_salary_id`);

ALTER TABLE `financeexpense`
    ADD CONSTRAINT `FinanceExpense_payroll_salary_id_fkey`
    FOREIGN KEY (`payroll_salary_id`) REFERENCES `financesalary`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
