/*
  Warnings:

  - You are about to drop the column `email` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `outlets` table. All the data in the column will be lost.
  - You are about to drop the column `nama_outlet` on the `outlets` table. All the data in the column will be lost.
  - You are about to drop the column `telepon` on the `outlets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `outlets` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp_number` on the `outlets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[no_wa,outlet_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[noHp]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `namaOutlet` to the `outlets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `outlets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whatsappNumber` to the `outlets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noHp` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WhatsappStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'PAUSED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "outlets" DROP COLUMN "created_at",
DROP COLUMN "nama_outlet",
DROP COLUMN "telepon",
DROP COLUMN "updated_at",
DROP COLUMN "whatsapp_number",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isWhatsappActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "namaOutlet" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "whatsappNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "noHp" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "blasts" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "title" TEXT,
    "media_url" TEXT,
    "media_type" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',

    CONSTRAINT "blasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blast_reports" (
    "id" TEXT NOT NULL,
    "blastId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "error_message" TEXT,
    "wa_message_id" TEXT,

    CONSTRAINT "blast_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "sessionName" TEXT,
    "qrCode" TEXT,
    "status" "WhatsappStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSeen" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3),
    "apiProvider" TEXT NOT NULL DEFAULT 'baileys',
    "apiToken" TEXT,
    "webhookUrl" TEXT,
    "session_data" JSONB,
    "device_info" JSONB,
    "auto_reconnect" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "whatsapp_session_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "media_url" TEXT,
    "media_type" TEXT,
    "wa_message_id" TEXT,
    "wa_message_key" JSONB,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "group_id" TEXT,
    "group_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_queue" (
    "id" TEXT NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "media_url" TEXT,
    "media_type" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "metadata" JSONB,
    "blast_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_session_id_key" ON "whatsapp_sessions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_outletId_phoneNumber_key" ON "whatsapp_sessions"("outletId", "phoneNumber");

-- CreateIndex
CREATE INDEX "messages_outlet_id_created_at_idx" ON "messages"("outlet_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_customer_id_created_at_idx" ON "messages"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "message_queue_status_scheduled_at_idx" ON "message_queue"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "message_queue_session_id_status_idx" ON "message_queue"("session_id", "status");

-- CreateIndex
CREATE INDEX "message_queue_outlet_id_idx" ON "message_queue"("outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_no_wa_outlet_id_key" ON "customers"("no_wa", "outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_noHp_key" ON "users"("noHp");

-- AddForeignKey
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blasts" ADD CONSTRAINT "blasts_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blast_reports" ADD CONSTRAINT "blast_reports_blastId_fkey" FOREIGN KEY ("blastId") REFERENCES "blasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_whatsapp_session_id_fkey" FOREIGN KEY ("whatsapp_session_id") REFERENCES "whatsapp_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
