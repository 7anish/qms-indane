import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, FileSpreadsheet, Package, Plus, RefreshCw, Search } from "lucide-react"
import { productApi } from "@/api/product.api"
import PageHeader from "@/components/ui/PageHeader"
import ImportExcelModal from "@/components/ui/ImportExcelModal"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { StatusBadge } from "@/components/ui/RoleBadge"
import { formatPrice } from "@/utils/format"

const filters = [
  { value: "", label: "All", active: "bg-gray-900 text-white", idle: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  { value: "active", label: "Active", active: "bg-green-600 text-white", idle: "bg-green-100 text-green-700 hover:bg-green-200" },
  { value: "inactive", label: "Inactive", active: "bg-red-600 text-white", idle: "bg-red-100 text-red-700 hover:bg-red-200" },
]

export default function ProductList() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    productApi
      .list({ page, limit: 10, status: status || undefined, search: search || undefined })
      .then((res) => {
        setItems(res.data.items)
        setMeta(res.data.meta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, status, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="Gas cylinders, pricing and price history"
        color="blue"
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
              to="/products/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  status === f.value ? f.active : f.idle
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{meta.total} products</span>
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
                placeholder="Search name, SKU, gas type"
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
            <span className="ml-3 text-gray-600">Loading products…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No products found</p>
            <p className="text-gray-500 text-sm mt-2">
              {search || status ? "Try a different filter or search term." : "Add your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Product", "Gas Type", "Capacity", "Unit", "Current Price", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/products/${p._id}`} className="flex items-center gap-3 group">
                        {p.image ? (
                          <img src={p.image.url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{p.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{p.sku || "No SKU"}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.gasType}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{p.cylinderCapacityKg} kg</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{p.unit}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatPrice(p.currentPrice)}</td>
                    <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/products/${p._id}`}
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
            <span className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">
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
        title="Import Products"
        description="Fill one row per product. Status can be Active or Inactive (left empty = Active). Product images can be added later from each product's Edit page."
        templateFileName="QMS-products-template.xlsx"
        entityLabel="products"
        downloadTemplate={productApi.downloadTemplate}
        importFile={productApi.importExcel}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </div>
  )
}
