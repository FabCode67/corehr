/**
 * Production-style seed — intentionally minimal.
 *
 * This seeds ONLY what a fresh production database needs to be usable, per
 * an explicit request to stop shipping demo/sample data. It creates:
 *
 *  - 3 Functions: Control, Business, Support (the three-lines-of-defense
 *    taxonomy every Department must roll up to).
 *  - 2 Departments: "Executive Office" (the root department) and
 *    "Human Resources" (reports to Executive Office via
 *    parentDepartmentId). NOTE: seeded as "Human Resources" (plural), not
 *    "Human Resource" — see HR_DEPARTMENT_NAME in
 *    server/src/common/admin-eligibility.util.ts. Auto-admin-grant only
 *    fires for a department with this exact name, so the plural spelling
 *    is required for the seeded employee below to actually get admin
 *    access.
 *  - 1 Position: "Head of Human Resource Department", under Human
 *    Resources, at the General Manager (department-head) level.
 *  - 1 Employee: Fabrice Mwanafunzi, holding that position. Sensitive
 *    personal fields (phone, national ID, date of birth) are read from
 *    required environment variables rather than hardcoded in source — see
 *    the "Seed — HR Head (admin) employee" section of .env.example.
 *    Password defaults to DEFAULT_EMPLOYEE_PASSWORD ("Staff@123", same as
 *    every other new hire) but can be overridden via env; mustChangePassword
 *    is set true either way, with the app's normal temporary-password
 *    expiry window, same as any real new hire.
 *  - Reference catalogs that have NO "create new" path anywhere in the
 *    client app, and would otherwise leave core features permanently
 *    broken on a fresh database:
 *      - PositionLevel (full 10-level ladder) — every Position needs one,
 *        and there is no admin UI to add a level.
 *      - Band (full 1-10 + Contractual Staff ladder) — PositionHistory.
 *        bandId is a required column, and there is no admin UI to add a
 *        band either.
 *      - PerformanceRatingScale (the 1-5 scale) — the Performance module
 *        assumes these rows exist; the client only edits existing rows, it
 *        never creates new ones.
 *      - ExitDocumentType (the standard exit-clearance checklist) — same
 *        story, no "create new" control in the client.
 *      - EmailTemplate — every automated email the app ever sends
 *        (welcome, leave, performance, learning, recruitment, exit,
 *        employee-relations, approvals, probation/contract reminders)
 *        looks itself up by a fixed `key`; without these rows that mail
 *        silently never goes out.
 *
 * Deliberately NOT seeded — every one of these either has a genuine
 * "create new" page somewhere in the client (Branches/Locations, Units,
 * AcademicInstitution, Skill, SanctionType, the recruitment stage
 * catalog/workflows, course/training/form categories), or is
 * instance/transactional data the request explicitly asked to keep off a
 * fresh database (leave requests/balances, notifications, performance
 * review periods/reviews, course assignments, job requisitions/
 * applications, disciplinary cases, forms, etc.). HR/admins create all of
 * that themselves once the app is live — this file's job is just to make
 * the app bootable, not to populate it.
 *
 * Idempotent — safe to re-run (`npx prisma db seed`); everything upserts
 * by its natural unique key.
 */
