/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `position_levels` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "position_levels" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "position_levels_code_key" ON "position_levels"("code");
