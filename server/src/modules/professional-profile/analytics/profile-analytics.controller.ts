import { Controller, Get } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"

import { ProfileAnalyticsService } from "./profile-analytics.service"

@ApiTags("Professional Profile / Analytics")
@Controller("profile-analytics")
export class ProfileAnalyticsController {
  constructor(private readonly analyticsService: ProfileAnalyticsService) {}

  @Get("education-by-level")
  educationByLevel() {
    return this.analyticsService.educationByLevel()
  }

  @Get("education-by-institution")
  educationByInstitution() {
    return this.analyticsService.educationByInstitution()
  }

  @Get("education-by-field")
  educationByField() {
    return this.analyticsService.educationByField()
  }

  @Get("skills-most-common")
  mostCommonSkills() {
    return this.analyticsService.mostCommonSkills()
  }

  @Get("skills-by-department")
  skillsByDepartment() {
    return this.analyticsService.skillsByDepartment()
  }

  @Get("skills-available-expertise")
  availableExpertise() {
    return this.analyticsService.availableExpertise()
  }

  @Get("certifications-summary")
  certificationSummary() {
    return this.analyticsService.certificationSummary()
  }

  @Get("certifications-by-department")
  certificationsByDepartment() {
    return this.analyticsService.certificationsByDepartment()
  }
}
