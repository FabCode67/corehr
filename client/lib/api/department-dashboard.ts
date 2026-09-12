import { apiFetchSafe } from "./client"

export interface HeadedDepartment {
  id: string
  name: string
  code: string | null
}

export function fetchMyHeadedDepartments(actingEmployeeId: string) {
  return apiFetchSafe<HeadedDepartment[]>(`/department-dashboard/my-departments?actingEmployeeId=${actingEmployeeId}`)
}

export interface DepartmentDashboardSummary {
  department: {
    id: string
    name: string
    code: string | null
    functionName: string
    headOfDepartment: { employeeNumber: string; firstName: string; middleName: string | null; lastName: string } | null
  }
  headcount: {
    total: number
    byGender: { gender: string; count: number }[]
    byContractType: { contractType: string; count: number }[]
    vacantPositions: number
  }
  performance: {
    total: number
    completionRate: number
    averageRating: number | null
    byStatus: { status: string; count: number }[]
    ratingDistribution: { rating: number; count: number }[]
  }
  leave: {
    pendingApprovalCount: number
    totalDaysTakenThisYear: number
    currentlyOnLeaveCount: number
    byType: { leaveTypeName: string; count: number }[]
  }
  forms: {
    pendingCount: number
    overdueCount: number
    completedThisMonth: number
    byStatus: { status: string; count: number }[]
  }
}

export function fetchDepartmentDashboardSummary(departmentId: string, actingEmployeeId: string) {
  return apiFetchSafe<DepartmentDashboardSummary>(
    `/department-dashboard/${departmentId}/summary?actingEmployeeId=${actingEmployeeId}`
  )
}
