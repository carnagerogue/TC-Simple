-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "city" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "closingAgentName" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "closingCompany" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "closingDate" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "contractDate" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "county" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "earnestMoneyAmount" REAL;
ALTER TABLE "Transaction" ADD COLUMN "earnestMoneyDueDate" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "includedItems" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "possessionDate" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "purchasePrice" REAL;
ALTER TABLE "Transaction" ADD COLUMN "state" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "titleCompany" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "zip" TEXT;
