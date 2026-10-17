import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CheckSquare, Mail, Phone, Square, Users } from "lucide-react"
import { memberApi } from "@/api/company.api"
import Spinner from "@/components/ui/Spinner"

// onChange receives the selected employee records (not just ids) so later steps can show names/emails
export default function RecipientsStep({ company, selected, onChange }) {
  const selectedIds = selected.map((m) => m._id)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    memberApi
      .list(company._id, { limit: 100 })
      .then((res) => setMembers(res.data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [company._id])

  const toggle = (member) =>
    onChange(selectedIds.includes(member._id) ? selected.filter((m) => m._id !== member._id) : [...selected, member])

  const allSelected = members.length > 0 && members.every((m) => selectedIds.includes(m._id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-gray-600">Loading employees…</span>
      </div>
    )
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">{company.name} has no employees yet</p>
        <p className="text-gray-500 text-sm mt-2">
          At least one employee is needed to send the quotation.{" "}
          <Link to={`/companies/${company._id}`} target="_blank" className="text-blue-600 hover:text-blue-700">
            Add employees in a new tab
          </Link>
          , then come back to this step.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Select the employees of <b>{company.name}</b> who should receive this quotation by email.
        </p>
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : members)}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => {
          const isSelected = selectedIds.includes(m._id)
          const Icon = isSelected ? CheckSquare : Square
          return (
            <button
              key={m._id}
              type="button"
              onClick={() => toggle(m)}
              className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{m.name}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {m.designation}
                </span>
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" /> {m.email}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 shrink-0" /> {m.phone}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
