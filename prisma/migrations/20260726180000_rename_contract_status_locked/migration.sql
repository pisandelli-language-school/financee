ALTER TABLE `Contract`
  MODIFY `status` ENUM(
    'DRAFT',
    'PROPOSAL',
    'ACTIVE',
    'RENEWED',
    'CLOSED',
    'CANCELED',
    'LOST',
    'LOCKED'
  ) NOT NULL;

UPDATE `Contract`
SET `status` = 'LOCKED'
WHERE `status` = 'LOST';

ALTER TABLE `Contract`
  MODIFY `status` ENUM(
    'DRAFT',
    'PROPOSAL',
    'ACTIVE',
    'RENEWED',
    'CLOSED',
    'CANCELED',
    'LOCKED'
  ) NOT NULL;
