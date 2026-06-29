-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_clientId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clientId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
