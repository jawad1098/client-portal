/*
  Warnings:

  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "filename" TEXT;
ALTER TABLE "Resource" ADD COLUMN "size" INTEGER;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Document";
PRAGMA foreign_keys=on;
