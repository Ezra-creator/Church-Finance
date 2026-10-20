-- CreateTable
CREATE TABLE `parser_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `fileType` ENUM('CSV', 'XLSX') NOT NULL,
    `headerRow` INTEGER NOT NULL DEFAULT 1,
    `columnMap` JSON NOT NULL,
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'YYYY-MM-DD',
    `amountSign` VARCHAR(191) NOT NULL DEFAULT 'POSITIVE_IN_NEGATIVE_OUT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `momo_imports` (
    `id` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileHash` VARCHAR(191) NOT NULL,
    `parserProfileId` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `rowsTotal` INTEGER NOT NULL,
    `rowsImported` INTEGER NOT NULL,
    `rowsDuplicate` INTEGER NOT NULL,
    `rowsSkipped` INTEGER NOT NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `rolledBackAt` DATETIME(3) NULL,
    `rolledBackById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `momo_imports_fileHash_key`(`fileHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `momo_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `importId` VARCHAR(191) NOT NULL,
    `externalRef` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `direction` ENUM('IN', 'OUT') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `counterpartyName` VARCHAR(191) NULL,
    `counterpartyPhone` VARCHAR(191) NULL,
    `rawDescription` TEXT NOT NULL,
    `normalizedDescription` TEXT NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `memberId` VARCHAR(191) NULL,
    `status` ENUM('AUTO', 'CONFIRMED', 'NEEDS_REVIEW', 'IGNORED') NOT NULL,
    `matchedRuleId` VARCHAR(191) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rawRow` JSON NOT NULL,
    `duplicateHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `momo_transactions_status_idx`(`status`),
    INDEX `momo_transactions_occurredAt_idx`(`occurredAt`),
    INDEX `momo_transactions_externalRef_idx`(`externalRef`),
    INDEX `momo_transactions_duplicateHash_idx`(`duplicateHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classification_rules` (
    `id` VARCHAR(191) NOT NULL,
    `pattern` VARCHAR(191) NOT NULL,
    `matchType` ENUM('CONTAINS_WORD', 'CONTAINS') NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `momo_imports` ADD CONSTRAINT `momo_imports_parserProfileId_fkey` FOREIGN KEY (`parserProfileId`) REFERENCES `parser_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_imports` ADD CONSTRAINT `momo_imports_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_imports` ADD CONSTRAINT `momo_imports_rolledBackById_fkey` FOREIGN KEY (`rolledBackById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_importId_fkey` FOREIGN KEY (`importId`) REFERENCES `momo_imports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `giving_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_matchedRuleId_fkey` FOREIGN KEY (`matchedRuleId`) REFERENCES `classification_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classification_rules` ADD CONSTRAINT `classification_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `giving_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classification_rules` ADD CONSTRAINT `classification_rules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
