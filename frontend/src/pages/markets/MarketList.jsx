import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ImageOff, Pencil, Plus, RefreshCw, Search, Store, Trash2 } from "lucide-react"
import { marketApi } from "@/api/market.api"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { monthTitle } from "@/utils/quotationCalc"

const currentMonth = () => new Date().toISOString().slice(0, 7)

// One rate image tile (opens full size in a new tab)
export function RateImage({ label, file }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      {file ? (
        <a href={file.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={file.url}
            alt={label}
            className="w-full h-40 object-contain rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-400 transition-colors"
          />
        </a>
      ) : (
        <div className="w-full h-40 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
          <ImageOff className="w-6 h-6 mb-1" />
          <span className="text-xs">Not uploaded</span>
        </div>
      )}
    </div>
  )
}

export default function MarketList() {
  const { isSuperAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    marketApi
      .list({ page, limit: 12, search: search || undefined })
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

  const remove = async (market) => {
    if (!window.confirm(`Delete "${market.title}" and all its rate images? Quotations keep their own copy.`)) return
    try {
      await marketApi.remove(market._id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Store}
        title="Markets"
        subtitle="RSP (Retail Selling Price) rate images per market, updated every month"
        color="green"
        actions={
          <Link
            to="/markets/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Market
          </Link>
        }
      />

      <Alert>{error}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm self-start">{meta.total} total</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search market"
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
          <span className="ml-3 text-gray-600">Loading markets…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No markets found</p>
          <p className="text-gray-500 text-sm mt-2">{search ? "Try a different search term." : "Add your first market."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((m) => {
            const outdated = m.ratesMonth !== currentMonth()
            return (
              <div key={m._id} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{m.title}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      Rates for {monthTitle(m.ratesMonth)}
                      {outdated && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not updated this month
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/markets/${m._id}/edit`}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                      title="Edit / update rates"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    {isSuperAdmin && (
                      <button
                        onClick={() => remove(m)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <RateImage label="Rates without GST" file={m.ratesWithoutGst} />
                  <RateImage label="Rates with GST" file={m.ratesWithGst} />
                </div>
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
          <span className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg">
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
