-- Head of Department follow-up: department-wide leave management (approve/
-- reject/cancel authorization changes live entirely in application code —
-- no schema change needed for those) plus new reminder notifications:
--   - Finally wires up the two NotificationType values that already existed
--     in the schema but were never fired by any code (LEAVE_STARTING_SOON,
--     RETURNING_TOMORROW), and adds their manager-facing counterparts sent
--     only to the resolved Head of Department (not broadcast to all admins).
--   - Adds BIRTHDAY_TOMORROW / WORK_ANNIVERSARY_TOMORROW, manager-facing
--     only, per the same follow-up request.
--   - Adds the dedup columns each new scheduler needs so a daily range-scan
--     doesn't re-notify every day (same convention as
--     Employee.probationReminderSentAt/contractReminderSentAt).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEAVE_STARTING_SOON_MANAGER';
ALTER TYPE "NotificationType" ADD VALUE 'RETURNING_TOMORROW_MANAGER';
ALTER TYPE "NotificationType" ADD VALUE 'BIRTHDAY_TOMORROW';
ALTER TYPE "NotificationType" ADD VALUE 'WORK_ANNIVERSARY_TOMORROW';

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN "startingSoonNotifiedAt" TIMESTAMP(3);
ALTER TABLE "leave_requests" ADD COLUMN "returningSoonNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "lastBirthdayNotifiedYear" INTEGER;
ALTER TABLE "employees" ADD COLUMN "lastAnniversaryNotifiedYear" INTEGER;

-- Seed the 6 new email templates (idempotent — skip any key that already
-- exists, e.g. from a fresh install's prisma/seed.ts run). createdById is
-- required on EmailTemplate, so this attributes them to any existing HR
-- admin rather than a hardcoded id that wouldn't exist on this database.
INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'leave_starting_soon',
  'Leave Starting Soon (Employee)',
  'leave',
  'Your leave starts soon',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Your leave starts soon</h2><p>Hi {{employee_name}}, your <strong>{{leave_type}}</strong> starts on <strong>{{start_date}}</strong>.</p><p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my leave</a></p></div></div>',
  ARRAY['employee_name', 'leave_type', 'start_date', 'leave_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'leave_starting_soon')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'leave_starting_soon_manager',
  'Leave Starting Soon (Department Head)',
  'leave',
  'Team member going on leave soon — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Team member going on leave soon</h2><p>Hi {{manager_name}}, {{employee_name}}''s <strong>{{leave_type}}</strong> starts on <strong>{{start_date}}</strong>.</p><p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View department leave</a></p></div></div>',
  ARRAY['manager_name', 'employee_name', 'leave_type', 'start_date', 'leave_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'leave_starting_soon_manager')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'leave_returning_tomorrow',
  'Returning From Leave Tomorrow (Employee)',
  'leave',
  'You return from leave tomorrow',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">You return from leave soon</h2><p>Hi {{employee_name}}, your <strong>{{leave_type}}</strong> ends and you''re due back on <strong>{{return_date}}</strong>.</p><p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my leave</a></p></div></div>',
  ARRAY['employee_name', 'leave_type', 'return_date', 'leave_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'leave_returning_tomorrow')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'leave_returning_tomorrow_manager',
  'Returning From Leave Tomorrow (Department Head)',
  'leave',
  'Team member returning from leave soon — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Team member returning from leave soon</h2><p>Hi {{manager_name}}, {{employee_name}} is due back from <strong>{{leave_type}}</strong> on <strong>{{return_date}}</strong>.</p><p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View department leave</a></p></div></div>',
  ARRAY['manager_name', 'employee_name', 'leave_type', 'return_date', 'leave_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'leave_returning_tomorrow_manager')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'birthday_tomorrow',
  'Team Member Birthday Tomorrow (Department Head)',
  'employees',
  'Team member birthday tomorrow — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Team member''s birthday is tomorrow</h2><p>Hi {{manager_name}}, {{employee_name}}''s birthday is tomorrow ({{date}}).</p><p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my department</a></p></div></div>',
  ARRAY['manager_name', 'employee_name', 'date', 'employee_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'birthday_tomorrow')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);

INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'work_anniversary_tomorrow',
  'Team Member Work Anniversary Tomorrow (Department Head)',
  'employees',
  'Team member work anniversary tomorrow — {{employee_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Team member''s work anniversary is tomorrow</h2><p>Hi {{manager_name}}, {{employee_name}}''s work anniversary is tomorrow ({{date}}) — {{years}} year(s) at NCBA Rwanda.</p><p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my department</a></p></div></div>',
  ARRAY['manager_name', 'employee_name', 'date', 'years', 'employee_url'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'work_anniversary_tomorrow')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);
