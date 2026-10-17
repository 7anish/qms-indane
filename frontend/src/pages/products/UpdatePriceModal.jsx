import { useEffect, useState } from "react"
import { History, Save } from "lucide-react"
import { productApi } from "@/api/product.api"
import Modal from "@/components/ui/Modal"
import Spinner from "@/components/ui/Spinner"
import { formatPrice } from "@/utils/format"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

export default function UpdatePriceModal({ open, product, onClose, onUpdated }) {
  const [price, setPrice] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPrice("")
    setError("")
  }, [open])

  const newPrice = price === "" ? null : Number(price)
  const isValid = newPrice !== null && Number.isFinite(newPrice) && newPrice >= 0
  const isSame = isValid && newPrice === product.currentPrice
  const diff = isValid ? newPrice - product.currentPrice : 0
  const pct = isValid && product.currentPrice ? (diff / product.currentPrice) * 100 : null

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return setError("Enter a price of 0 or more")
    if (isSame) return setError("The new price is the same as the current price")

    setError("")
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("currentPrice", String(newPrice))
      const res = await productApi.update(product._id, fd)
      onUpdated(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Update Price" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Current Price</div>
          <div className="text-2xl font-bold text-gray-900">{formatPrice(product.currentPrice)}</div>
          <div className="text-xs text-gray-500">per {product.unit}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Price (₹) <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setError("")
            }}
            min="0"
            step="0.01"
            autoFocus
            placeholder={`e.g. ${product.currentPrice}`}
            className={inputCls}
          />
        </div>

        {isValid && !isSame && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              diff > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <History className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {formatPrice(product.currentPrice)} → <b>{formatPrice(newPrice)}</b> ({diff > 0 ? "+" : "−"}
              {formatPrice(Math.abs(diff))}
              {pct !== null && `, ${diff > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`}). The old price will be saved in the
              price history.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !isValid || isSame}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            Update Price
          </button>
        </div>
      </form>
    </Modal>
  )
}
