import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Building2, ChevronDown, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { formatDateTime } from "@/utils/format"
import { monthTitle } from "@/utils/quotationCalc"
import { QuotationStatusBadge } from "./QuotationList"

// Drafts open in the wizard so they can be continued
const linkFor = (q) => (q.status === "draft" ? `/quotations/${q._id}/edit` : `/quotations/${q._id}`)

const productNames = (q) =>
  q.status === "draft"
    ? (q.draft?.items || []).map((i) => i.product?.name).filter(Boolean).join(", ") || "—"
    : q.items.map((i) => i.name).join(", ")

const countChips = [
  { key: "draft", label: "Draft", cls: "bg-yellow-100 text-yellow-800" },
  { key: "ready", label: "Ready", cls: "bg-blue-100 text-blue-800" },
  { key: "sent", label: "Sent", cls: "bg-green-100 text-green-800" },
]

// The dropdown body: this company's quotations, loaded when the row is first opened
function CompanyQuotationList({ company }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    quotationApi
      .list({ company: company._id, limit: 100 })
      .then((res) => setItems(res.data.items))
      .catch((err) => setError(err.message))
  }, [company._id])

  if (error) return <p className="px-6 py-4 text-sm text-red-600">{error}</p>
  if (!items) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
        <span className="ml-3 text-sm text-gray-600">Loading quotations…</span>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50/60">
      {items.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No quotations for {company.name} yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {["Quotation No", "Products", "Rates For", "Recipients", "Updated", "Status", ""].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((q) => (
                <tr key={q._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap">
                    <Link to={linkFor(q)} className="text-sm font-semibold font-mono text-blue-700 hover:text-blue-800">
                      {q.quotationNumber || <span className="font-sans font-normal italic text-gray-500">Not numbered yet</span>}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-xs">
                    <span className="line-clamp-2">{productNames(q)}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                    {monthTitle(q.rateMonth || q.draft?.rateMonth) || "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {q.status === "draft" ? "—" : q.recipients.map((r) => r.name).join(", ")}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{formatDateTime(q.updatedAt)}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <QuotationStatusBadge status={q.status} />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right">
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
      <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
        <Link
          to={`/quotations/create?companyId=${company._id}`}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New quotation for {company.name}
        </Link>
      </div>
    </div>
  )
}

export default function CompanyQuotations() {
  const [companies, setCompanies] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState("")
  const [withQuotations, setWithQuotations] = useState(false)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState({}) // companyId -> expanded
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    quotationApi
      .companySummaries({ page, limit: 20, search: search || undefined, withQuotations: withQuotations || undefined })
      .then((res) => {
        setCompanies(res.data.items)
        setMeta(res.data.meta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, search, withQuotations])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))
  const allOpen = companies.length > 0 && companies.every((c) => open[c._id])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Building2}
        title="Company Quotations"
        subtitle="Every company with its quotations - click a company to see them"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setWithQuotations(false)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              !withQuotations ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All companies
          </button>
          <button
            onClick={() => {
              setWithQuotations(true)
              setPage(1)
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              withQuotations ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            }`}
          >
            With quotations
          </button>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            {meta.total} {meta.total === 1 ? "company" : "companies"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(allOpen ? {} : Object.fromEntries(companies.map((c) => [c._id, true])))}
            disabled={!companies.length}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search company name or GST"
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

      {loading && !companies.length ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-gray-600">Loading companies…</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No companies found</p>
          <p className="text-gray-500 text-sm mt-2">
            {search || withQuotations ? "Try a different filter or search term." : "Add a company to start quoting."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => {
            const isOpen = Boolean(open[c._id])
            return (
              <div key={c._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(c._id)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isOpen ? (
                      <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                    )}
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.gstNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap md:justify-end">
                    {countChips
                      .filter((chip) => c.counts[chip.key] > 0)
                      .map((chip) => (
                        <span key={chip.key} className={`px-2 py-1 rounded-full text-xs font-medium ${chip.cls}`}>
                          {c.counts[chip.key]} {chip.label}
                        </span>
                      ))}
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm tabular-nums">
                      {c.totalQuotations} quotation{c.totalQuotations === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 md:w-56 md:text-right whitespace-nowrap">
                    {c.lastActivity ? `Last activity ${formatDateTime(c.lastActivity)}` : "No quotations yet"}
                  </div>
                </button>

                {isOpen && <CompanyQuotationList company={c} />}
              </div>
            )
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
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
  )
}
