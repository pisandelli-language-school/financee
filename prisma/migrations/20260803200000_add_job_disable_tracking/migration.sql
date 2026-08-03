ALTER TABLE `JobDefinition`
  ADD COLUMN `disabledAt` DATETIME(3) NULL,
  ADD COLUMN `disabledById` VARCHAR(191) NULL;

CREATE INDEX `JobDefinition_disabledAt_idx` ON `JobDefinition`(`disabledAt`);
CREATE INDEX `JobDefinition_disabledById_idx` ON `JobDefinition`(`disabledById`);

ALTER TABLE `JobDefinition`
  ADD CONSTRAINT `JobDefinition_disabledById_fkey`
  FOREIGN KEY (`disabledById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
