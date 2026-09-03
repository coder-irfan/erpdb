UPDATE `option`
SET `label` = 'Fully Paid',
    `color_code` = 'success'
WHERE `category` = 'LOAN_STATUS'
  AND `value` IN ('PAID_OFF', 'REPAID');

INSERT INTO `option` (
    `id`,
    `category`,
    `label`,
    `value`,
    `color_code`,
    `sort_order`,
    `is_active`
)
VALUES (
    'system-loan-status-cancelled',
    'LOAN_STATUS',
    'Cancelled',
    'CANCELLED',
    'secondary',
    6,
    true
)
ON DUPLICATE KEY UPDATE
    `label` = VALUES(`label`),
    `color_code` = VALUES(`color_code`),
    `sort_order` = VALUES(`sort_order`),
    `is_active` = VALUES(`is_active`);
