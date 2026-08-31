-- Staff records are the only source of employment title and compensation.
ALTER TABLE `hrmstaffcontract`
    DROP COLUMN `position_title`,
    DROP COLUMN `base_salary`,
    DROP COLUMN `amount_base`,
    DROP COLUMN `currency`,
    DROP COLUMN `exchange_rate`;
