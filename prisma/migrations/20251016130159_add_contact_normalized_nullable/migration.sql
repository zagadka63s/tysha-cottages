/*
  Warnings:

  - A unique constraint covering the columns `[phoneNormalized]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[telegramHandleNormalized]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "contactNormalized" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNormalized" TEXT,
ADD COLUMN     "telegramHandleNormalized" TEXT;

-- CreateIndex
CREATE INDEX "Booking_contactNormalized_idx" ON "Booking"("contactNormalized");

-- CreateIndex
CREATE INDEX "Booking_status_checkIn_idx" ON "Booking"("status", "checkIn");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNormalized_key" ON "User"("phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramHandleNormalized_key" ON "User"("telegramHandleNormalized");
