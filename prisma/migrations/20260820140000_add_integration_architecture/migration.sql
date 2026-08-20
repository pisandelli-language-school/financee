CREATE TABLE `IntegrationClient` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `IntegrationClient_clientId_key`(`clientId`),
  INDEX `IntegrationClient_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `IntegrationClientCredential` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `lastUsedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `IntegrationClientCredential_tokenHash_key`(`tokenHash`),
  INDEX `IntegrationClientCredential_clientId_idx`(`clientId`),
  INDEX `IntegrationClientCredential_expiresAt_idx`(`expiresAt`),
  INDEX `IntegrationClientCredential_revokedAt_idx`(`revokedAt`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `IntegrationClientScope` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `scopeKey` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `IntegrationClientScope_clientId_scopeKey_key`(`clientId`, `scopeKey`),
  INDEX `IntegrationClientScope_scopeKey_idx`(`scopeKey`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `IntegrationLog` (
  `id` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL,
  `operation` VARCHAR(191) NOT NULL,
  `direction` ENUM('OUTBOUND', 'INBOUND', 'EXPOSED_API') NOT NULL,
  `status` ENUM('SUCCESS', 'FAILED', 'PENDING', 'IGNORED') NOT NULL,
  `requestSummary` JSON NULL,
  `responseSummary` JSON NULL,
  `rawPayload` JSON NULL,
  `errorMessage` VARCHAR(191) NULL,
  `entityType` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,
  `clientId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `IntegrationLog_provider_idx`(`provider`),
  INDEX `IntegrationLog_operation_idx`(`operation`),
  INDEX `IntegrationLog_direction_idx`(`direction`),
  INDEX `IntegrationLog_status_idx`(`status`),
  INDEX `IntegrationLog_entityType_entityId_idx`(`entityType`, `entityId`),
  INDEX `IntegrationLog_clientId_idx`(`clientId`),
  INDEX `IntegrationLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
);

ALTER TABLE `IntegrationClientCredential`
  ADD CONSTRAINT `IntegrationClientCredential_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `IntegrationClient`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IntegrationClientScope`
  ADD CONSTRAINT `IntegrationClientScope_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `IntegrationClient`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IntegrationLog`
  ADD CONSTRAINT `IntegrationLog_clientId_fkey`
  FOREIGN KEY (`clientId`) REFERENCES `IntegrationClient`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
