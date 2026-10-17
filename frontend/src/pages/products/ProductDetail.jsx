import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, History, IndianRupee, Package, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react"
import { productApi } from "@/api/product.api"
import { useAuth } from "@/context/AuthContext"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { StatusBadge } from "@/components/ui/RoleBadge"
import { formatDateTime, formatPrice } from "@/utils/format"
import UpdatePriceModal from "./UpdatePriceModal"

function InfoItem({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  )
}

function PriceChange({ oldPrice, newPrice }) {
  const diff = newPrice - oldPrice
  const pct = oldPrice ? (diff / oldPrice) * 100 : null
  const up = diff > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        up ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? "+" : "−"}
      {formatPrice(Math.abs(diff))}
      {pct !== null && ` (${up ? "+" : "−"}${Math.abs(pct).toFixed(1)}%)`}
    </span>
  )
}

export default function ProductDetail() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [priceOpen, setPriceOpen] = useState(false)

  useEffect(() => {
    productApi
      .get(productId)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productId])

  const remove = async () => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return
    try {
      await productApi.remove(productId)
      navigate("/products", { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading product…</span>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6 space-y-6">
        <Alert>{error || "Product not found"}</Alert>
        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back to products
        </Link>
      </div>
    )
  }

  const history = [...product.previousPrices].reverse() // newest first

  return (
    <div className="p-6 space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All products
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-gray-600 font-mono text-sm">{product.sku || "No SKU"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/products/${productId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          {isSuperAdmin && (
            <button
              onClick={remove}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {product.image ? (
            <a href={product.image.url} target="_blank" rel="noreferrer">
              <img src={product.image.url} alt={product.name} className="w-full aspect-square object-contain rounded-lg bg-gray-50 border border-gray-200" />
            </a>
          ) : (
            <div className="w-full aspect-square rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
              <Package className="w-16 h-16 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No image</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Current Price</p>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(product.currentPrice)}</p>
              <p className="text-sm text-gray-500">per {product.unit}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Price changes</p>
                <p className="text-2xl font-bold text-blue-600">{product.previousPrices.length}</p>
              </div>
              <button
                onClick={() => {
                  setSuccess("")
                  setPriceOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <IndianRupee className="w-4 h-4" />
                Update Price
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <InfoItem label="Gas Type" value={product.gasType} />
              <InfoItem label="Cylinder Capacity" value={`${product.cylinderCapacityKg} kg`} />
              <InfoItem label="Unit" value={product.unit} />
              <InfoItem label="SKU" value={product.sku} mono />
            </div>
            <InfoItem label="Description" value={product.description} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Price History</h2>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No price changes yet</p>
            <p className="text-gray-500 text-sm mt-2">Every time the price is edited, the old and new price are recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Changed On", "Old Price", "New Price", "Change", "Changed By"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(h.changedOn)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 line-through">{formatPrice(h.oldPrice)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatPrice(h.newPrice)}</td>
                    <td className="px-4 py-4 whitespace-nowrap"><PriceChange oldPrice={h.oldPrice} newPrice={h.newPrice} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{h.changedBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UpdatePriceModal
        open={priceOpen}
        product={product}
        onClose={() => setPriceOpen(false)}
        onUpdated={(updated) => {
          setSuccess(`Price updated from ${formatPrice(product.currentPrice)} to ${formatPrice(updated.currentPrice)}`)
          setProduct(updated)
          setPriceOpen(false)
        }}
      />
    </div>
  )
}
