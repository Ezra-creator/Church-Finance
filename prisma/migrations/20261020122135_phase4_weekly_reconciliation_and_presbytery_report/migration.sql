-- AlterTable
ALTER TABLE `church_settings` ADD COLUMN `parallelRunActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `momo_transactions` ADD COLUMN `locked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `periodId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `service_records` ADD COLUMN `periodId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `reconciliation_periods` (
    `id` VARCHAR(191) NOT NULL,
    `weekEnding` DATE NOT NULL,
    `status` ENUM('DRAFT', 'READY', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `bookTotal` DECIMAL(12, 2) NULL,
    `varianceReason` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `submittedById` VARCHAR(191) NULL,
    `reportVersion` INTEGER NOT NULL DEFAULT 0,
    `snapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reconciliation_periods_weekEnding_key`(`weekEnding`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `period_unlocks` (
    `id` VARCHAR(191) NOT NULL,
    `periodId` VARCHAR(191) NOT NULL,
    `unlockedById` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `momo_transactions_periodId_idx` ON `momo_transactions`(`periodId`);

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `reconciliation_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `momo_transactions` ADD CONSTRAINT `momo_transactions_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `reconciliation_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reconciliation_periods` ADD CONSTRAINT `reconciliation_periods_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `period_unlocks` ADD CONSTRAINT `period_unlocks_periodId_fkey` FOREIGN KEY (`periodId`) REFERENCES `reconciliation_periods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `period_unlocks` ADD CONSTRAINT `period_unlocks_unlockedById_fkey` FOREIGN KEY (`unlockedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
