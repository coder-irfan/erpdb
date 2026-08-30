-- Immutable task work-log ledger. Application code only inserts into this table.
CREATE TABLE `TaskTimesheet` (
  `id` VARCHAR(191) NOT NULL,
  `task_id` VARCHAR(191) NOT NULL,
  `project_id` VARCHAR(191) NOT NULL,
  `staff_id` VARCHAR(191) NOT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `work_date` DATE NOT NULL,
  `worked_hours` DECIMAL(6, 2) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `TaskTimesheet_task_id_work_date_idx`(`task_id`, `work_date`),
  INDEX `TaskTimesheet_project_id_work_date_idx`(`project_id`, `work_date`),
  INDEX `TaskTimesheet_staff_id_work_date_idx`(`staff_id`, `work_date`),
  INDEX `TaskTimesheet_created_by_user_id_fkey`(`created_by_user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TaskTimesheet`
  ADD CONSTRAINT `TaskTimesheet_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskTimesheet_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskTimesheet_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `HrmStaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskTimesheet_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TRIGGER `TaskTimesheet_prevent_update`
BEFORE UPDATE ON `TaskTimesheet`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Task timesheet entries are immutable';

CREATE TRIGGER `TaskTimesheet_prevent_delete`
BEFORE DELETE ON `TaskTimesheet`
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Task timesheet entries are immutable';
