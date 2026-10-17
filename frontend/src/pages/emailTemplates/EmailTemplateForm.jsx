import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Braces, Code2, Eye, Mail, Maximize2, Paperclip, Save, Type } from "lucide-react"
import { emailTemplateApi } from "@/api/emailTemplate.api"
import { quotationApi } from "@/api/quotation.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import EmailChipsInput from "@/components/ui/EmailChipsInput"
import HtmlEmailEditor from "@/components/ui/HtmlEmailEditor"
import EmailPreviewModal from "@/components/ui/EmailPreviewModal"
import { findUnknownVariables, htmlToText, plainEmailToHtml, renderTemplate, textToHtml } from "@/utils/template"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const errorInputCls = "border-red-300 bg-red-50"

const empty = { name: "", subject: "", format: "text", body: "", cc: [], bcc: [], isDefault: false }

export function FormatToggle({ value, onChange }) {
  const options = [
    { value: "text", label: "Plain text", icon: Type },
    { value: "html", label: "HTML", icon: Code2 },
  ]
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      {options.map((o) => {
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => value !== o.value && onChange(o.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              value === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function EmailTemplateForm() {
  const { templateId } = useParams()
  const isEdit = Boolean(templateId)
  const navigate = useNavigate()

  const [form, setForm] = useState(empty)
  const [variables, setVariables] = useState([])
  const [samplePricing, setSamplePricing] = useState({ html: "", text: "" })
  const [recent, setRecent] = useState({ cc: [], bcc: [] })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const subjectRef = useRef(null)
  const bodyRef = useRef(null)
  const lastFocused = useRef("body") // where "insert variable" puts the text

  useEffect(() => {
    const requests = [
      emailTemplateApi.variables().then((res) => {
        setVariables(res.data.variables)
        setSamplePricing(res.data.samplePricingTable)
        // Start new templates from the built-in text so there is something to edit
        if (!isEdit) setForm((f) => ({ ...f, subject: res.data.builtIn.subject, body: res.data.builtIn.body }))
      }),
      quotationApi.recentCopyAddresses().then((res) => setRecent(res.data)),
    ]
    if (isEdit) {
      requests.push(
        emailTemplateApi.get(templateId).then((res) => {
          const t = res.data
          setForm({
            name: t.name,
            subject: t.subject,
            format: t.format || "text",
            body: t.body,
            cc: t.cc,
            bcc: t.bcc,
            isDefault: t.isDefault,
          })
        })
      )
    }
    Promise.all(requests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isEdit, templateId])

  const known = useMemo(() => new Set(variables.map((v) => v.name)), [variables])
  const samples = useMemo(() => Object.fromEntries(variables.map((v) => [v.name, v.sample])), [variables])
  const unknown = useMemo(
    () => [...new Set([...findUnknownVariables(form.subject, known), ...findUnknownVariables(form.body, known)])],
    [form.subject, form.body, known]
  )

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setFieldErrors((fe) => ({ ...fe, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }))
  }

  // Switching format converts the current body so nothing is lost
  const changeFormat = (format) => {
    if (format === "text" && !window.confirm("Switch to plain text? Formatting, colours and tables will be removed.")) return
    set({ format, body: format === "html" ? textToHtml(form.body) : htmlToText(form.body) })
  }

  // Insert {{name}} at the cursor of the last focused field (subject or body)
  const insertVariable = (name) => {
    const field = lastFocused.current
    const el = field === "subject" ? subjectRef.current : bodyRef.current
    const token = `{{${name}}}`
    const current = form[field]
    const start = el?.selectionStart ?? current.length
    const end = el?.selectionEnd ?? current.length
    set({ [field]: current.slice(0, start) + token + current.slice(end) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const renderHtmlPreview = (html) => renderTemplate(html, samples, { html: true, raw: { pricingTable: samplePricing.html } })
  const [fullscreen, setFullscreen] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    const errs = {}
    if (!form.name.trim()) errs.name = "Template name is required"
    if (!form.subject.trim()) errs.subject = "Subject is required"
    if (!form.body.trim()) errs.body = "Body is required"
    setFieldErrors(errs)
    if (Object.keys(errs).length) return
    if (unknown.length) return setError(`Unknown variable(s): ${unknown.map((v) => `{{${v}}}`).join(", ")}`)

    setSubmitting(true)
    try {
      const payload = { ...form, name: form.name.trim(), subject: form.subject.trim() }
      if (isEdit) await emailTemplateApi.update(templateId, payload)
      else await emailTemplateApi.create(payload)
      navigate("/email-templates")
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
        <span className="ml-3 text-gray-600">Loading…</span>
      </div>
    )
  }

  const isHtml = form.format === "html"

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Mail}
        title={isEdit ? "Edit Email Template" : "New Email Template"}
        subtitle="Use variables like {{companyName}} - they are filled in for each quotation"
        color="purple"
      />

      <Alert>{error}</Alert>

      <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-600">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                maxLength={100}
                placeholder="e.g. Monthly Rate Quotation"
                className={`${inputCls} ${fieldErrors.name ? errorInputCls : ""}`}
              />
              {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-600">*</span>
              </label>
              <input
                ref={subjectRef}
                value={form.subject}
                onChange={(e) => set({ subject: e.target.value })}
                onFocus={() => (lastFocused.current = "subject")}
                maxLength={200}
                placeholder="e.g. Quotation {{quotationNumber}} - Rates for {{rateMonth}}"
                className={`${inputCls} ${fieldErrors.subject ? errorInputCls : ""}`}
              />
              {fieldErrors.subject && <p className="mt-1 text-sm text-red-600">{fieldErrors.subject}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Body <span className="text-red-600">*</span>
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
                  <FormatToggle value={form.format} onChange={changeFormat} />
                </div>
              </div>
              {isHtml ? (
                <HtmlEmailEditor
                  ref={bodyRef}
                  value={form.body}
                  onChange={(body) => set({ body })}
                  onFocus={() => (lastFocused.current = "body")}
                  renderPreview={renderHtmlPreview}
                  onFullscreen={() => setFullscreen(true)}
                  invalid={Boolean(fieldErrors.body)}
                />
              ) : (
                <textarea
                  ref={bodyRef}
                  rows={12}
                  value={form.body}
                  onChange={(e) => set({ body: e.target.value })}
                  onFocus={() => (lastFocused.current = "body")}
                  maxLength={50000}
                  placeholder="Dear {{recipientName}}, ..."
                  className={`${inputCls} font-mono text-sm ${fieldErrors.body ? errorInputCls : ""}`}
                />
              )}
              {fieldErrors.body && <p className="mt-1 text-sm text-red-600">{fieldErrors.body}</p>}
              {unknown.length > 0 && (
                <p className="mt-1 text-sm text-red-600">Unknown variable(s): {unknown.map((v) => `{{${v}}}`).join(", ")}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {isHtml
                  ? "Use the toolbar for bold text, colours, links and tables. Scripts are removed before sending."
                  : "Line breaks are kept. Switch to HTML for colours, formatting and tables."}
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
              <Paperclip className="w-4 h-4 text-gray-500" />
              The quotation PDF is attached automatically.
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Default CC / BCC</h2>
            <p className="text-xs text-gray-500 -mt-2">Pre-filled when this template is used; can be changed before sending.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CC</label>
                <EmailChipsInput
                  value={form.cc}
                  onChange={(cc) => set({ cc })}
                  suggestions={recent.cc}
                  placeholder="Type an email and press Enter"
                  onError={setError}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BCC</label>
                <EmailChipsInput
                  value={form.bcc}
                  onChange={(bcc) => set({ bcc })}
                  suggestions={recent.bcc}
                  placeholder="Type an email and press Enter"
                  onError={setError}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set({ isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Use as the default template for new quotations
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Braces className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Variables</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Click to insert into the subject or body at the cursor.</p>
            <div className="space-y-1">
              {variables.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVariable(v.name)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  <span className="font-mono text-xs text-purple-700">{`{{${v.name}}}`}</span>
                  <span className="text-xs text-gray-500">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!isHtml && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
              </div>
              <p className="text-xs text-gray-500">Subject</p>
              <p className="text-sm font-semibold text-gray-900 mb-3">{renderTemplate(form.subject, { ...samples, pricingTable: "" }) || "—"}</p>
              <p className="text-xs text-gray-500">Body</p>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto">
                {renderTemplate(form.body, samples, { raw: { pricingTable: samplePricing.text } }) || "—"}
              </div>
              <p className="text-xs text-gray-400 mt-2">Shown with sample values.</p>
            </div>
          )}
          {isHtml && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs text-gray-500">Subject preview</p>
              <p className="text-sm font-semibold text-gray-900">{renderTemplate(form.subject, { ...samples, pricingTable: "" }) || "—"}</p>
              <p className="text-xs text-gray-400 mt-2">The body preview is next to the HTML editor, with sample values.</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create Template"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/email-templates")}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>

      <EmailPreviewModal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        subject={renderTemplate(form.subject, { ...samples, pricingTable: "" })}
        html={isHtml ? renderHtmlPreview(form.body) : plainEmailToHtml(form.body, samples, samplePricing.html)}
        to={`${samples.recipientName || "Ravi Sharma"} <ravi@example.com>`}
        cc={form.cc}
        bcc={form.bcc}
        attachments={[`${samples.quotationNumber || "QT-2026-0001"}.pdf`]}
        note="Shown with sample values"
      />
    </div>
  )
}
