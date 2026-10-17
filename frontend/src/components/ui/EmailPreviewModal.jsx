import { useEffect, useState } from "react"
import { Monitor, Paperclip, Smartphone, X } from "lucide-react"
import { previewDocument } from "@/utils/template"

const WIDTHS = {
  desktop: { label: "Desktop", icon: Monitor, cls: "w-full max-w-4xl" },
  mobile: { label: "Mobile", icon: Smartphone, cls: "w-[390px]" },
}

/**
 * Full-screen preview of an email as the recipient will see it.
 * - html: the message body as HTML (plain-text emails should be converted first, see plainEmailToHtml)
 * - recipients/selectedRecipient/onSelectRecipient: optional picker to preview each person's own email
 */
export default function EmailPreviewModal({
  open,
  onClose,
  subject,
  html,
  from,
  to,
  cc = [],
  bcc = [],
  attachments = [],
  recipients,
  selectedRecipient,
  onSelectRecipient,
  note,
}) {
  const [width, setWidth] = useState("desktop")

  useEffect(() => {
    if (!open) return
    // Capture phase + stopImmediatePropagation: Escape closes only this preview, not a dialog underneath
    const onKey = (e) => {
      if (e.key !== "Escape") return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener("keydown", onKey, true)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey, true)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  const Row = ({ label, children }) => (
    <div className="flex gap-3 text-sm">
      <span className="w-14 shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-900 break-words min-w-0">{children}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-100">
      <div className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 shrink-0">Email Preview</h2>
          {note && <span className="text-sm text-gray-500 truncate">{note}</span>}
        </div>
        <div className="flex items-center gap-2">
          {recipients?.length > 1 && (
            <select
              value={selectedRecipient?.email || ""}
              onChange={(e) => onSelectRecipient(recipients.find((r) => r.email === e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Preview the email this person will receive"
            >
              {recipients.map((r) => (
                <option key={r.email} value={r.email}>
                  As sent to {r.name}
                </option>
              ))}
            </select>
          )}
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {Object.entries(WIDTHS).map(([key, w]) => {
              const Icon = w.icon
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setWidth(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    width === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {w.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className={`${WIDTHS[width].cls} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col transition-all`}>
          <div className="px-6 py-4 border-b border-gray-200 space-y-1.5">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 break-words">{subject || "(no subject)"}</h3>
            {from && <Row label="From">{from}</Row>}
            {to && <Row label="To">{to}</Row>}
            {cc.length > 0 && <Row label="CC">{cc.join(", ")}</Row>}
            {bcc.length > 0 && <Row label="BCC">{bcc.join(", ")}</Row>}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {attachments.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-700">
                    <Paperclip className="w-4 h-4 text-gray-500" />
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* sandbox without allow-scripts: previewed HTML can never run code */}
          <iframe title="Email body" sandbox="" srcDoc={previewDocument(html)} className="w-full flex-1 min-h-[70vh] rounded-b-xl" />
        </div>
      </div>
    </div>
  )
}
