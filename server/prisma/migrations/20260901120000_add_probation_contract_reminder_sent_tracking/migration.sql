-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "probationReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "contractReminderSentAt" TIMESTAMP(3);
