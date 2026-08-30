CREATE TABLE `notification` (
  `id` VARCHAR(191) NOT NULL,
  `dedupe_key` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'INFO',
  `title_en` VARCHAR(191) NOT NULL,
  `title_fa` VARCHAR(191) NOT NULL,
  `title_ps` VARCHAR(191) NOT NULL,
  `description_en` TEXT NOT NULL,
  `description_fa` TEXT NOT NULL,
  `description_ps` TEXT NOT NULL,
  `action_url` VARCHAR(191) NULL,
  `entity_type` VARCHAR(191) NULL,
  `entity_id` VARCHAR(191) NULL,
  `target_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `expires_at` DATETIME(3) NULL,
  UNIQUE INDEX `Notification_dedupe_key_key`(`dedupe_key`),
  INDEX `Notification_priority_created_at_idx`(`priority`, `created_at`),
  INDEX `Notification_target_user_id_created_at_idx`(`target_user_id`, `created_at`),
  INDEX `Notification_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
  INDEX `Notification_expires_at_idx`(`expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notificationrole` (
  `id` VARCHAR(191) NOT NULL,
  `notification_id` VARCHAR(191) NOT NULL,
  `role_id` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `NotificationRole_notification_id_role_id_key`(`notification_id`, `role_id`),
  INDEX `NotificationRole_role_id_idx`(`role_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notificationstate` (
  `id` VARCHAR(191) NOT NULL,
  `notification_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'READ',
  `read_at` DATETIME(3) NULL,
  `dismissed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `NotificationState_notification_id_user_id_key`(`notification_id`, `user_id`),
  INDEX `NotificationState_user_id_status_updated_at_idx`(`user_id`, `status`, `updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notification` ADD CONSTRAINT `Notification_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notificationrole` ADD CONSTRAINT `NotificationRole_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notificationrole` ADD CONSTRAINT `NotificationRole_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notificationstate` ADD CONSTRAINT `NotificationState_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notificationstate` ADD CONSTRAINT `NotificationState_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
