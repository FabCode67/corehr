-- Adds 4 new NotificationType values (employee-facing + admin-facing pairs
-- for probation-ending-soon and contract-ending-soon reminders), a generic
-- "this notification is about employee X" column on notifications so
-- admin-facing rows can deep-link to the specific employee record, and the
-- 4 EmailTemplate rows the new schedulers enqueue against.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROBATION_ENDING_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'PROBATION_ENDING_SOON_ADMIN';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_ENDING_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_ENDING_SOON_ADMIN';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "relatedEmployeeId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedEmployeeId_fkey" FOREIGN KEY ("relatedEmployeeId") REFERENCES "employees"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the 4 new email templates (idempotent — skip any key that already
-- exists, e.g. from a fresh install's prisma/seed.ts run). createdById is
-- required on EmailTemplate, so this attributes them to any existing HR
-- admin rather than a hardcoded id that wouldn't exist on this database.
INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'probation_ending_soon',
  'Probation Ending Soon (Employee)',
  'employees',
  'Your probation period ends soon',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Probation ending soon</h2><p>Hi {{employee_name}}, your probation period ends on <strong>{{end_date}}</strong>. Please contact HR if you have any questions.</p><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">Questions? Contact NCBA Rwanda Human Resource at {{hr_contact_phone}}.<br />This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.</p></div></div>',
  ARRAY['employee_name', 'end_date', 'employee_url', 'hr_contact_phone'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'probation_ending_soon')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'probation_ending_soon_admin',
  'Probation Ending Soon (Admin)',
  'employees',
  'Employee probation ending soon — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Employee probation ending soon</h2><p>Hi {{admin_name}}, {{employee_name}} ({{employee_number}}) has probation ending on <strong>{{end_date}}</strong>.</p><p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.</p></div></div>',
  ARRAY['admin_name', 'employee_name', 'employee_number', 'end_date', 'employee_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'probation_ending_soon_admin')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'contract_ending_soon',
  'Contract Ending Soon (Employee)',
  'employees',
  'Your contract is ending soon',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Contract ending soon</h2><p>Hi {{employee_name}}, your contract ends on <strong>{{end_date}}</strong>. Please contact HR if you have any questions.</p><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">Questions? Contact NCBA Rwanda Human Resource at {{hr_contact_phone}}.<br />This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.</p></div></div>',
  ARRAY['employee_name', 'end_date', 'employee_url', 'hr_contact_phone'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'contract_ending_soon')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'contract_ending_soon_admin',
  'Contract Ending Soon (Admin)',
  'employees',
  'Employee contract ending soon — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Employee contract ending soon</h2><p>Hi {{admin_name}}, {{employee_name}} ({{employee_number}})''s contract ends on <strong>{{end_date}}</strong>.</p><p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.</p></div></div>',
  ARRAY['admin_name', 'employee_name', 'employee_number', 'end_date', 'employee_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'contract_ending_soon_admin')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);
