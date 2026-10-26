-- CreateTable
CREATE TABLE `district_allocation_rules` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `percentage` DECIMAL(5, 2) NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `district_allocation_rules_categoryId_idx`(`categoryId`),
    INDEX `district_allocation_rules_effectiveFrom_idx`(`effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `district_remittances` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `amountDue` DECIMAL(12, 2) NOT NULL,
    `amountPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidOn` DATE NULL,
    `reference` VARCHAR(191) NULL,
    `status` ENUM('DUE', 'PART_PAID', 'PAID') NOT NULL DEFAULT 'DUE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `district_remittances_periodId_key`(`periodId`),
    INDEX `district_remittances_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `district_remittance_payments` (
    `id` VARCHAR(191) NOT NULL,
    `remittanceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paidOn` DATE NOT NULL,
    `reference` VARCHAR(191) NULL,
    `recordedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `district_remittance_payments_remittanceId_idx`(`remittanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `statement_logs` (
    `id` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `rangeStart` DATE NOT NULL,
    `rangeEnd` DATE NOT NULL,
    `generatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `statement_logs_memberId_idx`(`memberId`),
    INDEX `statement_logs_generatedById_idx`(`generatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `district_allocation_rules` ADD CONSTRAINT `district_allocation_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `giving_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `district_remittances` ADD CONSTRAINT `district_remittances_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `reconciliation_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `district_remittance_payments` ADD CONSTRAINT `district_remittance_payments_remittanceId_fkey` FOREIGN KEY (`remittanceId`) REFERENCES `district_remittances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `district_remittance_payments` ADD CONSTRAINT `district_remittance_payments_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statement_logs` ADD CONSTRAINT `statement_logs_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statement_logs` ADD CONSTRAINT `statement_logs_generatedById_fkey` FOREIGN KEY (`generatedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
