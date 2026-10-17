import { useEffect, useState } from "react"
import { AlertTriangle, FlaskConical, Maximize2, Paperclip, Send } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import { emailTemplateApi } from "@/api/emailTemplate.api"
import Modal from "@/components/ui/Modal"
import Spinner from "@/components/ui/Spinner"
import EmailChipsInput from "@/components/ui/EmailChipsInput"
import HtmlEmailEditor from "@/components/ui/HtmlEmailEditor"
import EmailPreviewModal from "@/components/ui/EmailPreviewModal"
import { FormatToggle } from "@/pages/emailTemplates/EmailTemplateForm"
import { htmlToText, plainEmailToHtml, renderTemplate, textToHtml } from "@/utils/template"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

const BUILT_IN = "" // select value for "no template" (built-in text)

export default function SendEmailModal({ open, quotation, onClose, onSent }) {
  const [templates, setTemplates] = useState([])
  const [templateId, setTemplateId] = useState(BUILT_IN)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [format, setFormat] = useState("text")
  const [pricingTable, setPricingTable] = useState({ html: "", text: "" })
  const [cc, setCc] = useState([])
  const [bcc, setBcc] = useState([])
  const [recent, setRecent] = useState({ cc: [], bcc: [] })
  const [status, setStatus] = useState({ mailConfigured: true, mockMode: false })
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  // HTML preview shows the email as the first recipient will get it
  const [previewRecipient, setPreviewRecipient] = useState(quotation.recipients[0])
  const [fullscreen, setFullscreen] = useState(false)

  // The email exactly as previewRecipient will receive it
  const recipientValues = { recipientName: previewRecipient?.name }
  const previewSubject = renderTemplate(subject, recipientValues, { raw: { pricingTable: "" } })
  const previewHtml =
    format === "html"
      ? renderTemplate(message, recipientValues, { html: true, raw: { pricingTable: pricingTable.html } })
      : plainEmailToHtml(message, recipientValues, pricingTable.html)

  const applyComposed = (d) => {
    setTemplateId(d.templateId || BUILT_IN)
    setSubject(d.subject)
    setMessage(d.message)
    setFormat(d.format || "text")
    setPricingTable(d.pricingTable || { html: "", text: "" })
    setCc(d.cc)
    setBcc(d.bcc)
    setStatus({ mailConfigured: d.mailConfigured, mockMode: d.mockMode })
  }

  // On open: templates, recent CC/BCC, and the email rendered with the quotation's template
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError("")
    Promise.all([
      emailTemplateApi.list({ limit: 100 }),
      quotationApi.recentCopyAddresses(),
      quotationApi.composeEmail(quotation._id),
    ])
      .then(([t, r, c]) => {
        setTemplates(t.data.items)
        setRecent(r.data)
        applyComposed(c.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, quotation._id])

  // Switching template replaces subject, message and CC/BCC with that template's
  const changeTemplate = async (id) => {
    setTemplateId(id)
    setComposing(true)
    setError("")
    try {
      const res = await quotationApi.composeEmail(quotation._id, id)
      applyComposed(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setComposing(false)
    }
  }

  // Switching format converts the current message so nothing is lost
  const changeFormat = (next) => {
    if (next === "text" && !window.confirm("Switch to plain text? Formatting, colours and tables will be removed.")) return
    setMessage(next === "html" ? textToHtml(message) : htmlToText(message))
    setFormat(next)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim()) return setError("Subject is required")
    if (!message.trim()) return setError("Message is required")
    setSending(true)
    setError("")
    try {
      const res = await quotationApi.send(quotation._id, {
        templateId: templateId || undefined,
        subject: subject.trim(),
        message,
        format,
        cc,
        bcc,
      })
      onSent(res.data.quotation, res.message, res.data.mode)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} title={quotation.status === "sent" ? "Resend Quotation" : "Send Quotation"} onClose={onClose} size="max-w-6xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-gray-600">Preparing email…</span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {status.mockMode && (
            <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
              <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Mock mode: the email will <b>not be delivered</b>. It is saved as a .eml file in{" "}
                <code className="font-mono">backend/outbox</code> so you can check it.
              </span>
            </div>
          )}
          {!status.mailConfigured && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Email is not set up on the server. Add the <code className="font-mono">SMTP_*</code> settings to{" "}
                <code className="font-mono">backend/.env</code> and restart the backend.
              </span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Template</label>
              <div className="relative">
                <select value={templateId} onChange={(e) => changeTemplate(e.target.value)} disabled={composing} className={inputCls}>
                  <option value={BUILT_IN}>Built-in default</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                      {t.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
                {composing && (
                  <span className="absolute right-8 top-1/2 -translate-y-1/2">
                    <Spinner size="sm" />
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To{" "}
                {quotation.recipients.length > 1 && (
                  <span className="font-normal text-gray-500">· {quotation.recipients.length} separate emails, one per person</span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {quotation.recipients.map((r) => (
                  <span key={r.email} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {r.name} &lt;{r.email}&gt;
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CC</label>
              <EmailChipsInput value={cc} onChange={setCc} suggestions={recent.cc} placeholder="Add CC email" onError={setError} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BCC</label>
              <EmailChipsInput value={bcc} onChange={setBcc} suggestions={recent.bcc} placeholder="Add BCC email" onError={setError} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-600">*</span>
            </label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Email subject" className={inputCls} />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Message <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Preview the email full screen"
              >
                <Maximize2 className="w-4 h-4" />
                Full screen preview
              </button>
                <FormatToggle value={format} onChange={changeFormat} />
              </div>
            </div>
            {format === "html" ? (
              <HtmlEmailEditor
                value={message}
                onChange={setMessage}
                rows={14}
                renderPreview={(html) =>
                  renderTemplate(html, { recipientName: previewRecipient?.name }, { html: true, raw: { pricingTable: pricingTable.html } })
                }
                onFullscreen={() => setFullscreen(true)}
              />
            ) : (
              <textarea
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={50000}
                placeholder="Email message"
                className={inputCls}
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              {"{{recipientName}}"} becomes each person's own name in their email
              {format === "html" && previewRecipient ? ` (the preview shows ${previewRecipient.name})` : ""}.{" "}
              {"{{pricingTable}}"} becomes this quotation's rate table. Other variables typed here are filled in when sending.
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
            <Paperclip className="w-4 h-4 text-gray-500" />
            {quotation.quotationNumber}.pdf
          </div>

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
              disabled={sending || composing || !status.mailConfigured}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? <Spinner size="sm" className="border-white" /> : <Send className="w-4 h-4" />}
              {quotation.status === "sent" ? "Resend Email" : "Send Email"}
            </button>
          </div>
        </form>
      )}

      <EmailPreviewModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        subject={previewSubject}
        html={previewHtml}
        to={previewRecipient ? `${previewRecipient.name} <${previewRecipient.email}>` : ""}
        cc={cc}
        bcc={bcc}
        attachments={[`${quotation.quotationNumber}.pdf`]}
        recipients={quotation.recipients}
        selectedRecipient={previewRecipient}
        onSelectRecipient={setPreviewRecipient}
        note={quotation.recipients.length > 1 ? "Each recipient gets their own copy with their name" : undefined}
      />
    </Modal>
  )
}
