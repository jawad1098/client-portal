-- AlterTable
ALTER TABLE "User" ADD COLUMN "slackUserId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "morningReminderSentAt" TIMESTAMP(3),
ADD COLUMN "eveningReminderSentAt" TIMESTAMP(3);
