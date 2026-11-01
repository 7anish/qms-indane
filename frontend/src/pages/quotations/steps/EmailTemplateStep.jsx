import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle, Circle, Mail, Star } from "lucide-react"
import { emailTemplateApi } from "@/api/emailTemplate.api"
import Spinner from "@/components/ui/Spinner"
import { HighlightVariables } from "@/pages/emailTemplates/EmailTemplateList"
import { bodyExcerpt } from "@/utils/template"

/**
 * Pick the email template used when this quotation is sent (it can still be changed in the send dialog).
 * A template is required. When none is selected yet, the default template (else the first) is pre-selected.
 */
export default function EmailTemplateStep({ selectedId, onChange, touched, onTouched }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    emailTemplateApi
      .list({ limit: 100 })
      .then((list) => {
        const items = list.data.items
        setTemplates(items)
        // Pre-select when nothing (or a since-deleted template) is selected
        const stillExists = items.some((t) => t._id === selectedId)
        if (!stillExists && items.length) onChange((items.find((t) => t.isDefault) || items[0])._id)
        else if (!stillExists && selectedId) onChange("")
        if (!touched) onTouched()
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-3 text-gray-600">Loading templates…</span>
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900">No email templates yet</p>
        <p className="text-gray-500 text-sm mt-2">
          A template is required to send the quotation.{" "}
          <Link to="/email-templates/create" target="_blank" className="text-blue-600 hover:text-blue-700">
            Create one in a new tab
          </Link>
          , then come back to this step.
        </p>
      </div>
    )
  }

  const options = templates

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Choose the email sent with this quotation. You can still change it, and add CC/BCC, when sending.
        </p>
        <Link to="/email-templates/create" target="_blank" className="text-sm text-blue-600 hover:text-blue-700 shrink-0">
          + New template
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {options.map((t) => {
          const isSelected = selectedId === t._id
          const Icon = isSelected ? CheckCircle : Circle
          return (
            <button
              key={t._id}
              type="button"
              onClick={() => onChange(t._id)}
              className={`text-left rounded-xl border-2 transition-all cursor-pointer ${
                isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200"
              }`}
            >
              <div className="flex items-center gap-2 px-5 pt-4">
                <Icon className={`w-5 h-5 shrink-0 ${isSelected ? "text-purple-600" : "text-gray-400"}`} />
                <span className="font-semibold text-gray-900 flex-1 truncate">{t.name}</span>
                {t.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <Star className="w-3 h-3" /> Default
                  </span>
                )}
                {t.format === "html" && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">HTML</span>
                )}
              </div>
              <div className="px-5 pb-4 pt-2 pl-12 space-y-1">
                <p className="text-sm font-medium text-gray-800">
                  <HighlightVariables text={t.subject} />
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">
                  <HighlightVariables text={bodyExcerpt(t.body, t.format)} />
                </p>
                {(t.cc.length > 0 || t.bcc.length > 0) && (
                  <p className="text-xs text-gray-500 pt-1">
                    {t.cc.length > 0 && `CC: ${t.cc.join(", ")}`}
                    {t.cc.length > 0 && t.bcc.length > 0 && " · "}
                    {t.bcc.length > 0 && `BCC: ${t.bcc.join(", ")}`}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
