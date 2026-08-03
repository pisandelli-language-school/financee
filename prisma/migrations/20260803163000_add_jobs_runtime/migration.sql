CREATE TABLE `JobDefinition` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `mode` ENUM('AUTOMATIC', 'MANUAL', 'BOTH') NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `scheduleLabel` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `JobDefinition_key_key`(`key`),
  INDEX `JobDefinition_isEnabled_idx`(`isEnabled`),
  INDEX `JobDefinition_mode_idx`(`mode`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `JobExecution` (
  `id` VARCHAR(191) NOT NULL,
  `jobKey` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL') NOT NULL,
  `startedAt` DATETIME(3) NOT NULL,
  `finishedAt` DATETIME(3) NULL,
  `durationMs` INTEGER NULL,
  `errorMessage` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `JobExecution_jobKey_createdAt_idx`(`jobKey`, `createdAt`),
  INDEX `JobExecution_status_idx`(`status`),
  INDEX `JobExecution_startedAt_idx`(`startedAt`),
  PRIMARY KEY (`id`)
);

ALTER TABLE `JobExecution`
  ADD CONSTRAINT `JobExecution_jobKey_fkey`
  FOREIGN KEY (`jobKey`) REFERENCES `JobDefinition`(`key`)
  ON DELETE CASCADE ON UPDATE CASCADE;
