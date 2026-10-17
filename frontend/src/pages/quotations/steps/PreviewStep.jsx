import { useCallback, useEffect, useState } from "react"
import { Building2, FileText, Mail, Package, RefreshCw, ScrollText, ShieldCheck } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import Spinner from "@/components/ui/Spinner"
import { formatPrice } from "@/utils/format"
import { GST_MODE, monthTitle } from "@/utils/quotationCalc"

function SummaryRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm text-gray-900">{children}</div>
      </div>
    </div>
  )
}

export default function PreviewStep({ data, payload }) {
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const generate = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const blob = await quotationApi.preview(payload)
      setPdfUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [payload])

  useEffect(() => {
    generate()
  }, [generate])

  useEffect(() => () => pdfUrl && URL.revokeObjectURL(pdfUrl), [pdfUrl])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 h-fit">
        <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
        <SummaryRow icon={Building2} label="Company">
          {data.company.name}
        </SummaryRow>
        <SummaryRow icon={Package} label={`Products · rates for ${monthTitle(data.rateMonth)}`}>
          <ul className="list-disc list-inside">
            {data.items.map((it) => (
              <li key={it.product._id}>{it.product.name}</li>
            ))}
          </ul>
        </SummaryRow>
        <SummaryRow icon={FileText} label="GST">
          {data.gstMode === GST_MODE.INCLUDED ? "Included in price" : "Excluded (added on top)"} @ {data.gstRate}%
        </SummaryRow>
        <SummaryRow icon={ShieldCheck} label="Security Deposit">
          {formatPrice(Number(data.securityDeposit))}
        </SummaryRow>
        <SummaryRow icon={ScrollText} label="Terms & Conditions">
          {data.termIds.length ? `${data.termIds.length} selected` : "None"}
        </SummaryRow>
        <SummaryRow icon={Mail} label="Send to">
          {data.recipients.map((r) => (
            <div key={r._id}>
              {r.name} <span className="text-gray-500">({r.email})</span>
            </div>
          ))}
        </SummaryRow>
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          The quotation number is assigned when you save. The preview shows "PREVIEW" in its place.
        </p>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">PDF Preview</h3>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg text-sm">{error}</div>
          ) : loading && !pdfUrl ? (
            <div className="flex items-center justify-center h-[70vh]">
              <Spinner size="lg" />
              <span className="ml-3 text-gray-600">Generating PDF…</span>
            </div>
          ) : (
            <iframe title="Quotation preview" src={pdfUrl} className="w-full h-[75vh] rounded-lg border border-gray-200" />
          )}
        </div>
      </div>
    </div>
  )
}
