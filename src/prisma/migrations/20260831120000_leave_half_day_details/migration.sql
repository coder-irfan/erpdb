ALTER TABLE `hrmstaffleave`
    ADD COLUMN `duration_type` VARCHAR(191) NOT NULL DEFAULT 'FULL_DAY',
    ADD COLUMN `half_day_shift` VARCHAR(191) NULL;