import { Gender, MaritalStatus, PositionChangeType, PositionTrack, PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

import { computeIsAdminForPosition } from "../src/common/admin-eligibility.util"
import { DEFAULT_EMPLOYEE_PASSWORD } from "../src/modules/auth/default-password.constant"
import { computeTemporaryPasswordExpiry } from "../src/modules/auth/temporary-password.constant"

const prisma = new PrismaClient()

// ---- Small upsert helpers — every one keyed on a natural unique field, so
// re-running this script is always safe. -----------------------------------

async function upsertFunction(name: string) {
  return prisma.function.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

async function upsertDepartment(functionId: string, name: string, parentDepartmentId?: string) {
  return prisma.department.upsert({
    where: { functionId_name: { functionId, name } },
    update: { parentDepartmentId },
    create: { functionId, name, parentDepartmentId },
  })
}

async function upsertLevel(name: string, rank: number, track: PositionTrack = "STANDARD", code?: string) {
  return prisma.positionLevel.upsert({
    where: { name },
    update: { rank, track, code },
    create: { name, rank, track, code },
  })
}

async function upsertBand(name: string, rank: number) {
  return prisma.band.upsert({
    where: { name },
    update: { rank },
    create: { name, rank },
  })
}

async function upsertPosition(params: {
  title: string
  departmentId: string
  levelId: string
  reportsToPositionId?: string | null
}) {
  const { title, departmentId, levelId, reportsToPositionId = null } = params

  // Can't use prisma.position.upsert() here for the same reason noted in
  // every earlier version of this file: the departmentId_unitId_title
  // compound unique index's generated WhereUniqueInput requires a
  // non-null unitId, even though the column itself is nullable. findFirst
  // has no such restriction.
  const existing = await prisma.position.findFirst({
    where: { departmentId, unitId: null, title },
  })

  if (existing) {
    return prisma.position.update({
      where: { id: existing.id },
      data: { levelId, reportsToPositionId },
    })
  }

  return prisma.position.create({
    data: { title, departmentId, levelId, reportsToPositionId },
  })
}

/** Reads a required env var or throws with a message pointing at
 *  .env.example — used for every piece of sensitive personal data on the
 *  one seeded employee, so nothing sensitive ever lives in source. */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in server/.env before running the seed — see the "Seed — HR Head (admin) employee" section of .env.example.`
    )
  }
  return value
}

async function main() {
  // ---- Position levels (full ladder) ---------------------------------------
  // The bank's real 10-level ladder. Only Deputy Director and Director are
  // EXECUTIVE track; General Manager is the department-head level and
  // stays STANDARD.
  const levelSupportStaff = await upsertLevel("Support Staff", 1)
  const levelOperationsAssistant = await upsertLevel("Operations Assistant", 2)
  const levelOfficer = await upsertLevel("Officer", 3)
  const levelAssistantManager = await upsertLevel("Assistant Manager", 4)
  const levelManager = await upsertLevel("Manager", 5)
  const levelSeniorManager = await upsertLevel("Senior Manager", 6)
  const levelAGM = await upsertLevel("Assistant General Manager", 7)
  const levelGM = await upsertLevel("General Manager", 8)
  const levelDeputyDirector = await upsertLevel("Deputy Director", 9, "EXECUTIVE")
  const levelDirector = await upsertLevel("Director", 10, "EXECUTIVE")
  void levelSupportStaff
  void levelOperationsAssistant
  void levelOfficer
  void levelAssistantManager
  void levelManager
  void levelSeniorManager
  void levelAGM
  void levelDeputyDirector
  void levelDirector

  // ---- Bands (1..10, plus Contractual Staff for non-payroll workers) -------
  const bands = new Map<number, Awaited<ReturnType<typeof upsertBand>>>()
  for (let i = 1; i <= 10; i++) {
    bands.set(i, await upsertBand(`Band ${i}`, i))
  }
  await upsertBand("Contractual Staff (DSA, GT & Intern)", 11)

  // ---- Functions -------------------------------------------------------------
  const controlFunction = await upsertFunction("Control")
  const businessFunction = await upsertFunction("Business")
  const supportFunction = await upsertFunction("Support")
  void businessFunction

  // ---- Departments -----------------------------------------------------------
  // Executive Office is the root department (Control). Human Resources
  // reports to it (parentDepartmentId) and sits under Support.
  const executiveOffice = await upsertDepartment(controlFunction.id, "Executive Office")
  const humanResources = await upsertDepartment(supportFunction.id, "Human Resources", executiveOffice.id)

  // ---- Position ----------------------------------------------------------
  const hrHead = await upsertPosition({
    title: "Head of Human Resource Department",
    departmentId: humanResources.id,
    levelId: levelGM.id,
    reportsToPositionId: null, // root of the tree for now — nothing else is seeded to report to
  })

  // ---- Employee: Fabrice Mwanafunzi ---------------------------------------
  // Sensitive fields come from required env vars, never hardcoded — see
  // .env.example's "Seed — HR Head (admin) employee" section.
  const email = process.env.SEED_HR_HEAD_EMAIL?.trim() || "mwanafunzifabrice@gmail.com"
  // Same default every other new hire gets via EmployeesService.create()
  // (see DEFAULT_EMPLOYEE_PASSWORD's own doc comment) — overridable via env,
  // but not required, since mustChangePassword below forces a change on
  // first login regardless of which password is used to get there.
  const password = process.env.SEED_HR_HEAD_PASSWORD?.trim() || DEFAULT_EMPLOYEE_PASSWORD
  const phone = requireEnv("SEED_HR_HEAD_PHONE")
  const nationalIdNumber = requireEnv("SEED_HR_HEAD_NATIONAL_ID")
  const dateOfBirth = new Date(requireEnv("SEED_HR_HEAD_DATE_OF_BIRTH"))
  const gender = (process.env.SEED_HR_HEAD_GENDER?.trim() as Gender | undefined) ?? Gender.MALE
  const maritalStatus =
    (process.env.SEED_HR_HEAD_MARITAL_STATUS?.trim() as MaritalStatus | undefined) ?? MaritalStatus.SINGLE
  const nationality = process.env.SEED_HR_HEAD_NATIONALITY?.trim() || "Rwandan"
  const hrHeadBand = bands.get(8)! // General Manager level pairs with Band 8, same convention as every Head of Department elsewhere in this app

  // isAdmin is never hardcoded — same rule as production (see
  // computeIsAdminForPosition's doc comment): it's derived from the
  // position's department, so re-running this seed re-applies it.
  const isAdmin = await computeIsAdminForPosition(prisma, hrHead.id)
  const passwordHash = await bcrypt.hash(password, 10)
  const employmentStartDate = new Date()

  const fabrice = await prisma.employee.upsert({
    where: { employeeNumber: "EMP-0001" },
    update: {
      positionId: hrHead.id,
      bandId: hrHeadBand.id,
      passwordHash,
      isAdmin,
    },
    create: {
      employeeNumber: "EMP-0001",
      firstName: "Fabrice",
      lastName: "Mwanafunzi",
      email,
      gender,
      dateOfBirth,
      nationalIdNumber,
      nationality,
      maritalStatus,
      phone,
      positionId: hrHead.id,
      bandId: hrHeadBand.id,
      employmentStartDate,
      passwordHash,
      isAdmin,
      // First Login Security — same as any real new hire created through
      // the app: forced to change this password, with the app's normal
      // temporary-password expiry window.
      mustChangePassword: true,
      temporaryPasswordExpiresAt: computeTemporaryPasswordExpiry(),
    },
  })

  // Same as EmployeesService's own assign-position step: make sure the
  // first assignment leaves behind an INITIAL_HIRE PositionHistory row
  // (PositionHistory.bandId is a required column).
  const hasHistory = await prisma.positionHistory.findFirst({
    where: { employeeId: fabrice.employeeNumber },
  })
  if (!hasHistory) {
    await prisma.positionHistory.create({
      data: {
        employeeId: fabrice.employeeNumber,
        positionId: hrHead.id,
        bandId: hrHeadBand.id,
        changeType: PositionChangeType.INITIAL_HIRE,
        effectiveFrom: employmentStartDate,
      },
    })
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded 1 employee: ${fabrice.firstName} ${fabrice.lastName} (${fabrice.employeeNumber}), isAdmin=${fabrice.isAdmin}, mustChangePassword=${fabrice.mustChangePassword}.`
  )

  await seedPerformanceRatingScale()
  await seedExitDocumentTypes()
  await seedEmailTemplates(fabrice.employeeNumber)
}

