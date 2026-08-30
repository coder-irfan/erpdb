ALTER TABLE `option`
  ADD COLUMN `allowed_days_per_year` DECIMAL(5, 1) NOT NULL DEFAULT 18.0;

UPDATE `option`
SET `allowed_days_per_year` = 365.0
WHERE `category` = 'LEAVE_TYPE' AND (`value` = 'UNPAID' OR `is_paid_leave` = FALSE);

ALTER TABLE `financesalary`
  ADD COLUMN `unpaid_leave_deduction` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
