import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Building2, ChevronRight, FileSpreadsheet, Plus, RefreshCw, Search, Users } from "lucide-react"
import { companyApi } from "@/api/company.api"
import ImportExcelModal from "@/components/ui/ImportExcelModal"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { StatusBadge } from "@/components/ui/RoleBadge"

export default function CompanyList() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    companyApi
      .list({ page, limit: 10, search: search || undefined })
      .then((res) => {
        setItems(res.data.items)
        setMeta(res.data.meta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Building2}
        title="Companies"
        subtitle="Registered companies and their members"
        color="emerald"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel
            </button>
            <Link
              to="/companies/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </Link>
          </div>
        }
      />

      <Alert>{error}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm self-start">{meta.total} companies</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search name, GST, PAN"
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
            <span className="ml-3 text-gray-600">Loading companies…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No companies found</p>
            <p className="text-gray-500 text-sm mt-2">
              {search ? "Try a different search term." : "Add your first company to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Company", "GST Number", "PAN Number", "Members", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/companies/${c._id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{c.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{c.address}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{c.gstNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{c.panNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <Users className="w-3 h-3" />
                        {c.memberCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/companies/${c._id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Open
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
            <span className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg">
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

      <ImportExcelModal
        open={importOpen}
        title="Import Companies"
        description="Fill one row per company. Members are imported from each company's page, and documents can be added later from the Edit page."
        templateFileName="QMS-companies-template.xlsx"
        entityLabel="companies"
        downloadTemplate={companyApi.downloadTemplate}
        importFile={companyApi.importExcel}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  )
}
