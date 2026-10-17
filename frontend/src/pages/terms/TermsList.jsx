import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Pencil, Plus, RefreshCw, ScrollText, Search, Trash2 } from "lucide-react"
import { termApi } from "@/api/term.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"

export default function TermsList() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    termApi
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

  const remove = async (term) => {
    if (!window.confirm(`Delete "${term.heading}"? This cannot be undone.`)) return
    try {
      await termApi.remove(term._id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Terms & Conditions"
        subtitle="Manage terms & conditions headings and their points"
        color="orange"
        actions={
          <Link
            to="/terms/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Terms
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
              placeholder="Search heading or points"
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
          <span className="ml-3 text-gray-600">Loading terms…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <ScrollText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No terms & conditions found</p>
          <p className="text-gray-500 text-sm mt-2">
            {search ? "Try a different search term." : "Add your first terms & conditions."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((term) => (
            <div key={term._id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-xl flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900">{term.heading}</h2>
                  <p className="text-xs text-gray-500">
                    {term.points.length} point{term.points.length === 1 ? "" : "s"} · Updated{" "}
                    {new Date(term.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    to={`/terms/${term._id}/edit`}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => remove(term)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ol className="p-6 space-y-2">
                {term.points.map((point, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-medium flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 whitespace-pre-line">{point}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
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
          <span className="px-3 py-2 text-sm bg-orange-600 text-white rounded-lg">
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
