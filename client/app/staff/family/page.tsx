import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FamilyTree } from "@/components/family-tree/family-tree"
import { fetchEmployee, fetchEmployeeFamilyTree, type EmployeeFamilyMember } from "@/lib/api/employees"
import { getSession } from "@/lib/get-session"

import { PartnerForm } from "../../admin/employees/[id]/partner-form"
import { ChildrenSection } from "../../admin/employees/[id]/children-section"
import { addChild, addFamilyMember, removeChild, removeFamilyMember, updatePartner } from "./actions"
import { FamilyMembersSection } from "./family-members-section"

export default async function StaffFamilyPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [treeResult, employeeResult] = await Promise.all([
    fetchEmployeeFamilyTree(session.employeeId),
    fetchEmployee(session.employeeId),
  ])

  // Every relationship the visual tree groups separately (parents, siblings,
  // other, plus any spouse/child beyond the wizard's single-spouse/
  // EmployeeChild fields), flattened into one list for the generic
  // add/remove form below — see FamilyMembersSection's doc comment.
  const additionalFamilyMembers: EmployeeFamilyMember[] = treeResult.ok
    ? [...treeResult.data.parents, ...treeResult.data.siblings, ...treeResult.data.other, ...treeResult.data.spouse.additional, ...treeResult.data.children.additional]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Family &amp; Dependents</h1>
        <p className="text-sm text-muted-foreground">
          Spouse, children, parents, siblings, and other dependent information on file for you. Update it here any
          time — HR can see everything you add.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family Tree</CardTitle>
          <CardDescription>A diagram built from the records below.</CardDescription>
        </CardHeader>
        <CardContent>
          {!treeResult.ok ? <p className="text-sm text-destructive">{treeResult.error}</p> : <FamilyTree tree={treeResult.data} />}
        </CardContent>
      </Card>

      {employeeResult.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spouse</CardTitle>
          </CardHeader>
          <CardContent>
            <PartnerForm employee={employeeResult.data} action={updatePartner.bind(null, session.employeeId)} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Children</CardTitle>
        </CardHeader>
        <CardContent>
          <ChildrenSection
            children={employeeResult.ok ? employeeResult.data.children ?? [] : []}
            addAction={addChild.bind(null, session.employeeId)}
            onRemove={removeChild.bind(null, session.employeeId)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parents, Siblings &amp; Other Dependents</CardTitle>
        </CardHeader>
        <CardContent>
          <FamilyMembersSection
            familyMembers={additionalFamilyMembers}
            addAction={addFamilyMember.bind(null, session.employeeId)}
            onRemove={removeFamilyMember.bind(null, session.employeeId)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
