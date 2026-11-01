import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, CheckCircle, Circle, ImageOff, Store } from "lucide-react"
import { marketApi } from "@/api/market.api"
import Spinner from "@/components/ui/Spinner"
import { monthTitle } from "@/utils/quotationCalc"

export const RSP_GST = { WITH: "with", WITHOUT: "without" }

const OPTIONS = [
  { gst: RSP_GST.WITHOUT, label: "Without GST", field: "ratesWithoutGst" },
  { gst: RSP_GST.WITH, label: "With GST", field: "ratesWithGst" },
]

/**
 * Optionally attach a market's RSP (Retail Selling Price) rate image to the quotation email.
 * value: { enabled, marketId, gst }
 */
export default function RspAttachmentPicker({ value, onChange }) {
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!value.enabled || markets.length) return
    setLoading(true)
    marketApi
      .list({ limit: 100 })
      .then((res) => setMarkets(res.data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [value.enabled, markets.length])

  const market = markets.find((m) => m._id === value.marketId)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const selectMarket = (marketId) => {
    const m = markets.find((x) => x._id === marketId)
    // Keep the GST choice only if the new market has that image
    const keep = OPTIONS.find((o) => o.gst === value.gst)
    onChange({ ...value, marketId, gst: m && keep && m[keep.field] ? value.gst : "" })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="mt-1 w-4 h-4 accent-green-600 cursor-pointer"
        />
        <span>
          <span className="flex items-center gap-2 font-semibold text-gray-900">
            <Store className="w-4 h-4 text-green-600" />
            Attach RSP (Retail Selling Price)
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">Send a market's rates image with the quotation email</span>
        </span>
      </label>

      {value.enabled &&
        (loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Spinner size="sm" /> Loading markets…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : markets.length === 0 ? (
          <p className="text-sm text-gray-600">
            No markets yet.{" "}
            <Link to="/markets/create" target="_blank" className="text-blue-600 hover:text-blue-700">
              Add one in a new tab
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Market</label>
              <select
                value={value.marketId}
                onChange={(e) => selectMarket(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a market</option>
                {markets.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} · {monthTitle(m.ratesMonth)}
                  </option>
                ))}
              </select>
            </div>

            {market && (
              <>
                {market.ratesMonth !== currentMonth && (
                  <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-xs text-yellow-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    These are the {monthTitle(market.ratesMonth)} rates; this month's images have not been uploaded yet.
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Rates image</p>
                  <div className="grid grid-cols-2 gap-3">
                    {OPTIONS.map((o) => {
                      const file = market[o.field]
                      const active = value.gst === o.gst
                      const Icon = active ? CheckCircle : Circle
                      return (
                        <button
                          key={o.gst}
                          type="button"
                          disabled={!file}
                          onClick={() => onChange({ ...value, gst: o.gst })}
                          className={`text-left rounded-lg border-2 p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                            active ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-200"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 mb-2">
                            <Icon className={`w-4 h-4 ${active ? "text-green-600" : "text-gray-400"}`} />
                            {o.label}
                          </span>
                          {file ? (
                            <img src={file.url} alt={o.label} className="w-full h-24 object-contain rounded bg-gray-50" />
                          ) : (
                            <span className="w-full h-24 rounded bg-gray-50 flex flex-col items-center justify-center text-gray-400 text-xs">
                              <ImageOff className="w-5 h-5 mb-1" />
                              Not uploaded
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
    </div>
  )
}
