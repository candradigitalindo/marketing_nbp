/*
  Warnings:

  - The `status` column on the `blasts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BlastStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "blasts" ADD COLUMN     "send_mode" TEXT DEFAULT 'separate',
DROP COLUMN "status",
ADD COLUMN     "status" "BlastStatus" NOT NULL DEFAULT 'QUEUED';
