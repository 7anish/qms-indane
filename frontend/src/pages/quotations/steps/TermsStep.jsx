import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CheckSquare, ChevronDown, ChevronRight, MinusSquare, ScrollText, Square } from "lucide-react"
import { termApi } from "@/api/term.api"
import Spinner from "@/components/ui/Spinner"

/**
 * Pick individual points from each Terms & Conditions entry.
 * `selected` is [{ termId, points: [point text] }]: terms in the order they were first ticked,
 * points in the term's own order. All picked points appear in the PDF as one numbered list.
 */
export default function TermsStep({ selected: selectedProp, onChange }) {
  // Tolerate missing/partial data (e.g. wizard state from before point selection existed)
  const selected = (Array.isArray(selectedProp) ? selectedProp : [])
    .filter((s) => s && s.termId)
    .map((s) => ({ termId: s.termId, points: Array.isArray(s.points) ? s.points : [] }))
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState({}) // termId -> expanded

  useEffect(() => {
    termApi
      .list({ limit: 100 })
      .then((res) => {
        const list = res.data.items
        setTerms(list)
        // Drop points that were removed or edited since they were selected (e.g. in a resumed draft)
        const byId = new Map(list.map((t) => [t._id, { ...t, points: t.points || [] }]))
        const cleaned = selected
          .filter((s) => byId.has(s.termId))
          .map((s) => ({ ...s, points: s.points.filter((p) => byId.get(s.termId).points.includes(p)) }))
          .filter((s) => s.points.length)
        if (JSON.stringify(cleaned) !== JSON.stringify(selectedProp)) onChange(cleaned)
        // Open the terms that already have points selected
        setOpen(Object.fromEntries(cleaned.map((s) => [s.termId, true])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pointsOf = (termId) => selected.find((s) => s.termId === termId)?.points || []

  // Set a term's selected points, keeping them in the term's order
  const setPoints = (term, points) => {
    const ordered = (term.points || []).filter((p) => points.includes(p))
    const exists = selected.some((s) => s.termId === term._id)
    if (!ordered.length) return onChange(selected.filter((s) => s.termId !== term._id))
    if (exists) return onChange(selected.map((s) => (s.termId === term._id ? { ...s, points: ordered } : s)))
    onChange([...selected, { termId: term._id, points: ordered }])
  }

  const togglePoint = (term, point) => {
    const current = pointsOf(term._id)
    setPoints(term, current.includes(point) ? current.filter((p) => p !== point) : [...current, point])
  }

  const toggleAll = (term) => {
    const all = pointsOf(term._id).length === term.points.length
    setPoints(term, all ? [] : term.points)
    if (!all) setOpen((o) => ({ ...o, [term._id]: true }))
  }

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

  // The final list, as it will appear in the PDF
  const termById = new Map(terms.map((t) => [t._id, t]))
  const finalPoints = selected.flatMap((s) => (termById.has(s.termId) ? s.points : []))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-3">
        <p className="text-sm text-gray-600">
          Open a heading and tick the points to include, or tick the heading to select all of its points.
        </p>
        {terms.map((t) => {
          const chosen = pointsOf(t._id)
          const all = chosen.length === t.points.length
          const some = chosen.length > 0 && !all
          const HeadIcon = all ? CheckSquare : some ? MinusSquare : Square
          const isOpen = Boolean(open[t._id])
          return (
            <div
              key={t._id}
              className={`rounded-xl border-2 transition-all ${
                chosen.length ? "border-orange-400 bg-orange-50/40" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleAll(t)}
                  title={all ? "Unselect all points" : "Select all points"}
                  className="cursor-pointer"
                >
                  <HeadIcon className={`w-5 h-5 ${chosen.length ? "text-orange-600" : "text-gray-400"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [t._id]: !isOpen }))}
                  className="flex-1 flex items-center gap-2 text-left cursor-pointer"
                >
                  <span className="font-semibold text-gray-900 flex-1">{t.heading}</span>
                  <span className="text-xs text-gray-500">
                    {chosen.length} / {t.points.length} selected
                  </span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
              {isOpen && (
                <ul className="px-4 pb-3 space-y-1">
                  {t.points.map((p, i) => {
                    const checked = chosen.includes(p)
                    const Icon = checked ? CheckSquare : Square
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => togglePoint(t, p)}
                          className={`w-full flex items-start gap-3 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            checked ? "bg-orange-100/60 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${checked ? "text-orange-600" : "text-gray-400"}`} />
                          <span>{p}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="lg:col-span-2">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Terms & Conditions</h3>
            <span className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs">
              {finalPoints.length} points
            </span>
          </div>
          {finalPoints.length === 0 ? (
            <p className="text-sm text-gray-500">No points selected. The quotation will have no terms & conditions.</p>
          ) : (
            <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-700 max-h-[60vh] overflow-y-auto">
              {finalPoints.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          )}
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
            This is how the points appear in the PDF, in one numbered list.
          </p>
        </div>
      </div>
    </div>
  )
}
