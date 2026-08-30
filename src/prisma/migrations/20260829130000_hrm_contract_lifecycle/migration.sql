ALTER TABLE `hrmstaffcontract`
    ADD COLUMN `template_id` VARCHAR(191) NULL,
    ADD COLUMN `duration_id` VARCHAR(191) NULL,
    ADD COLUMN `probation_days` INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN `notice_period_days` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `termination_date` DATE NULL,
    ADD COLUMN `termination_reason` TEXT NULL,
    ADD COLUMN `payroll_frozen` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `renewal_review_required` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `final_settlement_required` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `HrmStaffContract_template_id_fkey` ON `hrmstaffcontract`(`template_id`);
CREATE INDEX `HrmStaffContract_duration_id_fkey` ON `hrmstaffcontract`(`duration_id`);

ALTER TABLE `hrmstaffcontract`
    ADD CONSTRAINT `HrmStaffContract_template_id_fkey`
    FOREIGN KEY (`template_id`) REFERENCES `option`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `HrmStaffContract_duration_id_fkey`
    FOREIGN KEY (`duration_id`) REFERENCES `option`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `hrmstaffcontract` AS contract_record
INNER JOIN `option` AS status_option ON status_option.`id` = contract_record.`status_id`
SET
    contract_record.`payroll_frozen` = CASE WHEN status_option.`value` = 'ACTIVE' THEN false ELSE true END,
    contract_record.`renewal_review_required` = CASE WHEN status_option.`value` = 'EXPIRED' THEN true ELSE false END,
    contract_record.`final_settlement_required` = CASE WHEN status_option.`value` = 'TERMINATED' THEN true ELSE false END;

UPDATE `hrmstaffcontract` AS contract_record
INNER JOIN `option` AS policy_option ON policy_option.`id` = contract_record.`contract_type_id`
SET contract_record.`template_id` = contract_record.`contract_type_id`
WHERE policy_option.`category` = 'CONTRACT_POLICY';
