import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, FileCheck, FileText, PencilLine, Plus, RefreshCw, Search, Send } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { formatDateTime } from "@/utils/format"
import { monthTitle } from "@/utils/quotationCalc"

const STATUS = {
  draft: { label: "Draft", icon: PencilLine, cls: "bg-yellow-100 text-yellow-800" },
  ready: { label: "Ready", icon: FileCheck, cls: "bg-blue-100 text-blue-800" },
  sent: { label: "Sent", icon: Send, cls: "bg-green-100 text-green-800" },
}

export function QuotationStatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  )
}

const filters = [
  { value: "", label: "All", active: "bg-gray-900 text-white", idle: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  { value: "draft", label: "Drafts", active: "bg-yellow-600 text-white", idle: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
  { value: "ready", label: "Ready", active: "bg-blue-600 text-white", idle: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
  { value: "sent", label: "Sent", active: "bg-green-600 text-white", idle: "bg-green-100 text-green-700 hover:bg-green-200" },
]

// Drafts open in the wizard so they can be continued
const linkFor = (q) => (q.status === "draft" ? `/quotations/${q._id}/edit` : `/quotations/${q._id}`)

const productNames = (q) =>
  q.status === "draft"
    ? (q.draft?.items || []).map((i) => i.product?.name).filter(Boolean).join(", ") || "—"
    : q.items.map((i) => i.name).join(", ")

export default function QuotationList() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    quotationApi
      .list({ page, limit: 10, search: search || undefined, status: status || undefined })
      .then((res) => {
        setItems(res.data.items)
        setMeta(res.data.meta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, search, status])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={FileText}
        title="Quotations"
        subtitle="Monthly rate quotations sent to companies"
        color="indigo"
        actions={
          <Link
            to="/quotations/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </Link>
        }
      />

      <Alert>{error}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatus(f.value)
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${status === f.value ? f.active : f.idle}`}
              >
                {f.label}
              </button>
            ))}
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{meta.total} quotations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search number, company, product"
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
            <span className="ml-3 text-gray-600">Loading quotations…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No quotations found</p>
            <p className="text-gray-500 text-sm mt-2">{search || status ? "Try a different filter or search term." : "Create your first quotation."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Quotation No", "Company", "Products", "Rates For", "Updated", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((q) => (
                  <tr key={q._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link to={linkFor(q)} className="text-sm font-semibold font-mono text-blue-700 hover:text-blue-800">
                        {q.quotationNumber || <span className="font-sans font-normal italic text-gray-500">Not numbered yet</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{q.companySnapshot.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{productNames(q)}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{monthTitle(q.rateMonth || q.draft?.rateMonth) || "—"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(q.updatedAt)}
                      {q.createdBy?.name && <div className="text-xs">by {q.createdBy.name}</div>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap"><QuotationStatusBadge status={q.status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        to={linkFor(q)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {q.status === "draft" ? "Continue" : "Open"}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
