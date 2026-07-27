import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { PrismaModule } from "./prisma/prisma.module"
import { OrganizationModule } from "./modules/organization/organization.module"
import { BranchesModule } from "./modules/branches/branches.module"
import { EmployeesModule } from "./modules/employees/employees.module"
import { UploadsModule } from "./modules/uploads/uploads.module"
import { AuthModule } from "./modules/auth/auth.module"
import { LeavePolicyModule } from "./modules/leave/leave-policy/leave-policy.module"
import { LeaveTypesModule } from "./modules/leave/leave-types/leave-types.module"
import { LeaveBalancesModule } from "./modules/leave/leave-balances/leave-balances.module"
import { NotificationsModule } from "./modules/leave/notifications/notifications.module"
import { LeaveRequestsModule } from "./modules/leave/leave-requests/leave-requests.module"
import { LeaveAnalyticsModule } from "./modules/leave/leave-analytics/leave-analytics.module"
import { PerformanceAccessModule } from "./modules/performance/access/performance-access.module"
import { RatingScaleModule } from "./modules/performance/rating-scale/rating-scale.module"
import { ReviewPeriodsModule } from "./modules/performance/review-periods/review-periods.module"
import { ReviewsModule } from "./modules/performance/reviews/reviews.module"
import { PerformanceAnalyticsModule } from "./modules/performance/analytics/analytics.module"
import { LearningAccessModule } from "./modules/learning/access/learning-access.module"
import { InstitutionsModule } from "./modules/learning/institutions/institutions.module"
import { TrainingCategoriesModule } from "./modules/learning/training-categories/training-categories.module"
import { CoursesModule } from "./modules/learning/courses/courses.module"
import { AssignmentsModule } from "./modules/learning/assignments/assignments.module"
import { LearningAnalyticsModule } from "./modules/learning/analytics/analytics.module"
import { RecruitmentAccessModule } from "./modules/recruitment/access/recruitment-access.module"
import { WorkforcePlansModule } from "./modules/recruitment/workforce-plans/workforce-plans.module"
import { RequisitionsModule } from "./modules/recruitment/requisitions/requisitions.module"
import { JobDescriptionsModule } from "./modules/recruitment/job-descriptions/job-descriptions.module"
import { JobPostingsModule } from "./modules/recruitment/job-postings/job-postings.module"
import { CandidatesModule } from "./modules/recruitment/candidates/candidates.module"
import { ApplicationsModule } from "./modules/recruitment/applications/applications.module"
import { AssessmentsModule } from "./modules/recruitment/assessments/assessments.module"
import { InterviewsModule } from "./modules/recruitment/interviews/interviews.module"
import { BackgroundChecksModule } from "./modules/recruitment/background-checks/background-checks.module"
import { OffersModule } from "./modules/recruitment/offers/offers.module"
import { OnboardingModule } from "./modules/recruitment/onboarding/onboarding.module"
import { RecruitmentAnalyticsModule } from "./modules/recruitment/analytics/analytics.module"
import { FormsAccessModule } from "./modules/forms/access/forms-access.module"
import { FormCategoriesModule } from "./modules/forms/categories/form-categories.module"
import { FormTemplatesModule } from "./modules/forms/templates/form-templates.module"
import { FormInstancesModule } from "./modules/forms/instances/form-instances.module"
import { FormSignaturesModule } from "./modules/forms/signatures/form-signatures.module"
import { FormsAnalyticsModule } from "./modules/forms/analytics/forms-analytics.module"
import { FormPdfModule } from "./modules/forms/pdf/form-pdf.module"
import { EmployeeRelationsAccessModule } from "./modules/employee-relations/access/employee-relations-access.module"
import { SanctionTypesModule } from "./modules/employee-relations/sanction-types/sanction-types.module"
import { DisciplinaryCasesModule } from "./modules/employee-relations/cases/disciplinary-cases.module"
import { InvestigationsModule } from "./modules/employee-relations/investigations/investigations.module"
import { SanctionsModule } from "./modules/employee-relations/sanctions/sanctions.module"
import { GrievancesModule } from "./modules/employee-relations/grievances/grievances.module"
import { AppealsModule } from "./modules/employee-relations/appeals/appeals.module"
import { EmployeeRelationsAnalyticsModule } from "./modules/employee-relations/analytics/employee-relations-analytics.module"
import { CasePdfModule } from "./modules/employee-relations/pdf/case-pdf.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrganizationModule,
    BranchesModule,
    EmployeesModule,
    UploadsModule,
    AuthModule,
    LeavePolicyModule,
    LeaveTypesModule,
    LeaveBalancesModule,
    NotificationsModule,
    LeaveRequestsModule,
    LeaveAnalyticsModule,
    PerformanceAccessModule,
    RatingScaleModule,
    ReviewPeriodsModule,
    ReviewsModule,
    PerformanceAnalyticsModule,
    LearningAccessModule,
    InstitutionsModule,
    TrainingCategoriesModule,
    CoursesModule,
    AssignmentsModule,
    LearningAnalyticsModule,
    RecruitmentAccessModule,
    WorkforcePlansModule,
    RequisitionsModule,
    JobDescriptionsModule,
    JobPostingsModule,
    CandidatesModule,
    ApplicationsModule,
    AssessmentsModule,
    InterviewsModule,
    BackgroundChecksModule,
    OffersModule,
    OnboardingModule,
    RecruitmentAnalyticsModule,
    FormsAccessModule,
    FormCategoriesModule,
    FormTemplatesModule,
    FormInstancesModule,
    FormSignaturesModule,
    FormsAnalyticsModule,
    FormPdfModule,
    EmployeeRelationsAccessModule,
    SanctionTypesModule,
    DisciplinaryCasesModule,
    InvestigationsModule,
    SanctionsModule,
    GrievancesModule,
    AppealsModule,
    EmployeeRelationsAnalyticsModule,
    CasePdfModule,
  ],
})
export class AppModule {}
