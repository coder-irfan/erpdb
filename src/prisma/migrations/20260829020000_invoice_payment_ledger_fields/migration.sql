ALTER TABLE `financeincome`
    ADD COLUMN `payment_method_id` VARCHAR(191) NULL,
    ADD COLUMN `payment_date` DATETIME(3) NULL,
    ADD COLUMN `notes` TEXT NULL;

-- Backfill invoice receipts recorded before these fields were normalized. The
-- original JSON remains in place for audit/backward compatibility.
UPDATE `financeincome` AS `income`
LEFT JOIN `option` AS `method`
    ON `method`.`id` = JSON_UNQUOTE(JSON_EXTRACT(`income`.`pay_details`, '$.payment_method_id'))
    AND `method`.`category` = 'PAYMENT_METHOD'
SET
    `income`.`payment_method_id` = `method`.`id`,
    `income`.`payment_date` = COALESCE(
        STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(`income`.`pay_details`, '$.payment_date')), '%Y-%m-%d'),
        `income`.`created_at`
    ),
    `income`.`notes` = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`income`.`pay_details`, '$.notes')), 'null')
WHERE `income`.`invoice_id` IS NOT NULL
  AND JSON_VALID(`income`.`pay_details`);

CREATE INDEX `FinanceIncome_payment_method_id_fkey` ON `financeincome`(`payment_method_id`);

ALTER TABLE `financeincome`
    ADD CONSTRAINT `FinanceIncome_payment_method_id_fkey`
    FOREIGN KEY (`payment_method_id`) REFERENCES `option`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
