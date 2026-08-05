import { Heart, User, Users } from "lucide-react"

import type { EmployeeChild, EmployeeFamilyMember, EmployeeFamilyTree } from "@/lib/api/employees"
import { formatEnumLabel } from "@/lib/api/employees"
import { cn } from "@/lib/utils"

import styles from "./family-tree.module.css"

function age(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const diffMs = Date.now() - dob.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
}

function MemberCard({ member, roleLabel }: { member: EmployeeFamilyMember; roleLabel?: string }) {
  const memberAge = age(member.dateOfBirth)
  return (
    <div className={styles.card}>
      <p className="truncate text-xs font-semibold text-foreground">{member.name}</p>
      <p className="text-[10px] text-muted-foreground">
        {roleLabel ?? formatEnumLabel(member.relationship)}
        {member.gender ? ` · ${member.gender === "MALE" ? "Male" : "Female"}` : ""}
        {memberAge !== null ? ` · ${memberAge} yrs` : ""}
      </p>
      {member.occupation ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">{member.occupation}</p> : null}
      {member.contactNumber ? <p className="truncate text-[10px] text-muted-foreground/80">{member.contactNumber}</p> : null}
    </div>
  )
}

function ChildCard({ child }: { child: EmployeeChild }) {
  const childAge = age(child.dateOfBirth)
  return (
    <div className={styles.card}>
      <p className="truncate text-xs font-semibold text-foreground">{child.fullName}</p>
      <p className="text-[10px] text-muted-foreground">
        Child · {child.gender === "MALE" ? "Male" : "Female"}
        {childAge !== null ? ` · ${childAge} yrs` : ""}
      </p>
    </div>
  )
}

/** Employee's own card + spouse, paired as one "couple" unit — see the CSS
 *  module's comment for why a spouse isn't a connector-tree node. */
function EmployeeUnit({ tree }: { tree: EmployeeFamilyTree }) {
  const spouse = tree.spouse.primary
  return (
    <div className={styles.coupleUnit}>
      <div className={styles.employeeCard}>
        <div className="flex items-center gap-2">
          {tree.employee.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tree.employee.profilePictureUrl} alt="" className="size-7 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary/15">
              <User className="size-3.5 text-secondary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {tree.employee.firstName} {tree.employee.lastName}
            </p>
            <p className="text-[10px] text-muted-foreground">This employee</p>
          </div>
        </div>
      </div>

      {spouse || tree.spouse.additional.length > 0 ? (
        <>
          <div className={styles.marriedConnector} />
          <div className="flex flex-col gap-1.5">
            {spouse ? (
              <div className={styles.card}>
                <div className="flex items-center gap-1">
                  <Heart className="size-3 shrink-0 text-secondary" />
                  <p className="truncate text-xs font-semibold text-foreground">{spouse.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Spouse
                  {age(spouse.dateOfBirth) !== null ? ` · ${age(spouse.dateOfBirth)} yrs` : ""}
                </p>
                {spouse.phone ? <p className="truncate text-[10px] text-muted-foreground/80">{spouse.phone}</p> : null}
              </div>
            ) : null}
            {tree.spouse.additional.map((member) => (
              <MemberCard key={member.id} member={member} roleLabel="Spouse" />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * "Family Tree" — a read-only diagram covering both sources of family data
 * this app has (see EmployeeFamilyTree's doc comment): the Step 4
 * registration wizard's partner/children fields, and EmployeeFamilyMember
 * rows (parents/siblings/spouse/children/other — until now only ever
 * created via Bulk Import, with no page anywhere that displayed them back).
 *
 * Structure: Parents (if any) sit at the top; Siblings + the employee are
 * the row below (peers under the same parents); the employee's own card
 * pairs with their Spouse and nests a further row for their Children.
 * "Other" relationships (in-laws, guardians, etc.) don't fit a genealogical
 * slot, so they're listed separately below rather than forced into the tree.
 */
export function FamilyTree({ tree }: { tree: EmployeeFamilyTree }) {
  const children = [...tree.children.primary.map((c) => ({ kind: "primary" as const, child: c })), ...tree.children.additional.map((m) => ({ kind: "additional" as const, member: m }))]
  const hasChildren = children.length > 0
  const hasParents = tree.parents.length > 0
  const hasSiblings = tree.siblings.length > 0
  const hasAnyFamilyData = hasParents || hasSiblings || hasChildren || tree.spouse.primary || tree.spouse.additional.length > 0 || tree.other.length > 0

  if (!hasAnyFamilyData) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Users className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No family information on file yet.</p>
        <p className="text-xs text-muted-foreground/70">Add a partner/children above, or bulk-import Family Members.</p>
      </div>
    )
  }

  const childrenRow = hasChildren ? (
    <ul>
      {children.map((entry) =>
        entry.kind === "primary" ? (
          <li key={`child-${entry.child.id}`}>
            <ChildCard child={entry.child} />
          </li>
        ) : (
          <li key={`child-${entry.member.id}`}>
            <MemberCard member={entry.member} roleLabel="Child" />
          </li>
        )
      )}
    </ul>
  ) : null

  const employeeNode = (
    <li>
      <EmployeeUnit tree={tree} />
      {childrenRow}
    </li>
  )

  const siblingsAndEmployeeRow = (
    <ul>
      {tree.siblings.map((sibling) => (
        <li key={sibling.id}>
          <MemberCard member={sibling} roleLabel="Sibling" />
        </li>
      ))}
      {employeeNode}
    </ul>
  )

  return (
    <div className={styles.chart}>
      <ul className={cn(styles.tree, !hasParents && "items-start")}>
        {hasParents ? (
          <li>
            <div className="flex items-center gap-1.5">
              {tree.parents.map((parent) => (
                <MemberCard key={parent.id} member={parent} roleLabel="Parent" />
              ))}
            </div>
            {siblingsAndEmployeeRow}
          </li>
        ) : (
          <>
            {tree.siblings.map((sibling) => (
              <li key={sibling.id}>
                <MemberCard member={sibling} roleLabel="Sibling" />
              </li>
            ))}
            {employeeNode}
          </>
        )}
      </ul>

      {tree.other.length > 0 ? (
        <div className={styles.otherPanel}>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Other Family Members</p>
          <div className="flex flex-wrap gap-1.5">
            {tree.other.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
