-- AlterTable
ALTER TABLE "disciplinary_meetings" ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "disciplinary_meeting_invitees" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_meeting_invitees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disciplinary_meeting_invitees_meetingId_employeeId_key" ON "disciplinary_meeting_invitees"("meetingId", "employeeId");

-- AddForeignKey
ALTER TABLE "disciplinary_meeting_invitees" ADD CONSTRAINT "disciplinary_meeting_invitees_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "disciplinary_meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_meeting_invitees" ADD CONSTRAINT "disciplinary_meeting_invitees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("employeeNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