/**
 * The 1-5 performance rating scale every review in the Performance module
 * assumes exists. expectedPercentage is the classic 10/20/40/20/10 "forced
 * curve" — a bell shape peaking at rank 3 (Succeeded) — used as the
 * dashboard's reference curve. There is no "create new" control for this
 * catalog in the client (RatingScaleForm only edits an existing row), so
 * these rows must exist from the start.
 */
async function seedPerformanceRatingScale() {
  const scaleDefs: Array<[rank: number, label: string, description: string, expectedPercentage: number]> = [
    [5, "Outstanding", "Performance far exceeds expectations across all objectives.", 10],
    [4, "Exceeded Expectations", "Performance consistently surpasses expectations.", 20],
    [3, "Succeeded", "Performance fully meets all expectations.", 40],
    [2, "Meets Some Expectations", "Performance meets some, but not all, expectations.", 20],
    [1, "Unsatisfactory", "Performance falls significantly short of expectations.", 10],
  ]
  for (const [rank, label, description, expectedPercentage] of scaleDefs) {
    await prisma.performanceRatingScale.upsert({
      where: { rank },
      update: { label, description, expectedPercentage },
      create: { rank, label, description, expectedPercentage },
    })
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded Performance Rating Scale: ${scaleDefs.length} ranks.`)
}

/**
 * The standard exit-clearance checklist — no "create new" control exists
 * for this catalog in the client either.
 */
async function seedExitDocumentTypes() {
  const documentTypes: { name: string; description: string; isMandatory: boolean; sortOrder: number }[] = [
    { name: "Company ID Card Returned", description: "Physical staff ID card handed back to HR/Security.", isMandatory: true, sortOrder: 1 },
    { name: "Laptop / IT Equipment Returned", description: "Laptop, monitor, phone, and any other issued hardware returned to IT.", isMandatory: true, sortOrder: 2 },
    { name: "System Access Revoked", description: "Email, core banking, and other system accounts disabled by IT.", isMandatory: true, sortOrder: 3 },
    { name: "Handover Report Submitted", description: "Outstanding work and pending items handed over to the line manager/team.", isMandatory: true, sortOrder: 4 },
    { name: "Exit Interview Conducted", description: "HR has conducted the exit interview and logged feedback.", isMandatory: false, sortOrder: 5 },
    { name: "Final Payslip & Settlement Processed", description: "Final salary, leave encashment, and any other dues processed by Payroll.", isMandatory: true, sortOrder: 6 },
    { name: "Loan / Advance Clearance", description: "Any outstanding staff loans or salary advances settled or a repayment plan agreed.", isMandatory: false, sortOrder: 7 },
    { name: "Clearance Certificate Signed", description: "Final sign-off from all relevant departments (Finance, IT, Facilities, HR).", isMandatory: true, sortOrder: 8 },
  ]

  for (const documentType of documentTypes) {
    await prisma.exitDocumentType.upsert({
      where: { name: documentType.name },
      update: {},
      create: documentType,
    })
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded Exit Document Types: ${documentTypes.length} default checklist items.`)
}

