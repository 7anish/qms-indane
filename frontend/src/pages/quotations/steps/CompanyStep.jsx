import { useEffect, useState } from "react"
import { Building2, CheckCircle, Search } from "lucide-react"
import { companyApi } from "@/api/company.api"
import Spinner from "@/components/ui/Spinner"

export default function CompanyStep({ selected, onSelect }) {
  const [search, setSearch] = useState("")
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      companyApi
        .list({ search: search || undefined, status: "active", limit: 30 })
        .then((res) => setCompanies(res.data.items))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company name, GST or PAN"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-gray-600">Loading companies…</span>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => {
            const isSelected = selected?._id === c._id
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => onSelect(c)}
                className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected ? "border-blue-600 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.gstNumber}</p>
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />}
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.address}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
