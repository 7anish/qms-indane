import { Crown, Shield } from "lucide-react"
import { ROLES, ROLE_LABELS } from "@/utils/constants"

export function RoleBadge({ role }) {
  const isSuper = role === ROLES.SUPER_ADMIN
  const Icon = isSuper ? Crown : Shield
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isSuper ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      <Icon className="w-3 h-3" />
      {ROLE_LABELS[role] || role}
    </span>
  )
}

export function StatusBadge({ status }) {
  const active = status === "active"
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`}></span>
      {active ? "Active" : "Inactive"}
    </span>
  )
}
