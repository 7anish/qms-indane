import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { History, Info, Save, Store } from "lucide-react"
import { marketApi } from "@/api/market.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import FileField from "@/components/ui/FileField"
import { ACCEPT } from "@/utils/constants"
import { formatDateTime } from "@/utils/format"
import { monthTitle } from "@/utils/quotationCalc"
import { RateImage } from "./MarketList"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const errorInputCls = "border-red-300 bg-red-50"

const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function MarketForm() {
  const { marketId } = useParams()
  const isEdit = Boolean(marketId)
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [ratesMonth, setRatesMonth] = useState(currentMonth())
  const [market, setMarket] = useState(null) // saved record (edit only)
  const [withGst, setWithGst] = useState(null) // newly picked files
  const [withoutGst, setWithoutGst] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    marketApi
      .get(marketId)
      .then((res) => {
        setMarket(res.data)
        setTitle(res.data.title)
        setRatesMonth(res.data.ratesMonth)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [marketId, isEdit])

  const newMonth = isEdit && market && ratesMonth !== market.ratesMonth
  const hasNewImage = Boolean(withGst || withoutGst)

  const validate = () => {
    const errs = {}
    if (!title.trim()) errs.title = "Title is required"
    if (!ratesMonth) errs.ratesMonth = "Select the month of the rates"
    // A new month needs fresh images, otherwise last month's rates would be labelled as this month's
    if (newMonth && !hasNewImage) errs.images = `Upload the ${monthTitle(ratesMonth)} rate images`
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    const fd = new FormData()
    fd.append("title", title.trim())
    fd.append("ratesMonth", ratesMonth)
    if (withGst) fd.append("ratesWithGst", withGst)
    if (withoutGst) fd.append("ratesWithoutGst", withoutGst)

    setSubmitting(true)
    try {
      if (isEdit) await marketApi.update(marketId, fd)
      else await marketApi.create(fd)
      navigate("/markets")
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading market…</span>
      </div>
    )
  }

  // While a new month is being set up, the old images are not shown as the current ones
  const existing = (field) => (newMonth ? null : market?.[field])
  const history = [...(market?.previousRates || [])].reverse()

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Store}
        title={isEdit ? "Edit Market" : "Add Market"}
        subtitle={isEdit ? "Change the title or upload this month's rate images" : "Add a market and its RSP rate images"}
        color="green"
      />

      <Alert>{error}</Alert>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setFieldErrors((f) => ({ ...f, title: undefined }))
                }}
                maxLength={100}
                placeholder="e.g. Bhiwadi Market"
                className={`${inputCls} ${fieldErrors.title ? errorInputCls : ""}`}
              />
              {fieldErrors.title && <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rates for the Month <span className="text-red-600">*</span>
              </label>
              <input
                type="month"
                value={ratesMonth}
                onChange={(e) => {
                  setRatesMonth(e.target.value)
                  setFieldErrors((f) => ({ ...f, ratesMonth: undefined, images: undefined }))
                }}
                className={`${inputCls} ${fieldErrors.ratesMonth ? errorInputCls : ""}`}
              />
              {fieldErrors.ratesMonth && <p className="mt-1 text-sm text-red-600">{fieldErrors.ratesMonth}</p>}
            </div>
          </div>

          {newMonth && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                New month: upload the {monthTitle(ratesMonth)} rate images. The {monthTitle(market.ratesMonth)} images are kept
                in the history below. An image you don't upload for the new month is left empty.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileField
              label="Rates image without GST"
              accept={ACCEPT.IMAGE}
              hint="JPG / PNG / WEBP, up to 5 MB"
              existing={existing("ratesWithoutGst")}
              file={withoutGst}
              onSelect={(f) => {
                setWithoutGst(f)
                setFieldErrors((e) => ({ ...e, images: undefined }))
              }}
              onError={setError}
            />
            <FileField
              label="Rates image with GST"
              accept={ACCEPT.IMAGE}
              hint="JPG / PNG / WEBP, up to 5 MB"
              existing={existing("ratesWithGst")}
              file={withGst}
              onSelect={(f) => {
                setWithGst(f)
                setFieldErrors((e) => ({ ...e, images: undefined }))
              }}
              onError={setError}
            />
          </div>
          {fieldErrors.images && <p className="text-sm text-red-600">{fieldErrors.images}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Add Market"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/markets")}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>

      {isEdit && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Previous Months</h2>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              No previous months yet. When you upload images for a new month, the old ones are kept here.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {history.map((h, i) => (
                <div key={i} className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-gray-900">{h.ratesMonth ? monthTitle(h.ratesMonth) : "—"}</p>
                    <p className="text-xs text-gray-500">
                      Replaced {formatDateTime(h.replacedOn)}
                      {h.replacedBy?.name && ` by ${h.replacedBy.name}`}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-2xl">
                    <RateImage label="Without GST" file={h.ratesWithoutGst} />
                    <RateImage label="With GST" file={h.ratesWithGst} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
