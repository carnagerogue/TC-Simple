-- AlterTable
ALTER TABLE "ProjectContact" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TransactionContact" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" "StakeholderRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransactionContact_transactionId_contactId_role_key" ON "TransactionContact"("transactionId", "contactId", "role");

-- CreateIndex
CREATE INDEX "TransactionContact_transactionId_idx" ON "TransactionContact"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionContact_contactId_idx" ON "TransactionContact"("contactId");

-- AddForeignKey
ALTER TABLE "TransactionContact" ADD CONSTRAINT "TransactionContact_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionContact" ADD CONSTRAINT "TransactionContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
