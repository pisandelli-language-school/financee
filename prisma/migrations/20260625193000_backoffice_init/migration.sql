CREATE TABLE `Category` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('INCOME', 'EXPENSE', 'OTHER') NOT NULL,
  `dreGroup` ENUM('OPERATING_REVENUE', 'OPERATING_EXPENSE', 'FINANCIAL_RESULT', 'NON_OPERATING') NULL,
  `parentId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Category_type_idx`(`type`),
  INDEX `Category_parentId_idx`(`parentId`),
  UNIQUE INDEX `Category_name_type_parentId_key`(`name`, `type`, `parentId`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `Account` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `initialValue` DECIMAL(14, 2) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Account_name_key`(`name`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `CostCenter` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CostCenter_name_key`(`name`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `Tag` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `bgColor` VARCHAR(191) NULL,
  `textColor` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Tag_name_key`(`name`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `Contact` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `tradeName` VARCHAR(191) NULL,
  `document` VARCHAR(191) NULL,
  `documentType` ENUM('CPF', 'CNPJ', 'FOREIGN_DOCUMENT') NULL,
  `nature` ENUM('INDIVIDUAL', 'COMPANY', 'FOREIGN') NOT NULL,
  `birthDate` DATE NULL,
  `municipalRegistration` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Contact_nature_idx`(`nature`),
  INDEX `Contact_document_idx`(`document`),
  INDEX `Contact_isActive_idx`(`isActive`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `ContactRoleAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `role` ENUM('CLIENT', 'SUPPLIER', 'OTHER') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ContactRoleAssignment_role_idx`(`role`),
  UNIQUE INDEX `ContactRoleAssignment_contactId_role_key`(`contactId`, `role`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `Address` (
  `id` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `country` VARCHAR(191) NOT NULL DEFAULT 'BRASIL',
  `state` VARCHAR(191) NULL,
  `city` VARCHAR(191) NULL,
  `postalCode` VARCHAR(191) NULL,
  `street` VARCHAR(191) NULL,
  `number` VARCHAR(191) NULL,
  `complement` VARCHAR(191) NULL,
  `district` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Address_contactId_key`(`contactId`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `ContactFinancialResponsible` (
  `id` VARCHAR(191) NOT NULL,
  `contactId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `role` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ContactFinancialResponsible_contactId_key`(`contactId`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `PaymentMethod` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PaymentMethod_name_key`(`name`),
  PRIMARY KEY (`id`)
);

CREATE TABLE `NonBusinessDay` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `type` ENUM('FIXED', 'CALCULATED', 'CUSTOM') NOT NULL,
  `month` INTEGER NULL,
  `day` INTEGER NULL,
  `rule` ENUM('EASTER_MINUS_47', 'EASTER_MINUS_2', 'EASTER_PLUS_60') NULL,
  `date` DATE NULL,
  `scope` ENUM('NATIONAL', 'STATE', 'CITY', 'INTERNAL') NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `NonBusinessDay_type_idx`(`type`),
  INDEX `NonBusinessDay_month_day_idx`(`month`, `day`),
  INDEX `NonBusinessDay_date_idx`(`date`),
  PRIMARY KEY (`id`)
);

ALTER TABLE `Category`
  ADD CONSTRAINT `Category_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ContactRoleAssignment`
  ADD CONSTRAINT `ContactRoleAssignment_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Address`
  ADD CONSTRAINT `Address_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ContactFinancialResponsible`
  ADD CONSTRAINT `ContactFinancialResponsible_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
