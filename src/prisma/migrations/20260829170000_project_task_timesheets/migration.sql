-- Allow an approved project timesheet to be attributed to one project task.
ALTER TABLE `HrmStaffTimesheet` ADD COLUMN `task_id` VARCHAR(191) NULL;

CREATE INDEX `HrmStaffTimesheet_task_id_fkey` ON `HrmStaffTimesheet`(`task_id`);

ALTER TABLE `HrmStaffTimesheet`
  ADD CONSTRAINT `HrmStaffTimesheet_task_id_fkey`
  FOREIGN KEY (`task_id`) REFERENCES `Task`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalize legacy option labels and move projects off the redundant Active state.
UPDATE `Project` project_row
JOIN `Option` active_status ON active_status.`id` = project_row.`status_id`
JOIN `Option` progress_status ON progress_status.`category` = 'PROJECT_STATUS' AND progress_status.`value` = 'IN_PROGRESS'
SET project_row.`status_id` = progress_status.`id`
WHERE active_status.`category` = 'PROJECT_STATUS' AND active_status.`value` = 'ACTIVE';

UPDATE `Option` SET `is_active` = FALSE, `is_default` = FALSE
WHERE `category` = 'PROJECT_STATUS' AND `value` = 'ACTIVE';

UPDATE `Option` SET `label` = 'To-Do'
WHERE `category` = 'TASK_STATUS' AND `value` = 'TO_DO';

UPDATE `Option` SET `label` = 'Done'
WHERE `category` = 'TASK_STATUS' AND `value` IN ('COMPLETED', 'DONE');
