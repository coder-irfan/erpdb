ALTER TABLE `inventorymovement`
  ADD COLUMN `source_vendor` VARCHAR(191) NULL,
  ADD COLUMN `reason` VARCHAR(191) NULL,
  ADD COLUMN `assigned_staff_id` VARCHAR(191) NULL;

CREATE INDEX `InventoryMovement_assigned_staff_id_fkey` ON `inventorymovement`(`assigned_staff_id`);

ALTER TABLE `inventorymovement`
  ADD CONSTRAINT `InventoryMovement_assigned_staff_id_fkey`
  FOREIGN KEY (`assigned_staff_id`) REFERENCES `hrmstaff`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