/**
 * Every automated email the app sends looks itself up by a fixed `key` —
 * without these rows that mail silently never goes out. There is no
 * "create new" control for this catalog in the client either.
 * `createdById` is a required FK to Employee, so it points at whichever
 * employee this seed created (the HR head — the only employee that exists
 * on a fresh database).
 */
async function seedEmailTemplates(adminEmployeeNumber: string) {
  function emailShell(title: string, innerHtml: string) {
    return `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
  <div style="background:#0f4c81; padding: 20px 28px; border-radius: 6px 6px 0 0;">
    <span style="color:#ffffff; font-size: 18px; font-weight: bold;">NCBA Rwanda &mdash; PeopleSuite</span>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 28px; border-radius: 0 0 6px 6px;">
    <h2 style="margin-top:0; color:#0f4c81;">${title}</h2>
    ${innerHtml}
    <p style="margin-top: 32px; font-size: 13px; color: #6b7280;">
      Questions? Contact NCBA Rwanda Human Resource at {{hr_contact_phone}}.<br />
      This is an automated message from NCBA Rwanda PeopleSuite &mdash; please do not reply directly to this email.
    </p>
  </div>
</div>`
  }

  const emailTemplateDefs: Array<{
    key: string
    name: string
    category: string
    subject: string
    bodyHtml: string
    variables: string[]
    isMandatory?: boolean
  }> = [
    // ---- Onboarding ----------------------------------------------------------
    {
      key: "employee_welcome",
      name: "Employee Welcome Email",
      category: "onboarding",
      subject: "Welcome to NCBA Rwanda, {{employee_name}}!",
      bodyHtml: emailShell(
        "Welcome to the team, {{employee_name}}!",
        `<p>We're delighted to confirm you're now an active employee of NCBA Rwanda.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0; color:#6b7280;">Employee Number</td><td style="padding:4px 0; font-weight:bold;">{{employee_number}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Department</td><td style="padding:4px 0; font-weight:bold;">{{department}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Position</td><td style="padding:4px 0; font-weight:bold;">{{position}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Start Date</td><td style="padding:4px 0; font-weight:bold;">{{start_date}}</td></tr>
        </table>
        <p><a href="{{login_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Log in to PeopleSuite</a></p>
        <p>Your temporary login details:</p>
        <p>Username: <strong>{{username}}</strong><br />Temporary Password: <strong>{{temporary_password}}</strong></p>
        <p>For security, you'll be asked to change this password and accept the Terms of Use the first time you log in.</p>`
      ),
      variables: ["employee_name", "employee_number", "department", "position", "start_date", "login_url", "username", "temporary_password", "hr_contact_phone"],
      isMandatory: true,
    },

    // ---- Leave -----------------------------------------------------------------
    {
      key: "leave_submitted",
      name: "Leave Request Submitted",
      category: "leave",
      subject: "Your leave request has been submitted",
      bodyHtml: emailShell(
        "Leave request submitted",
        `<p>Hi {{employee_name}}, your {{leave_type}} request for {{start_date}} to {{end_date}} ({{days}} day(s)) has been submitted and is awaiting approval from {{approver_name}}.</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my requests</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "days", "approver_name", "leave_url"],
    },
    {
      key: "leave_approval_needed",
      name: "Leave Approval Needed (Manager)",
      category: "leave",
      subject: "Leave request awaiting your approval — {{employee_name}}",
      bodyHtml: emailShell(
        "A leave request needs your decision",
        `<p>{{employee_name}} has requested {{leave_type}} leave from {{start_date}} to {{end_date}} ({{days}} day(s)).</p>
        <p><a href="{{approval_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review request</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "days", "approval_url"],
    },
    {
      key: "leave_approved",
      name: "Leave Request Approved",
      category: "leave",
      subject: "Your leave request was approved",
      bodyHtml: emailShell(
        "Leave approved",
        `<p>Good news, {{employee_name}} — your {{leave_type}} request for {{start_date}} to {{end_date}} has been approved by {{approver_name}}.</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my requests</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "approver_name", "leave_url"],
    },
    {
      key: "leave_rejected",
      name: "Leave Request Rejected",
      category: "leave",
      subject: "Your leave request was not approved",
      bodyHtml: emailShell(
        "Leave request rejected",
        `<p>Hi {{employee_name}}, your {{leave_type}} request for {{start_date}} to {{end_date}} was not approved by {{approver_name}}.</p>
        <p>Reason: {{decision_comment}}</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my requests</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "approver_name", "decision_comment", "leave_url"],
    },
    {
      key: "leave_cancelled",
      name: "Leave Request Cancelled",
      category: "leave",
      subject: "Leave request cancelled — {{employee_name}}",
      bodyHtml: emailShell(
        "Leave request cancelled",
        `<p>{{employee_name}}'s {{leave_type}} request for {{start_date}} to {{end_date}} has been cancelled.</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View leave requests</a></p>`
      ),
      variables: ["employee_name", "leave_type", "start_date", "end_date", "leave_url"],
    },
    {
      key: "leave_low_balance",
      name: "Low Leave Balance Alert",
      category: "leave",
      subject: "Your {{leave_type}} balance is running low",
      bodyHtml: emailShell(
        "Low leave balance",
        `<p>Hi {{employee_name}}, your remaining {{leave_type}} balance is now {{balance_days}} day(s). Plan ahead if you have time off coming up.</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my balances</a></p>`
      ),
      variables: ["employee_name", "leave_type", "balance_days", "leave_url"],
    },
    {
      key: "leave_carry_forward_expiring",
      name: "Carry-Forward Leave Expiring",
      category: "leave",
      subject: "{{carry_forward_days}} carried-forward day(s) expire on {{expiry_date}}",
      bodyHtml: emailShell(
        "Carried-forward leave is expiring soon",
        `<p>Hi {{employee_name}}, you have {{carry_forward_days}} day(s) of carried-forward {{leave_type}} leave that will expire on {{expiry_date}}. Use them before they're forfeited.</p>
        <p><a href="{{leave_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my balances</a></p>`
      ),
      variables: ["employee_name", "leave_type", "carry_forward_days", "expiry_date", "leave_url"],
    },

    // ---- Performance -------------------------------------------------------
    {
      key: "performance_self_appraisal_open",
      name: "Self-Appraisal Now Open",
      category: "performance",
      subject: "{{review_period}} self-appraisal is now open",
      bodyHtml: emailShell(
        "Self-appraisal is open",
        `<p>Hi {{employee_name}}, the {{review_period}} review period is open. Please complete your self-appraisal by {{deadline}}.</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start self-appraisal</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_reminder_14_days",
      name: "Appraisal Reminder — 14 Days Left",
      category: "performance",
      subject: "Reminder: {{review_period}} appraisal due in 14 days",
      bodyHtml: emailShell(
        "14 days left to complete your appraisal",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due on {{deadline}} — that's 14 days from now.</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete appraisal</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_reminder_7_days",
      name: "Appraisal Reminder — 7 Days Left",
      category: "performance",
      subject: "Reminder: {{review_period}} appraisal due in 7 days",
      bodyHtml: emailShell(
        "7 days left to complete your appraisal",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due on {{deadline}}.</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete appraisal</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_reminder_1_day",
      name: "Appraisal Reminder — 1 Day Left",
      category: "performance",
      subject: "Final reminder: {{review_period}} appraisal due tomorrow",
      bodyHtml: emailShell(
        "Due tomorrow",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal is due tomorrow ({{deadline}}).</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete appraisal</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_overdue",
      name: "Appraisal Overdue",
      category: "performance",
      subject: "Overdue: {{review_period}} appraisal",
      bodyHtml: emailShell(
        "Your appraisal is now overdue",
        `<p>Hi {{employee_name}}, your {{review_period}} appraisal was due on {{deadline}} and has not yet been submitted. Please complete it as soon as possible.</p>
        <p><a href="{{review_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete appraisal now</a></p>`
      ),
      variables: ["employee_name", "review_period", "deadline", "review_url"],
    },
    {
      key: "performance_manager_reminder",
      name: "Manager Appraisal Reminder",
      category: "performance",
      subject: "Reminder: appraisal(s) awaiting your review",
      bodyHtml: emailShell(
        "Appraisals awaiting your review",
        `<p>Hi {{manager_name}}, {{pending_count}} appraisal(s) in the {{review_period}} cycle are awaiting your review.</p>`
      ),
      variables: ["manager_name", "review_period", "pending_count"],
    },

    // ---- Learning & Development ---------------------------------------------
    {
      key: "learning_course_assigned",
      name: "Course Assigned",
      category: "learning",
      subject: "You've been assigned: {{course_name}}",
      bodyHtml: emailShell(
        "New course assigned",
        `<p>Hi {{employee_name}}, you've been assigned "{{course_name}}", due by {{due_date}}.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start course</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
    },
    {
      key: "learning_not_started_reminder",
      name: "Course Not Started Reminder",
      category: "learning",
      subject: "Reminder: {{course_name}} not yet started",
      bodyHtml: emailShell(
        "You haven't started this course yet",
        `<p>Hi {{employee_name}}, "{{course_name}}" is due by {{due_date}} and hasn't been started.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start course</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
    },
    {
      key: "learning_approaching_deadline",
      name: "Course Deadline Approaching",
      category: "learning",
      subject: "{{course_name}} is due soon",
      bodyHtml: emailShell(
        "Deadline approaching",
        `<p>Hi {{employee_name}}, "{{course_name}}" is due on {{due_date}}.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Continue course</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
    },
    {
      key: "learning_overdue",
      name: "Course Overdue",
      category: "learning",
      subject: "Overdue: {{course_name}}",
      bodyHtml: emailShell(
        "This course is now overdue",
        `<p>Hi {{employee_name}}, "{{course_name}}" was due on {{due_date}} and is now overdue.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete course now</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
    },
    {
      key: "learning_aml_mandatory_reminder",
      name: "Mandatory AML Training Reminder",
      category: "learning",
      subject: "Action required: {{course_name}} (mandatory compliance training)",
      bodyHtml: emailShell(
        "Mandatory compliance training reminder",
        `<p>Hi {{employee_name}}, "{{course_name}}" is mandatory AML/compliance training due by {{due_date}}. This reminder cannot be disabled.</p>
        <p><a href="{{course_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete training now</a></p>`
      ),
      variables: ["employee_name", "course_name", "due_date", "course_url"],
      isMandatory: true,
    },

    // ---- Recruitment ---------------------------------------------------------
    {
      key: "recruitment_application_received",
      name: "Application Received",
      category: "recruitment",
      subject: "We've received your application — {{job_title}}",
      bodyHtml: emailShell(
        "Application received",
        `<p>Hi {{candidate_name}}, thank you for applying for {{job_title}} at NCBA Rwanda. Our recruitment team will review your application and be in touch.</p>`
      ),
      variables: ["candidate_name", "job_title"],
    },
    {
      key: "recruitment_stage_progress",
      name: "Application Progressed",
      category: "recruitment",
      subject: "Your application has moved forward — {{job_title}}",
      bodyHtml: emailShell(
        "You're moving forward",
        `<p>Hi {{candidate_name}}, good news — your application for {{job_title}} has progressed to the next stage: {{stage_name}}. We'll be in touch with further details.</p>`
      ),
      variables: ["candidate_name", "job_title", "stage_name"],
    },
    {
      key: "recruitment_interview_invitation",
      name: "Interview Invitation",
      category: "recruitment",
      subject: "Interview invitation — {{job_title}}",
      bodyHtml: emailShell(
        "You're invited to interview",
        `<p>Hi {{candidate_name}}, we'd like to invite you to interview for {{job_title}} on {{interview_date}} at {{interview_time}} ({{interview_mode}}).</p>`
      ),
      variables: ["candidate_name", "job_title", "interview_date", "interview_time", "interview_mode"],
    },
    {
      key: "recruitment_assessment_invitation",
      name: "Assessment Invitation",
      category: "recruitment",
      subject: "Assessment invitation — {{job_title}}",
      bodyHtml: emailShell(
        "Please complete your assessment",
        `<p>Hi {{candidate_name}}, as part of your application for {{job_title}}, please complete the following assessment by {{deadline}}.</p>
        <p><a href="{{assessment_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Start assessment</a></p>`
      ),
      variables: ["candidate_name", "job_title", "deadline", "assessment_url"],
    },
    {
      key: "recruitment_offer_letter",
      name: "Offer Letter",
      category: "recruitment",
      subject: "Your offer from NCBA Rwanda — {{job_title}}",
      bodyHtml: emailShell(
        "Congratulations!",
        `<p>Hi {{candidate_name}}, we're pleased to offer you the position of {{job_title}}. Please find your offer letter attached / linked below.</p>
        <p><a href="{{offer_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View offer</a></p>`
      ),
      variables: ["candidate_name", "job_title", "offer_url"],
    },
    {
      key: "recruitment_rejection",
      name: "Application Not Successful",
      category: "recruitment",
      subject: "Update on your application — {{job_title}}",
      bodyHtml: emailShell(
        "Application update",
        `<p>Hi {{candidate_name}}, thank you for your interest in {{job_title}}. After careful consideration, we've decided not to move forward with your application at this time. We wish you the best in your search.</p>`
      ),
      variables: ["candidate_name", "job_title"],
    },
    {
      key: "recruitment_recruiter_new_application",
      name: "New Application (Recruiter)",
      category: "recruitment",
      subject: "New application — {{job_title}}",
      bodyHtml: emailShell(
        "New application received",
        `<p>{{candidate_name}} has applied for {{job_title}}.</p>
        <p><a href="{{application_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review application</a></p>`
      ),
      variables: ["candidate_name", "job_title", "application_url"],
    },
    {
      key: "recruitment_interview_scheduled_recruiter",
      name: "Interview Scheduled (Recruiter)",
      category: "recruitment",
      subject: "Interview scheduled — {{candidate_name}} for {{job_title}}",
      bodyHtml: emailShell(
        "Interview scheduled",
        `<p>An interview for {{candidate_name}} ({{job_title}}) has been scheduled for {{interview_date}} at {{interview_time}}.</p>
        <p><a href="{{application_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review application</a></p>`
      ),
      variables: ["candidate_name", "job_title", "interview_date", "interview_time", "application_url"],
    },

    // ---- Exit Management -----------------------------------------------------
    {
      key: "exit_form_assigned",
      name: "Exit Form Assigned",
      category: "exit",
      subject: "Action required: exit form",
      bodyHtml: emailShell(
        "Exit form assigned",
        `<p>Hi {{employee_name}}, following your exit process (last working day {{last_working_day}}), please complete the exit form below.</p>
        <p><a href="{{form_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Complete exit form</a></p>`
      ),
      variables: ["employee_name", "last_working_day", "form_url"],
    },
    {
      key: "exit_clearance_checklist",
      name: "Exit Clearance Checklist",
      category: "exit",
      subject: "Your exit clearance checklist",
      bodyHtml: emailShell(
        "Clearance checklist",
        `<p>Hi {{employee_name}}, please complete the clearance checklist items below before your last working day ({{last_working_day}}).</p>`
      ),
      variables: ["employee_name", "last_working_day"],
    },
    {
      key: "exit_interview_invitation",
      name: "Exit Interview Invitation",
      category: "exit",
      subject: "Exit interview scheduled",
      bodyHtml: emailShell(
        "Exit interview",
        `<p>Hi {{employee_name}}, your exit interview has been scheduled for {{interview_date}} at {{interview_time}}.</p>`
      ),
      variables: ["employee_name", "interview_date", "interview_time"],
    },
    {
      key: "exit_manager_approval_task",
      name: "Exit Task Awaiting Manager Approval",
      category: "exit",
      subject: "Action needed: exit clearance for {{employee_name}}",
      bodyHtml: emailShell(
        "Exit clearance awaiting your approval",
        `<p>Hi {{manager_name}}, {{employee_name}}'s exit clearance item ({{task_name}}) is awaiting your sign-off.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p>`
      ),
      variables: ["manager_name", "employee_name", "task_name", "employee_url"],
    },
    {
      key: "exit_hr_workflow_update",
      name: "Exit Workflow Update (HR)",
      category: "exit",
      subject: "Exit workflow update — {{employee_name}}",
      bodyHtml: emailShell(
        "Exit workflow update",
        `<p>{{employee_name}}'s exit process status changed to {{status}}.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p>`
      ),
      variables: ["employee_name", "status", "employee_url"],
    },
    {
      key: "employee_rehired",
      name: "Employee Rehired",
      category: "exit",
      subject: "Welcome back, {{employee_name}}!",
      bodyHtml: emailShell(
        "Welcome back",
        `<p>Hi {{employee_name}}, welcome back to NCBA Rwanda! Your employee record has been reactivated effective {{start_date}}.</p>
        <p>Please sign in and complete Position Assignment with HR to get set up in your new role.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View your profile</a></p>`
      ),
      variables: ["employee_name", "start_date", "employee_url"],
    },

    // ---- Employee Relations ---------------------------------------------------
    {
      key: "erc_meeting_invitation",
      name: "Disciplinary Meeting Invitation",
      category: "employee-relations",
      subject: "{{meeting_subject}}",
      bodyHtml: emailShell(
        "{{meeting_subject}}",
        `<p>Hi {{invitee_name}}, {{organizer_name}} has invited you to a meeting.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:4px 0; color:#6b7280;">Date</td><td style="padding:4px 0; font-weight:bold;">{{meeting_date}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Time</td><td style="padding:4px 0; font-weight:bold;">{{meeting_time}}</td></tr>
          <tr><td style="padding:4px 0; color:#6b7280;">Location</td><td style="padding:4px 0; font-weight:bold;">{{meeting_location}}</td></tr>
        </table>
        <p>{{meeting_description}}</p>`
      ),
      variables: ["invitee_name", "organizer_name", "meeting_subject", "meeting_description", "meeting_date", "meeting_time", "meeting_location"],
    },

    // ---- Generic Approvals (Leave / Recruitment / Forms / Training / Performance / Employee changes) ----
    {
      key: "approval_required",
      name: "Approval Required",
      category: "approval",
      subject: "Approval required: {{item_title}}",
      bodyHtml: emailShell(
        "Your approval is needed",
        `<p>Hi {{approver_name}}, "{{item_title}}" ({{item_type}}) requires your approval.</p>
        <p><a href="{{approval_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review now</a></p>`
      ),
      variables: ["approver_name", "item_title", "item_type", "approval_url"],
    },
    {
      key: "approval_completed",
      name: "Approval Completed",
      category: "approval",
      subject: "Approved: {{item_title}}",
      bodyHtml: emailShell(
        "Approved",
        `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) has been approved by {{approver_name}}.</p>
        <p><a href="{{item_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View record</a></p>`
      ),
      variables: ["requester_name", "item_title", "item_type", "approver_name", "item_url"],
    },
    {
      key: "approval_rejected",
      name: "Approval Rejected",
      category: "approval",
      subject: "Rejected: {{item_title}}",
      bodyHtml: emailShell(
        "Not approved",
        `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) was rejected by {{approver_name}}. Reason: {{decision_comment}}</p>
        <p><a href="{{item_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View record</a></p>`
      ),
      variables: ["requester_name", "item_title", "item_type", "approver_name", "decision_comment", "item_url"],
    },
    {
      key: "approval_returned_for_correction",
      name: "Returned for Correction",
      category: "approval",
      subject: "Please review: {{item_title}} was returned for correction",
      bodyHtml: emailShell(
        "Returned for correction",
        `<p>Hi {{requester_name}}, "{{item_title}}" ({{item_type}}) was returned by {{approver_name}} for correction. Notes: {{decision_comment}}</p>
        <p><a href="{{item_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View record</a></p>`
      ),
      variables: ["requester_name", "item_title", "item_type", "approver_name", "decision_comment", "item_url"],
    },

    // ---- Employees (probation / contract ending soon) --------------------------
    {
      key: "probation_ending_soon",
      name: "Probation Ending Soon (Employee)",
      category: "employees",
      subject: "Your probation period ends soon",
      bodyHtml: emailShell(
        "Probation ending soon",
        `<p>Hi {{employee_name}}, your probation period ends on {{end_date}}. Please contact HR if you have any questions.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my profile</a></p>`
      ),
      variables: ["employee_name", "end_date", "employee_url"],
      isMandatory: true,
    },
    {
      key: "probation_ending_soon_admin",
      name: "Probation Ending Soon (Admin)",
      category: "employees",
      subject: "Employee probation ending soon — {{employee_name}}",
      bodyHtml: emailShell(
        "Employee probation ending soon",
        `<p>Hi {{admin_name}}, {{employee_name}} ({{employee_number}}) has probation ending on {{end_date}}.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p>`
      ),
      variables: ["admin_name", "employee_name", "employee_number", "end_date", "employee_url"],
      isMandatory: true,
    },
    {
      key: "contract_ending_soon",
      name: "Contract Ending Soon (Employee)",
      category: "employees",
      subject: "Your contract is ending soon",
      bodyHtml: emailShell(
        "Contract ending soon",
        `<p>Hi {{employee_name}}, your contract ends on {{end_date}}. Please contact HR if you have any questions.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">View my profile</a></p>`
      ),
      variables: ["employee_name", "end_date", "employee_url"],
      isMandatory: true,
    },
    {
      key: "contract_ending_soon_admin",
      name: "Contract Ending Soon (Admin)",
      category: "employees",
      subject: "Employee contract ending soon — {{employee_name}}",
      bodyHtml: emailShell(
        "Employee contract ending soon",
        `<p>Hi {{admin_name}}, {{employee_name}} ({{employee_number}})'s contract ends on {{end_date}}.</p>
        <p><a href="{{employee_url}}" style="background:#0f4c81; color:#fff; padding:10px 18px; text-decoration:none; border-radius:4px;">Review employee record</a></p>`
      ),
      variables: ["admin_name", "employee_name", "employee_number", "end_date", "employee_url"],
      isMandatory: true,
    },
  ]

  for (const def of emailTemplateDefs) {
    await prisma.emailTemplate.upsert({
      where: { key: def.key },
      update: {},
      create: {
        key: def.key,
        name: def.name,
        category: def.category,
        subject: def.subject,
        bodyHtml: def.bodyHtml,
        variables: def.variables,
        isMandatory: def.isMandatory ?? false,
        createdById: adminEmployeeNumber,
      },
    })
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded Email Notification Templates: ${emailTemplateDefs.length} templates across onboarding/leave/performance/learning/recruitment/exit/employee-relations/approval categories.`)
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
