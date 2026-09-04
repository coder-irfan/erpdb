ALTER TABLE `crmclient` ADD COLUMN `country_id` VARCHAR(191) NULL;
ALTER TABLE `crmlead` ADD COLUMN `country_id` VARCHAR(191) NULL;
ALTER TABLE `project` ADD COLUMN `country_id` VARCHAR(191) NULL;

CREATE INDEX `CrmClient_country_id_fkey` ON `crmclient`(`country_id`);
CREATE INDEX `CrmLead_country_id_fkey` ON `crmlead`(`country_id`);
CREATE INDEX `Project_country_id_fkey` ON `project`(`country_id`);

ALTER TABLE `crmclient`
  ADD CONSTRAINT `CrmClient_country_id_fkey`
  FOREIGN KEY (`country_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crmlead`
  ADD CONSTRAINT `CrmLead_country_id_fkey`
  FOREIGN KEY (`country_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `project`
  ADD CONSTRAINT `Project_country_id_fkey`
  FOREIGN KEY (`country_id`) REFERENCES `option`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
