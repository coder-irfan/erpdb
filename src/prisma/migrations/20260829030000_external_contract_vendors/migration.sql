CREATE TABLE `contractvendor` (
    `id` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `contact_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ContractVendor_email_key`(`email`),
    INDEX `ContractVendor_company_name_idx`(`company_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `contract`
    MODIFY `client_id` VARCHAR(191) NULL,
    ADD COLUMN `vendor_id` VARCHAR(191) NULL;

CREATE INDEX `Contract_vendor_id_fkey` ON `contract`(`vendor_id`);

ALTER TABLE `contract`
    ADD CONSTRAINT `Contract_vendor_id_fkey`
    FOREIGN KEY (`vendor_id`) REFERENCES `contractvendor`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
