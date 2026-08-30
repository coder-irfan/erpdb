CREATE TABLE `TaskSubtask` (
  `id` VARCHAR(191) NOT NULL,
  `task_id` VARCHAR(191) NOT NULL,
  `parent_id` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `is_completed` BOOLEAN NOT NULL DEFAULT FALSE,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `created_by_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `TaskSubtask_task_id_sort_order_idx`(`task_id`, `sort_order`),
  INDEX `TaskSubtask_parent_id_fkey`(`parent_id`),
  INDEX `TaskSubtask_created_by_id_fkey`(`created_by_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaskAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `task_id` VARCHAR(191) NOT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `attachment_type` VARCHAR(191) NOT NULL DEFAULT 'FILE',
  `name` VARCHAR(191) NOT NULL,
  `url` TEXT NOT NULL,
  `mime_type` VARCHAR(191) NULL,
  `file_size` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `TaskAttachment_task_id_created_at_idx`(`task_id`, `created_at`),
  INDEX `TaskAttachment_created_by_user_id_fkey`(`created_by_user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaskComment` (
  `id` VARCHAR(191) NOT NULL,
  `task_id` VARCHAR(191) NOT NULL,
  `author_id` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `TaskComment_task_id_created_at_idx`(`task_id`, `created_at`),
  INDEX `TaskComment_author_id_fkey`(`author_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TaskSubtask`
  ADD CONSTRAINT `TaskSubtask_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskSubtask_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `TaskSubtask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskSubtask_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `HrmStaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TaskAttachment`
  ADD CONSTRAINT `TaskAttachment_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskAttachment_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TaskComment`
  ADD CONSTRAINT `TaskComment_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskComment_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `HrmStaff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
