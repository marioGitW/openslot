-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "aiAgenda" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiGeneratedAt" TIMESTAMPTZ;
