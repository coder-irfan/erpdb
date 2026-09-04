ALTER TABLE `inventorymovement`
  ADD COLUMN `project_id` VARCHAR(191) NULL;

CREATE INDEX `InventoryMovement_project_id_fkey` ON `inventorymovement`(`project_id`);

ALTER TABLE `inventorymovement`
  ADD CONSTRAINT `InventoryMovement_project_id_fkey`
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
