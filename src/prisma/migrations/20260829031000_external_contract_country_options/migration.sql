INSERT INTO `option` (
    `id`, `category`, `label`, `value`, `color_code`, `sort_order`,
    `is_active`, `is_default`, `is_paid_leave`, `created_at`, `updated_at`, `description`
)
SELECT
    CONCAT('country_', `source`.`id`), 'COUNTRY', `source`.`label`, `source`.`value`, `source`.`color_code`, `source`.`sort_order`,
    `source`.`is_active`, `source`.`is_default`, `source`.`is_paid_leave`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), `source`.`description`
FROM `option` AS `source`
LEFT JOIN `option` AS `existing`
  ON `existing`.`category` = 'COUNTRY' AND `existing`.`value` = `source`.`value`
WHERE `source`.`category` = 'CONTRACT_COUNTRY'
  AND `existing`.`id` IS NULL;
