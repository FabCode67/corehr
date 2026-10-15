import { redirect } from "next/navigation"

// Workforce plans were removed from the recruitment process — requisitions no
// longer need one. Old bookmarks land on the requisitions list.
export default function WorkforcePlansRemoved() {
  redirect("/admin/recruitment/requisitions")
}
