ALTER TABLE `contract`
    ADD COLUMN `template_id` VARCHAR(191) NULL,
    ADD COLUMN `content_html` TEXT NULL;

CREATE INDEX `Contract_template_id_fkey` ON `contract`(`template_id`);

ALTER TABLE `contract`
    ADD CONSTRAINT `Contract_template_id_fkey`
    FOREIGN KEY (`template_id`) REFERENCES `option`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
