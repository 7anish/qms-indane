import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CheckSquare, ScrollText, Square } from "lucide-react"
import { termApi } from "@/api/term.api"
import Spinner from "@/components/ui/Spinner"

export default function TermsStep({ selectedIds, onChange }) {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    termApi
      .list({ limit: 100 })
      .then((res) => setTerms(res.data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Keep selection order: terms appear in the PDF in the order they were ticked
  const toggle = (id) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-gray-600">Loading terms…</span>
      </div>
    )
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>

  if (terms.length === 0) {
    return (
      <div className="text-center py-12">
        <ScrollText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">No terms & conditions yet</p>
        <p className="text-gray-500 text-sm mt-2">
          You can continue without terms, or{" "}
          <Link to="/terms/create" target="_blank" className="text-blue-600 hover:text-blue-700">
            add terms in a new tab
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Select the terms to include. They appear in the PDF in the order you tick them.</p>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{selectedIds.length} selected</span>
      </div>
      {terms.map((t) => {
        const order = selectedIds.indexOf(t._id)
        const isSelected = order !== -1
        const Icon = isSelected ? CheckSquare : Square
        return (
          <button
            key={t._id}
            type="button"
            onClick={() => toggle(t._id)}
            className={`w-full text-left rounded-xl border-2 transition-all cursor-pointer ${
              isSelected ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-orange-200"
            }`}
          >
            <div className="flex items-center gap-3 px-5 py-3">
              <Icon className={`w-5 h-5 shrink-0 ${isSelected ? "text-orange-600" : "text-gray-400"}`} />
              <span className="font-semibold text-gray-900 flex-1">{t.heading}</span>
              {isSelected && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">#{order + 1} in PDF</span>
              )}
              <span className="text-xs text-gray-500">{t.points.length} points</span>
            </div>
            <ol className="px-5 pb-4 pl-13 space-y-1 list-decimal list-inside text-sm text-gray-600">
              {t.points.slice(0, 3).map((p, i) => (
                <li key={i} className="truncate">
                  {p}
                </li>
              ))}
              {t.points.length > 3 && <li className="list-none text-xs text-gray-400">+ {t.points.length - 3} more</li>}
            </ol>
          </button>
        )
      })}
    </div>
  )
}
