-- Adds NotificationType values for the notification-coverage gaps closed in
-- this pass: position/transfer changes, recruitment stage progression,
-- performance review due/submitted, Employee Relations grievances
-- (submit/assign/resolve — the disciplinary-case pipeline already had its
-- own ERC_* set, grievances never did), and exit-document assignment/
-- completion (completion previously reused EXIT_PROCESS_STARTED by mistake).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'POSITION_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'POSITION_CHANGED_ADMIN';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STAGE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_REVIEW_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_REVIEW_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'GRIEVANCE_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'GRIEVANCE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'GRIEVANCE_RESOLVED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_DOCUMENTS_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'EXIT_DOCUMENT_COMPLETED';

-- Seed the one new email template this pass wires up (position change —
-- mirrors employee_rehired's idempotent insert pattern above). Grievance
-- and performance-review notifications stay in-app-only for now, same as
-- most of the ERC_* disciplinary-case notifications already were.
INSERT INTO "email_templates" ("id", "key", "name", "category", "subject", "bodyHtml", "variables", "isActive", "isMandatory", "createdById", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || random()::text)::uuid,
  'position_changed',
  'Position Changed (Employee)',
  'employees',
  'Your position has been updated',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="padding: 24px;"><h2 style="color:#0f4c81;">Your position has changed</h2><p>Hi {{employee_name}}, effective {{effective_date}} your position is now <strong>{{position_title}}</strong> in {{department_name}}.</p><p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my profile</a></p><p style="margin-top: 32px; font-size: 13px; color: #6b7280;">Questions? Contact NCBA Rwanda Human Resource at {{hr_contact_phone}}.<br />This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.</p></div></div>',
  ARRAY['employee_name', 'effective_date', 'position_title', 'department_name', 'employee_url', 'hr_contact_phone'],
  true, true,
  (SELECT "employeeNumber" FROM "employees" WHERE "isAdmin" = true ORDER BY "employeeNumber" LIMIT 1),
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "email_templates" WHERE "key" = 'position_changed')
  AND EXISTS (SELECT 1 FROM "employees" WHERE "isAdmin" = true);
