/** Common JD building blocks offered as dropdowns in the JD editor. */
import type { JdCompetency } from "./jd-content"

export const COMMON_BEHAVIOURAL: JdCompetency[] = [
  { name: "Customer Focus", description: "Puts the customer first, builds trust and long-term relationships, and resolves concerns promptly." },
  { name: "Results Oriented", description: "Driven to achieve and exceed targets and deliver quality outcomes." },
  { name: "Communication", description: "Communicates clearly and persuasively, in writing and in person." },
  { name: "Integrity", description: "Acts honestly, keeps confidentiality and upholds the Bank's code of conduct." },
  { name: "Teamwork and Collaboration", description: "Works well with colleagues, other departments and partners." },
  { name: "Problem Solving", description: "Analyses issues, weighs options and arrives at sound solutions." },
  { name: "Planning and Organising", description: "Prioritises work, manages time and meets deadlines." },
  { name: "Adaptability", description: "Responds positively to change and learns quickly." },
  { name: "Leadership", description: "Motivates, develops and holds the team accountable." },
  { name: "NCBA Values", description: "Driven, Open, Responsive and Trusted in all interactions." },
]

export const COMMON_TECHNICAL: JdCompetency[] = [
  { name: "Regulatory Compliance", description: "Understands and applies BNR regulations, AML/KYC requirements and Bank policies." },
  { name: "Data and Reporting", description: "Tracks data accurately and turns it into clear management insights using Excel." },
  { name: "Record Keeping", description: "Maintains accurate, complete and audit-ready records." },
  { name: "Risk Management", description: "Identifies, assesses and escalates operational and credit risks." },
  { name: "Banking Products Knowledge", description: "Sound knowledge of the Bank's products, services and processes." },
  { name: "Financial Analysis", description: "Analyses financial statements and prepares sound recommendations." },
  { name: "Sales and Cross-selling", description: "Identifies customer needs and converts opportunities into sales." },
  { name: "Project Management", description: "Plans, executes and delivers projects on time and within budget." },
  { name: "IT Systems and Applications", description: "Proficient with core banking and office systems relevant to the role." },
  { name: "Customer Service Standards", description: "Delivers service in line with the Bank's service standards and SLAs." },
]

export const ACADEMIC_OPTIONS = [
  "Bachelor's degree in Business Administration, Finance, Economics or a related field.",
  "Bachelor's degree in Information Technology, Computer Science or a related field.",
  "Bachelor's degree in Law or a related field.",
  "Bachelor's degree in Accounting or a related field.",
  "Master's degree in a relevant field is an added advantage.",
  "Diploma in a relevant field.",
]

export const PROFESSIONAL_OPTIONS = [
  "A relevant professional qualification (e.g. CPA, ACCA, CFA) is an added advantage.",
  "Professional certification in banking or finance (e.g. ACIB) is an added advantage.",
  "Professional IT certification (e.g. ITIL, CISA, CISSP) is an added advantage.",
  "Proficiency in MS Office (Word, Excel, PowerPoint).",
]

export const EXPERIENCE_OPTIONS = [
  "At least 2–3 years' relevant experience in banking or a related field.",
  "At least 5 years' relevant experience, including supervisory experience.",
  "At least 8 years' relevant experience, including 3 years in a managerial role.",
  "Entry level — relevant internship or graduate experience is an advantage.",
]

export const WORK_CYCLE_OPTIONS = [
  "Daily/weekly: operational tasks, customer requests and follow-ups.",
  "Monthly: targets, reconciliations and management reports.",
  "Quarterly: reviews, audits and planning.",
  "Annual: annual targets, budgets and own development plan.",
]

export const DECISION_OPTIONS = [
  "Operational: decisions within approved procedures and limits.",
  "Managerial: allocates work, approves leave and manages team performance.",
  "Strategic: shapes departmental strategy and recommends policy changes.",
  "Escalates matters outside own authority to the supervisor.",
]
