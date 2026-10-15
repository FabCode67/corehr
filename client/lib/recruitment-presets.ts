/** One-click presets for the recruitment workflow setup — the stages and
 *  workflows most banks use, so HR picks instead of typing. */
export interface StagePreset {
  key: string
  name: string
  stageType: "SCREENING" | "REVIEW" | "TEST" | "INTERVIEW" | "ASSESSMENT_CENTRE" | "DECISION" | "OFFER" | "ADMIN"
  isScored: boolean
  description: string
}

export const COMMON_STAGES: StagePreset[] = [
  { key: "CV_SCREENING", name: "CV Screening", stageType: "SCREENING", isScored: true, description: "Shortlist applications against the job requirements." },
  { key: "PHONE_SCREENING", name: "Phone Screening", stageType: "SCREENING", isScored: false, description: "Short call to confirm interest, availability and expectations." },
  { key: "WRITTEN_TEST", name: "Written Test", stageType: "TEST", isScored: true, description: "Aptitude or knowledge test." },
  { key: "TECHNICAL_TEST", name: "Technical / Practical Test", stageType: "TEST", isScored: true, description: "Role-specific practical exercise." },
  { key: "HR_INTERVIEW", name: "HR Interview", stageType: "INTERVIEW", isScored: true, description: "Culture, motivation and background interview." },
  { key: "TECHNICAL_INTERVIEW", name: "Technical Interview", stageType: "INTERVIEW", isScored: true, description: "Interview on technical competencies." },
  { key: "COMPETENCY_INTERVIEW", name: "Competency-Based Interview", stageType: "INTERVIEW", isScored: true, description: "Structured behavioural interview." },
  { key: "PANEL_INTERVIEW", name: "Panel Interview", stageType: "INTERVIEW", isScored: true, description: "Interview with a panel of managers." },
  { key: "EXECUTIVE_INTERVIEW", name: "Executive Interview", stageType: "INTERVIEW", isScored: true, description: "Final interview with senior leadership." },
  { key: "ASSESSMENT_CENTRE", name: "Assessment Centre", stageType: "ASSESSMENT_CENTRE", isScored: true, description: "Group exercises and case studies." },
  { key: "REFERENCE_CHECK", name: "Reference & Background Check", stageType: "REVIEW", isScored: false, description: "Verify references, qualifications and records." },
  { key: "FINAL_DECISION", name: "Final Decision", stageType: "DECISION", isScored: false, description: "Hiring panel selects the preferred candidate." },
  { key: "JOB_OFFER", name: "Job Offer", stageType: "OFFER", isScored: false, description: "Offer issued and negotiated." },
  { key: "HIRING_ONBOARDING", name: "Hiring & Onboarding", stageType: "ADMIN", isScored: false, description: "Contract, documents and onboarding tasks." },
]

export interface WorkflowPreset {
  id: string
  name: string
  description: string
  /** Band rank range; undefined = all bands. */
  minBandRank?: number
  maxBandRank?: number
  contractTypes: string[]
  isDefault?: boolean
  stageKeys: string[]
}

export const COMMON_WORKFLOWS: WorkflowPreset[] = [
  {
    id: "standard",
    name: "Standard hiring",
    description: "Default pipeline for most roles.",
    contractTypes: [],
    isDefault: true,
    stageKeys: ["CV_SCREENING", "HR_INTERVIEW", "TECHNICAL_INTERVIEW", "REFERENCE_CHECK", "FINAL_DECISION", "JOB_OFFER", "HIRING_ONBOARDING"],
  },
  {
    id: "senior",
    name: "Senior & management roles",
    description: "Adds a test, panel and executive interview.",
    minBandRank: 6,
    contractTypes: [],
    stageKeys: ["CV_SCREENING", "PHONE_SCREENING", "TECHNICAL_TEST", "PANEL_INTERVIEW", "EXECUTIVE_INTERVIEW", "REFERENCE_CHECK", "FINAL_DECISION", "JOB_OFFER", "HIRING_ONBOARDING"],
  },
  {
    id: "graduate",
    name: "Graduate trainees & interns",
    description: "Test and assessment centre for entry-level programmes.",
    contractTypes: ["GRADUATE_TRAINEE", "INTERN"],
    stageKeys: ["CV_SCREENING", "WRITTEN_TEST", "ASSESSMENT_CENTRE", "HR_INTERVIEW", "FINAL_DECISION", "JOB_OFFER", "HIRING_ONBOARDING"],
  },
  {
    id: "quick",
    name: "Quick hire (temporary)",
    description: "Short pipeline for temporary contracts.",
    contractTypes: ["TEMPORARY"],
    stageKeys: ["CV_SCREENING", "HR_INTERVIEW", "FINAL_DECISION", "JOB_OFFER", "HIRING_ONBOARDING"],
  },
]
