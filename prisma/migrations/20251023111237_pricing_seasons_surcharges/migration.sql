-- CreateEnum
CREATE TYPE "SurchargeType" AS ENUM ('EXTRA_GUEST', 'PET', 'CHILD_OVER_AGE');

-- CreateEnum
CREATE TYPE "SurchargeUnit" AS ENUM ('PER_NIGHT', 'PER_STAY');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "childrenOver6" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "childrenTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'UAH',
ADD COLUMN     "hasPet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quoteTotalUAH" INTEGER;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weekdayPrice" INTEGER NOT NULL,
    "weekendPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UAH',
    "weekendDays" TEXT NOT NULL DEFAULT 'FRI,SAT',

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceOverride" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "reason" TEXT,

    CONSTRAINT "PriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surcharge" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "SurchargeType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "unit" "SurchargeUnit" NOT NULL,
    "params" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Surcharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Season_startDate_idx" ON "Season"("startDate");

-- CreateIndex
CREATE INDEX "Season_endDate_idx" ON "Season"("endDate");

-- CreateIndex
CREATE INDEX "PriceOverride_date_idx" ON "PriceOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceOverride_date_key" ON "PriceOverride"("date");

-- CreateIndex
CREATE INDEX "Surcharge_type_idx" ON "Surcharge"("type");

-- CreateIndex
CREATE INDEX "Surcharge_active_idx" ON "Surcharge"("active");
