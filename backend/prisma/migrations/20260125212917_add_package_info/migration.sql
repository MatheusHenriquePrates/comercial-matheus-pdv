-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unidadeEmbalagem" TEXT,
ADD COLUMN     "unidadesPorEmbalagem" INTEGER NOT NULL DEFAULT 1;
