import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowDown, ArrowUp, Plus, Save, ScrollText, Trash2 } from "lucide-react"
import { termApi } from "@/api/term.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const errorInputCls = "border-red-300 bg-red-50"
const MAX_POINTS = 100

export default function TermForm() {
  const { termId } = useParams()
  const isEdit = Boolean(termId)
  const navigate = useNavigate()

  const [heading, setHeading] = useState("")
  const [points, setPoints] = useState([""])
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const pointRefs = useRef([])
  const focusIndex = useRef(null)

  useEffect(() => {
    if (!isEdit) return
    termApi
      .get(termId)
      .then((res) => {
        setHeading(res.data.heading)
        setPoints(res.data.points.length ? res.data.points : [""])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [termId, isEdit])

  // Focus a newly added point once it renders
  useEffect(() => {
    if (focusIndex.current === null) return
    pointRefs.current[focusIndex.current]?.focus()
    focusIndex.current = null
  }, [points.length])

  const updatePoint = (i, value) => {
    setPoints((ps) => ps.map((p, idx) => (idx === i ? value : p)))
    setFieldErrors((fe) => ({ ...fe, points: undefined }))
  }

  const addPoint = (afterIndex = points.length - 1) => {
    if (points.length >= MAX_POINTS) return
    focusIndex.current = afterIndex + 1
    setPoints((ps) => [...ps.slice(0, afterIndex + 1), "", ...ps.slice(afterIndex + 1)])
  }

  const removePoint = (i) => setPoints((ps) => (ps.length === 1 ? [""] : ps.filter((_, idx) => idx !== i)))

  const movePoint = (i, dir) =>
    setPoints((ps) => {
      const j = i + dir
      if (j < 0 || j >= ps.length) return ps
      const next = [...ps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const cleanPoints = points.map((p) => p.trim()).filter(Boolean)
    const errs = {}
    if (!heading.trim()) errs.heading = "Heading is required"
    if (!cleanPoints.length) errs.points = "Add at least one point"
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    try {
      const payload = { heading: heading.trim(), points: cleanPoints }
      if (isEdit) await termApi.update(termId, payload)
      else await termApi.create(payload)
      navigate("/terms")
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading…</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={ScrollText}
        title={isEdit ? "Edit Terms & Conditions" : "Add Terms & Conditions"}
        subtitle="A heading with one or more points"
        color="orange"
      />

      <Alert>{error}</Alert>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading <span className="text-red-600">*</span>
            </label>
            <input
              value={heading}
              onChange={(e) => {
                setHeading(e.target.value)
                setFieldErrors((fe) => ({ ...fe, heading: undefined }))
              }}
              maxLength={200}
              placeholder="e.g. Payment Terms"
              className={`${inputCls} ${fieldErrors.heading ? errorInputCls : ""}`}
            />
            {fieldErrors.heading && <p className="mt-1 text-sm text-red-600">{fieldErrors.heading}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Terms & Conditions Points <span className="text-red-600">*</span>
              </label>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                {points.length} / {MAX_POINTS}
              </span>
            </div>

            <div className="space-y-3">
              {points.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-medium flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <textarea
                    ref={(el) => (pointRefs.current[i] = el)}
                    value={point}
                    onChange={(e) => updatePoint(i, e.target.value)}
                    onKeyDown={(e) => {
                      // Ctrl/Cmd + Enter adds a new point below
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        addPoint(i)
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder={`Point ${i + 1}`}
                    className={`${inputCls} ${fieldErrors.points && !point.trim() ? errorInputCls : ""}`}
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => movePoint(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePoint(i, 1)}
                      disabled={i === points.length - 1}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePoint(i)}
                    className="mt-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove point"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {fieldErrors.points && <p className="mt-2 text-sm text-red-600">{fieldErrors.points}</p>}

            <button
              type="button"
              onClick={() => addPoint()}
              disabled={points.length >= MAX_POINTS}
              className="mt-4 flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Point
            </button>
            <p className="text-xs text-gray-500 mt-2">Tip: press Ctrl + Enter inside a point to add the next one. Empty points are ignored.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Save Terms"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/terms")}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
