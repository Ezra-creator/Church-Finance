-- CreateTable
CREATE TABLE `members` (
    `id` VARCHAR(191) NOT NULL,
    `memberNumber` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `members_memberNumber_key`(`memberNumber`),
    UNIQUE INDEX `members_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_records` (
    `id` VARCHAR(191) NOT NULL,
    `serviceDate` DATE NOT NULL,
    `serviceType` ENUM('SUNDAY', 'MIDWEEK', 'SPECIAL', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'COUNTED', 'LOCKED') NOT NULL DEFAULT 'OPEN',
    `countedById` VARCHAR(191) NULL,
    `witnessName` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_records_serviceDate_serviceType_title_key`(`serviceDate`, `serviceType`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `count_sheets` (
    `id` VARCHAR(191) NOT NULL,
    `serviceRecordId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `count_sheets_serviceRecordId_categoryId_key`(`serviceRecordId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `count_lines` (
    `id` VARCHAR(191) NOT NULL,
    `countSheetId` VARCHAR(191) NOT NULL,
    `denominationId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `count_lines_countSheetId_denominationId_key`(`countSheetId`, `denominationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `giving_entries` (
    `id` VARCHAR(191) NOT NULL,
    `serviceRecordId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NULL,
    `payerName` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `receiptId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `giving_entries_receiptId_key`(`receiptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `issuedById` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `receipts_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_sequences` (
    `year` INTEGER NOT NULL,
    `last` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_countedById_fkey` FOREIGN KEY (`countedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `count_sheets` ADD CONSTRAINT `count_sheets_serviceRecordId_fkey` FOREIGN KEY (`serviceRecordId`) REFERENCES `service_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `count_sheets` ADD CONSTRAINT `count_sheets_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `giving_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `count_lines` ADD CONSTRAINT `count_lines_countSheetId_fkey` FOREIGN KEY (`countSheetId`) REFERENCES `count_sheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `count_lines` ADD CONSTRAINT `count_lines_denominationId_fkey` FOREIGN KEY (`denominationId`) REFERENCES `denominations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `giving_entries` ADD CONSTRAINT `giving_entries_serviceRecordId_fkey` FOREIGN KEY (`serviceRecordId`) REFERENCES `service_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `giving_entries` ADD CONSTRAINT `giving_entries_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `giving_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `giving_entries` ADD CONSTRAINT `giving_entries_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `giving_entries` ADD CONSTRAINT `giving_entries_receiptId_fkey` FOREIGN KEY (`receiptId`) REFERENCES `receipts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
