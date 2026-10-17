import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Mail, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from "lucide-react"
import { emailTemplateApi } from "@/api/emailTemplate.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { bodyExcerpt } from "@/utils/template"

// Show {{variables}} as highlighted chips in plain-text previews
export function HighlightVariables({ text }) {
  const parts = String(text || "").split(/({{\s*[a-zA-Z0-9_]+\s*}})/g)
  return parts.map((p, i) =>
    /^{{\s*[a-zA-Z0-9_]+\s*}}$/.test(p) ? (
      <span key={i} className="px-1 rounded bg-purple-100 text-purple-700 font-mono text-[0.85em]">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

export default function EmailTemplateList() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    emailTemplateApi
      .list({ limit: 100, search: search || undefined })
      .then((res) => {
        setItems(res.data.items)
        setTotal(res.data.meta.total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const remove = async (t) => {
    if (!window.confirm(`Delete the template "${t.name}"? Quotations using it will fall back to the built-in text.`)) return
    try {
      await emailTemplateApi.remove(t._id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const makeDefault = async (t) => {
    try {
      await emailTemplateApi.update(t._id, { isDefault: true })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Mail}
        title="Email Templates"
        subtitle="Reusable emails for sending quotations"
        color="purple"
        actions={
          <Link
            to="/email-templates/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        }
      />

      <Alert>{error}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm self-start">{total} templates</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or subject"
              className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={load}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-gray-600">Loading templates…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No email templates found</p>
          <p className="text-gray-500 text-sm mt-2">
            {search ? "Try a different search term." : "Create a template to reuse the same email for every quotation."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((t) => (
            <div key={t._id} className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{t.name}</h2>
                  {t.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      <Star className="w-3 h-3" /> Default
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {t.format === "html" ? "HTML" : "Text"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!t.isDefault && (
                    <button
                      onClick={() => makeDefault(t)}
                      className="p-2 text-gray-500 hover:text-purple-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Make default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    to={`/email-templates/${t._id}/edit`}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => remove(t)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-3 flex-1">
                <div>
                  <p className="text-xs text-gray-500">Subject</p>
                  <p className="text-sm font-medium text-gray-900">
                    <HighlightVariables text={t.subject} />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Body</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-5">
                    <HighlightVariables text={bodyExcerpt(t.body, t.format)} />
                  </p>
                </div>
                {(t.cc.length > 0 || t.bcc.length > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {t.cc.length > 0 && (
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">CC: {t.cc.join(", ")}</span>
                    )}
                    {t.bcc.length > 0 && (
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">BCC: {t.bcc.join(", ")}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
