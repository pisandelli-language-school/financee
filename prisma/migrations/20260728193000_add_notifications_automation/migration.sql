CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(191) NULL,
  `severity` ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `readAt` DATETIME(3) NULL,
  `isPriority` BOOLEAN NOT NULL DEFAULT false,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `actionUrl` VARCHAR(191) NULL,
  `dedupeKey` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `archivedAt` DATETIME(3) NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Notification_userId_dedupeKey_key`(`userId`, `dedupeKey`),
  INDEX `Notification_userId_isRead_deletedAt_archivedAt_idx`(`userId`, `isRead`, `deletedAt`, `archivedAt`),
  INDEX `Notification_severity_idx`(`severity`),
  INDEX `Notification_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `Notification_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `AutomationRule` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `severity` ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,
  `config` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `AutomationRule_key_key`(`key`),
  PRIMARY KEY (`id`)
);

ALTER TABLE `Notification`
  ADD CONSTRAINT `Notification_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
