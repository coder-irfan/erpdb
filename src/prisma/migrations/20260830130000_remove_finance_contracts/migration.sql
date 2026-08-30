-- Finance contract types were client-linked billing arrangements. Keep the
-- existing records, but classify them as Client contracts alongside invoices.
-- If a customer type with the same value already exists, retain that canonical
-- option and repoint its contracts before removing the duplicate finance type.
UPDATE `contract` AS c
INNER JOIN `option` AS finance_type ON finance_type.`id` = c.`contract_type_id`
INNER JOIN `option` AS customer_type
  ON customer_type.`category` = 'CONTRACT_TYPE_CUSTOMER'
  AND customer_type.`value` = finance_type.`value`
SET c.`contract_type_id` = customer_type.`id`
WHERE finance_type.`category` = 'CONTRACT_TYPE_FINANCE';

DELETE finance_type
FROM `option` AS finance_type
INNER JOIN `option` AS customer_type
  ON customer_type.`category` = 'CONTRACT_TYPE_CUSTOMER'
  AND customer_type.`value` = finance_type.`value`
WHERE finance_type.`category` = 'CONTRACT_TYPE_FINANCE';

UPDATE `option`
SET `category` = 'CONTRACT_TYPE_CUSTOMER', `sort_order` = `sort_order` + 4
WHERE `category` = 'CONTRACT_TYPE_FINANCE';
