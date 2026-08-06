import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
const fns = await prisma.function.findMany({
  include: { departments: { select: { id: true, name: true, isActive: true } } },
  orderBy: { name: "asc" },
})
for (const f of fns) {
  console.log(`${f.name} | active=${f.isActive} | id=${f.id} | depts=${f.departments.map(d=>d.name).join(", ")}`)
}
console.log("TOTAL:", fns.length)
await prisma.$disconnect()
