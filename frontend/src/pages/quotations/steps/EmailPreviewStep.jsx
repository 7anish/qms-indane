import { useCallback, useEffect, useState } from "react"
import { CheckCircle, Info, Mail, Maximize2, Paperclip, RefreshCw, Users } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import Spinner from "@/components/ui/Spinner"
import EmailPreviewModal from "@/components/ui/EmailPreviewModal"
import { previewDocument } from "@/utils/template"

/**
 * Last wizard step: every recipient and the exact email they will get (rendered by the backend
 * from the unsaved wizard data and the chosen template). Nothing is sent here.
 */
export default function EmailPreviewStep({ payload }) {
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [fullscreen, setFullscreen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await quotationApi.previewEmails(payload)
      setPreview(res.data)
      setSelected((i) => Math.min(i, res.data.emails.length - 1))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [payload])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !preview) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Preparing email previews…</span>
      </div>
    )
  }
  if (error) return <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg text-sm">{error}</div>
  if (!preview) return null

  const email = preview.emails[selected]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Each recipient gets their <b>own email</b>. Nothing is sent yet: create the quotation, then use <b>Send Email</b> on its
          page (where you can still change the template, message and CC/BCC). The number <b>{preview.quotationNumber}</b> is the next
          one available; the final number is assigned when you create the quotation.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Email</h3>
            </div>
            <div className="text-sm">
              <p className="text-xs text-gray-500">Template</p>
              <p className="text-gray-900">
                {preview.templateName}{" "}
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {preview.format === "html" ? "HTML" : "Text"}
                </span>
              </p>
            </div>
            <div className="text-sm">
              <p className="text-xs text-gray-500">CC</p>
              <p className="text-gray-900 break-words">{preview.cc.length ? preview.cc.join(", ") : "—"}</p>
            </div>
            <div className="text-sm">
              <p className="text-xs text-gray-500">BCC</p>
              <p className="text-gray-900 break-words">{preview.bcc.length ? preview.bcc.join(", ") : "—"}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Paperclip className="w-4 h-4 text-gray-500" />
              {preview.attachment}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">Recipients</h3>
              </div>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                {preview.emails.length} email{preview.emails.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {preview.emails.map((e, i) => {
                const active = i === selected
                return (
                  <button
                    key={e.email}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      active ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                      {e.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{e.name}</p>
                      <p className="text-xs text-gray-500 truncate">{e.email}</p>
                      {e.designation && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {e.designation}
                        </span>
                      )}
                    </div>
                    {active && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-1" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-semibold text-gray-900 break-words">{email.subject}</h3>
              <p className="text-sm text-gray-600">
                <span className="text-gray-500">To:</span> {email.name} &lt;{email.email}&gt;
              </p>
              {preview.cc.length > 0 && (
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">CC:</span> {preview.cc.join(", ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                Full screen
              </button>
            </div>
          </div>
          {/* sandbox without allow-scripts: previewed HTML can never run code */}
          <iframe title={`Email to ${email.name}`} sandbox="" srcDoc={previewDocument(email.html)} className="w-full flex-1 min-h-[60vh] rounded-b-xl" />
        </div>
      </div>

      <EmailPreviewModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        subject={email.subject}
        html={email.html}
        to={`${email.name} <${email.email}>`}
        cc={preview.cc}
        bcc={preview.bcc}
        attachments={[preview.attachment]}
        recipients={preview.emails}
        selectedRecipient={email}
        onSelectRecipient={(r) => setSelected(preview.emails.findIndex((e) => e.email === r.email))}
        note="Preview - nothing is sent until you use Send Email on the quotation"
      />
    </div>
  )
}
