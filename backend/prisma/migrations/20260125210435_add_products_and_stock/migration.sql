/*
  Warnings:

  - You are about to drop the column `paidInstallments` on the `Debt` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `originalAmount` to the `Debt` table without a default value. This is not possible if the table is not empty.
  - Made the column `dueDate` on table `Debt` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "paidInstallments",
ADD COLUMN     "installmentNo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "interest" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "originalAmount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "dueDate" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "profitMargin" DOUBLE PRECISION,
ADD COLUMN     "taxCOFINS" DOUBLE PRECISION,
ADD COLUMN     "taxICMS" DOUBLE PRECISION,
ADD COLUMN     "taxIPI" DOUBLE PRECISION,
ADD COLUMN     "taxPIS" DOUBLE PRECISION,
ALTER COLUMN "barcode" DROP NOT NULL,
ALTER COLUMN "minStock" SET DEFAULT 10,
ALTER COLUMN "category" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "nfeNumber" TEXT,
    "saleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" SERIAL NOT NULL,
    "debtId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
