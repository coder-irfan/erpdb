UPDATE `financesalary` AS salary
LEFT JOIN `financeexpense` AS payment
    ON payment.`payroll_salary_id` = salary.`id`
SET salary.`status` = CASE
    WHEN payment.`id` IS NOT NULL OR salary.`payment_date` IS NOT NULL THEN 'PAID'
    ELSE 'DRAFT'
END
WHERE salary.`status` IS NULL
   OR salary.`status` NOT IN ('DRAFT', 'FINALIZED', 'PAID');

ALTER TABLE `financesalary`
    MODIFY `status` ENUM('DRAFT', 'FINALIZED', 'PAID') NOT NULL DEFAULT 'DRAFT';
