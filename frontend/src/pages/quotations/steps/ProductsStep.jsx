import { useEffect, useMemo, useState } from "react"
import { Package, Plus, Search, Trash2 } from "lucide-react"
import { productApi } from "@/api/product.api"
import Spinner from "@/components/ui/Spinner"
import { GST_MODE, calcLine } from "@/utils/quotationCalc"
import { formatPrice } from "@/utils/format"
import RateSheetTable from "../RateSheetTable"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const MAX_ITEMS = 20

function ProductPicker({ selectedIds, onAdd, disabled }) {
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      productApi
        .list({ search: search || undefined, status: "active", limit: 20 })
        .then((res) => setProducts(res.data.items))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Products</h3>
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search active products"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
          <span className="ml-3 text-sm text-gray-600">Loading…</span>
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No active products found</p>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {products.map((p) => {
            const added = selectedIds.includes(p._id)
            return (
              <div key={p._id} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  {p.image ? (
                    <img src={p.image.url} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.gasType} · {p.cylinderCapacityKg} kg · {formatPrice(p.currentPrice)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={added || disabled}
                  onClick={() => onAdd(p)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {added ? (
                    "Added"
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Add
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ProductsStep({ data, update }) {
  const { items, gstMode, gstRate, rateMonth, basicLabel, securityDeposit } = data

  const lines = useMemo(
    () =>
      items.map((it) => ({
        key: it.product._id,
        name: it.product.name,
        capacityKg: it.product.cylinderCapacityKg,
        ...calcLine(
          { basicPrice: it.basicPrice, discount: it.discount, capacityKg: it.product.cylinderCapacityKg },
          gstMode,
          gstRate
        ),
      })),
    [items, gstMode, gstRate]
  )

  const addProduct = (p) =>
    update({ items: [...items, { product: p, basicPrice: String(p.currentPrice), discount: "" }] })

  const updateItem = (id, patch) =>
    update({ items: items.map((it) => (it.product._id === id ? { ...it, ...patch } : it)) })

  const removeItem = (id) => update({ items: items.filter((it) => it.product._id !== id) })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductPicker selectedIds={items.map((i) => i.product._id)} onAdd={addProduct} disabled={items.length >= MAX_ITEMS} />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Quotation Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rates for the Month <span className="text-red-600">*</span>
              </label>
              <input type="month" value={rateMonth} onChange={(e) => update({ rateMonth: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Basic Price Label</label>
              <input
                value={basicLabel}
                onChange={(e) => update({ basicLabel: e.target.value })}
                maxLength={60}
                placeholder="e.g. BASIC BY IOCL"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { value: GST_MODE.EXCLUDED, label: "GST Excluded (added on top)" },
                { value: GST_MODE.INCLUDED, label: "GST Included in price" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ gstMode: opt.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    gstMode === opt.value ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Rate (%) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gstRate}
                onChange={(e) => update({ gstRate: e.target.value })}
                placeholder="e.g. 18"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit (₹) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={securityDeposit}
                onChange={(e) => update({ securityDeposit: e.target.value })}
                placeholder="e.g. 25000"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Selected Products</h3>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            {items.length} / {MAX_ITEMS}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No products added</p>
            <p className="text-gray-500 text-sm mt-2">Add one or more products from the list above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Product", "Basic Price (₹) *", "Discount (₹)", "Taxable", "GST", "Total", "Per Kg", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((it, idx) => {
                  const line = lines[idx]
                  const discountTooHigh = Number(it.discount) > Number(it.basicPrice)
                  return (
                    <tr key={it.product._id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{it.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {it.product.gasType} · {it.product.cylinderCapacityKg} kg · current {formatPrice(it.product.currentPrice)}
                        </p>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.basicPrice}
                          onChange={(e) => updateItem(it.product._id, { basicPrice: e.target.value })}
                          placeholder="e.g. 54454.66"
                          className={inputCls}
                        />
                      </td>
                      <td className="px-4 py-3 w-40">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.discount}
                          onChange={(e) => updateItem(it.product._id, { discount: e.target.value })}
                          placeholder="e.g. 5217.80"
                          className={`${inputCls} ${discountTooHigh ? "border-red-300 bg-red-50" : ""}`}
                        />
                        {discountTooHigh && <p className="mt-1 text-xs text-red-600">More than basic price</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatPrice(line.taxableValue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatPrice(line.gstAmount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatPrice(line.total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatPrice(line.landedCostPerKg)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(it.product._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Sheet</h3>
          <RateSheetTable lines={lines} rateMonth={rateMonth} basicLabel={basicLabel} gstMode={gstMode} gstRate={gstRate} />
        </div>
      )}
    </div>
  )
}
