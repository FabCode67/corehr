import type { EducationType } from "@prisma/client"

/**
 * BNR EDWH code tables for EDUCATION and PROFESSIONAL_CERTIFICATES, from
 * "BNR EDWH – Education & Professional Certificate Codes". Users pick from
 * these on their education / certification records and the EDWH export emits
 * the code. NOTE: client/lib/edwh-codes.ts mirrors these lists for the
 * pickers — keep the two in sync.
 */
export const BNR_EDUCATION_CODES = [
  { code: 1, label: "PHD" },
  { code: 2, label: "Masters" },
  { code: 3, label: "Bachelors Degree" },
  { code: 4, label: "Diploma (A2 or A1 level)" },
  { code: 5, label: "School attendance below A2 level" },
  { code: 6, label: "High School" },
  { code: 7, label: "Primary School" },
  { code: 8, label: "Below Primary" },
] as const

export const BNR_EDUCATION_CODE_VALUES: number[] = BNR_EDUCATION_CODES.map((e) => e.code)

/** Fallback when a record has no explicit BNR code: the closest code for the
 *  record's EducationType. Short courses/training/etc. aren't a formal level,
 *  so they map to nothing. */
export const EDUCATION_TYPE_TO_BNR_CODE: Partial<Record<EducationType, number>> = {
  PHD: 1,
  MASTERS_DEGREE: 2,
  DEGREE: 3,
  DIPLOMA: 4,
  SECONDARY_SCHOOL: 6,
}

export const BNR_CERTIFICATE_CODES = [
  { code: "MCITP", label: "Microsoft Certified IT Professional" },
  { code: "MCTS", label: "Microsoft Certified Technology Specialist" },
  { code: "Security+", label: "Security+" },
  { code: "MCPD", label: "Microsoft Certified Professional Developer" },
  { code: "CCNA", label: "Cisco Certified Network Associate" },
  { code: "CCNE", label: "Cisco Certified Internetwork Expert" },
  { code: "A+", label: "Professional skills for IT hardware and support" },
  { code: "MCSE", label: "Microsoft Certified Systems Engineer" },
  { code: "MCSA", label: "Microsoft Certified Systems Administrator" },
  { code: "CISSP", label: "Certified Information Systems Security Professional" },
  { code: "Linux+", label: "Linux+" },
  { code: "CCNP", label: "CCNP Routing and Switching" },
  { code: "CCNP-DC", label: "CCNP Data Center" },
  { code: "CCNP-Security/CCSP", label: "CCNP Security/CCSP" },
  { code: "CCDP", label: "Communications Capabilities Development Programme" },
  { code: "CCDE", label: "Cisco Certified Design Expert" },
  { code: "CCAr", label: "Cisco Certified Architect" },
  { code: "CCIE", label: "Cisco Certified Internetwork Expert" },
  { code: "OCA", label: "Oracle Certified Associate" },
  { code: "OCP", label: "Oracle Certified Professional" },
  { code: "OCM", label: "Oracle Certified Master" },
  { code: "OCS", label: "Oracle Specialist" },
  { code: "CISA", label: "Certified Information Systems Auditor" },
  { code: "CISM", label: "Certified Information Security Manager" },
  { code: "CGEIT", label: "Certified in the Governance of Enterprise IT" },
  { code: "CRISC", label: "Certified in Risk and Information Systems Control" },
  { code: "CICT", label: "Certified Information Communication Technology" },
  { code: "DICT", label: "Diploma in Information Communication Technology" },
  // "Other Professional Certificate Categories" (codes only in the BNR doc).
  // Codes repeated across categories (CIA, CPA) appear once.
  { code: "ACII", label: "Insurance — ACII" },
  { code: "CERA", label: "Insurance — CERA" },
  { code: "CAA", label: "Insurance — CAA" },
  { code: "ACCA", label: "Accounting/Finance — ACCA" },
  { code: "CPA", label: "Accounting/Finance, Pension — CPA" },
  { code: "CPS", label: "Accounting/Finance — CPS" },
  { code: "CIFA", label: "Accounting/Finance — CIFA" },
  { code: "CCP", label: "Accounting/Finance — CCP" },
  { code: "ATD", label: "Accounting/Finance — ATD" },
  { code: "CFA", label: "Accounting/Finance — CFA" },
  { code: "CIA", label: "Accounting/Finance, Audit — CIA" },
  { code: "DCM", label: "Accounting/Finance — DCM" },
  { code: "CPSP", label: "Accounting/Finance — CPSP" },
  { code: "CBA", label: "Audit — CBA" },
  { code: "CFSA", label: "Audit — CFSA" },
  { code: "APE", label: "Pension — APE" },
  { code: "CPE", label: "Pension — CPE" },
  { code: "CPC", label: "Pension — CPC" },
  { code: "DPA", label: "Pension — DPA" },
  { code: "DC Gov", label: "Pension — DC Gov" },
  { code: "CPAE", label: "Pension — CPAE" },
  { code: "CPSMG", label: "Pension — CPSMG" },
  { code: "DRP", label: "Pension — DRP" },
  { code: "DEBRS", label: "Pension — DEBRS" },
  { code: "DipIEB", label: "Pension — DipIEB" },
  { code: "DRRA", label: "Pension — DRRA" },
  { code: "ADRP", label: "Pension — ADRP" },
  { code: "APT", label: "Pension — APT" },
  { code: "OTHER", label: "Other recognized certificate that adds significant value" },
] as const

export const BNR_CERTIFICATE_CODE_VALUES: string[] = BNR_CERTIFICATE_CODES.map((c) => c.code)
