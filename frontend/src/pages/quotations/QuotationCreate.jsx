import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, CheckCircle, FileText, Save, Trash2 } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import { companyApi } from "@/api/company.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { DEFAULT_GST_RATE, GST_MODE } from "@/utils/quotationCalc"
import CompanyStep from "./steps/CompanyStep"
import ProductsStep from "./steps/ProductsStep"
import TermsStep from "./steps/TermsStep"
import EmailTemplateStep from "./steps/EmailTemplateStep"
import RecipientsStep from "./steps/RecipientsStep"
import PreviewStep from "./steps/PreviewStep"
import EmailPreviewStep from "./steps/EmailPreviewStep"

const STEPS = [
  { title: "Company", subtitle: "Who is the quotation for?" },
  { title: "Products", subtitle: "Products, pricing, GST and security deposit" },
  { title: "Terms", subtitle: "Terms & conditions to include" },
  { title: "Email Template", subtitle: "Email sent with the quotation" },
  { title: "Recipients", subtitle: "Employees who receive the quotation" },
  { title: "Quotation Preview", subtitle: "Check the quotation PDF" },
  { title: "Email Preview", subtitle: "Check the email each recipient will get, then create the quotation" },
]

const initialData = () => ({
  company: null,
  items: [], // [{ product, basicPrice, discount }] - inputs kept as strings while editing
  rateMonth: new Date().toISOString().slice(0, 7),
  basicLabel: "BASIC BY IOCL",
  gstMode: GST_MODE.EXCLUDED,
  gstRate: String(DEFAULT_GST_RATE),
  securityDeposit: "",
  termIds: [],
  emailTemplateId: "", // "" = built-in text
  templateTouched: false, // the default template is pre-selected only on the first visit to that step
  recipients: [],
})

const toInput = (n) => (n === null || n === undefined ? "" : String(n))
const toNumberOrNull = (s) => (s === "" || s === null || s === undefined ? null : Number(s))

// Rebuild wizard state from a saved draft (references were populated by the API)
const dataFromDraft = (q) => {
  const d = q.draft || {}
  return {
    company: { _id: q.company, ...q.companySnapshot },
    items: (d.items || [])
      .filter((i) => i.product) // product deleted since the draft was saved
      .map((i) => ({
        product: i.product,
        basicPrice: toInput(i.basicPrice ?? i.product.currentPrice),
        discount: toInput(i.discount),
      })),
    rateMonth: d.rateMonth || new Date().toISOString().slice(0, 7),
    basicLabel: d.basicLabel ?? "BASIC BY IOCL",
    gstMode: d.gstMode || GST_MODE.EXCLUDED,
    gstRate: toInput(d.gstRate ?? DEFAULT_GST_RATE),
    securityDeposit: toInput(d.securityDeposit),
    termIds: (d.terms || []).filter(Boolean).map((t) => t._id),
    emailTemplateId: d.emailTemplate?._id || "",
    templateTouched: true,
    recipients: (d.recipients || []).filter((r) => r && r.company === q.company),
  }
}

// Returns an error message when the step is incomplete, otherwise null
const validateStep = (step, d) => {
  if (step === 0 && !d.company) return "Select a company to continue"
  if (step === 1) {
    if (!d.items.length) return "Add at least one product"
    if (!d.rateMonth) return "Select the month for the rates"
    const rate = Number(d.gstRate)
    if (d.gstRate === "" || !(rate >= 0 && rate <= 100)) return "GST rate must be between 0 and 100"
    if (d.securityDeposit === "" || !(Number(d.securityDeposit) >= 0)) return "Enter the security deposit (0 or more)"
    for (const it of d.items) {
      if (it.basicPrice === "" || !(Number(it.basicPrice) >= 0)) return `${it.product.name}: enter a basic price`
      if (Number(it.discount || 0) < 0) return `${it.product.name}: discount cannot be negative`
      if (Number(it.discount || 0) > Number(it.basicPrice)) return `${it.product.name}: discount cannot be more than the basic price`
    }
  }
  if (step === 4 && !d.recipients.length) return "Select at least one employee to send the quotation to"
  return null
}

// Furthest step reachable: every step before it must be valid
const furthestStep = (d) => {
  let i = 0
  while (i < STEPS.length - 1 && !validateStep(i, d)) i += 1
  return i
}

function Stepper({ step, onJump, maxReachable }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = i < step
        const active = i === step
        const reachable = i <= maxReachable
        return (
          <li key={s.title} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : done
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                    : "bg-gray-100 text-gray-500"
              } disabled:cursor-not-allowed`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  active ? "bg-white text-blue-600" : done ? "bg-blue-600 text-white" : "bg-gray-300 text-white"
                }`}
              >
                {done ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {s.title}
            </button>
            {i < STEPS.length - 1 && <span className="w-4 h-px bg-gray-300" />}
          </li>
        )
      })}
    </ol>
  )
}

export default function QuotationCreate() {
  const { quotationId } = useParams() // present when resuming a draft
  const [searchParams] = useSearchParams() // ?companyId= preselects the company (e.g. from Company Quotations)
  const presetCompanyId = searchParams.get("companyId")
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState(initialData)
  const [draftId, setDraftId] = useState(null)
  const draftIdRef = useRef(null)
  const [loadingDraft, setLoadingDraft] = useState(Boolean(quotationId))
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState(null)

  useEffect(() => {
    if (quotationId || !presetCompanyId) return
    companyApi
      .get(presetCompanyId)
      .then((res) => {
        setData((d) => (d.company ? d : { ...d, company: res.data }))
        setStep((s) => (s === 0 ? 1 : s))
      })
      .catch(() => {}) // unknown id: just start at the company step
  }, [quotationId, presetCompanyId])

  useEffect(() => {
    // Skip reloading right after this page created the draft and switched to its URL
    if (!quotationId || quotationId === draftIdRef.current) return
    setLoadingDraft(true)
    quotationApi
      .get(quotationId)
      .then((res) => {
        const q = res.data
        if (q.status !== "draft") {
          navigate(`/quotations/${q._id}`, { replace: true })
          return
        }
        const restored = dataFromDraft(q)
        draftIdRef.current = q._id
        setDraftId(q._id)
        setData(restored)
        setStep(Math.min(q.draft?.step ?? 0, furthestStep(restored)))
        setDraftSavedAt(q.updatedAt)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDraft(false))
  }, [quotationId, navigate])

  const update = (patch) => {
    setData((d) => ({ ...d, ...patch }))
    setError("")
  }

  const maxReachable = useMemo(() => furthestStep(data), [data])

  // Memoised so the preview only regenerates when the data actually changes
  const payload = useMemo(
    () => ({
      companyId: data.company?._id,
      items: data.items.map((it) => ({
        productId: it.product._id,
        basicPrice: Number(it.basicPrice),
        discount: Number(it.discount || 0),
      })),
      rateMonth: data.rateMonth,
      basicLabel: data.basicLabel.trim() || undefined,
      gstMode: data.gstMode,
      gstRate: Number(data.gstRate),
      securityDeposit: Number(data.securityDeposit),
      termIds: data.termIds,
      emailTemplateId: data.emailTemplateId || undefined,
      recipientIds: data.recipients.map((r) => r._id),
    }),
    [data]
  )

  const saveDraft = async () => {
    if (!data.company) return setError("Select a company before saving a draft")
    setSavingDraft(true)
    setError("")
    try {
      const draftPayload = {
        companyId: data.company._id,
        items: data.items.map((it) => ({
          productId: it.product._id,
          basicPrice: toNumberOrNull(it.basicPrice),
          discount: toNumberOrNull(it.discount),
        })),
        rateMonth: data.rateMonth || null,
        basicLabel: data.basicLabel,
        gstMode: data.gstMode,
        gstRate: toNumberOrNull(data.gstRate),
        securityDeposit: toNumberOrNull(data.securityDeposit),
        termIds: data.termIds,
        emailTemplateId: data.emailTemplateId || null,
        recipientIds: data.recipients.map((r) => r._id),
        step,
      }
      const res = draftId
        ? await quotationApi.updateDraft(draftId, draftPayload)
        : await quotationApi.createDraft(draftPayload)
      setDraftSavedAt(res.data.updatedAt)
      if (!draftId) {
        draftIdRef.current = res.data._id
        setDraftId(res.data._id)
        navigate(`/quotations/${res.data._id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingDraft(false)
    }
  }

  const discardDraft = async () => {
    if (!window.confirm("Discard this draft? This cannot be undone.")) return
    try {
      await quotationApi.remove(draftId)
      navigate("/quotations", { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  const next = () => {
    const msg = validateStep(step, data)
    if (msg) return setError(msg)
    setError("")
    setStep((s) => s + 1)
  }

  const back = () => {
    setError("")
    setStep((s) => s - 1)
  }

  const save = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await quotationApi.create({ ...payload, draftId: draftId || undefined })
      navigate(`/quotations/${res.data._id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectCompany = (company) => {
    // Recipients belong to a company, so changing company clears them
    if (company._id !== data.company?._id) update({ company, recipients: [] })
  }

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading draft…</span>
      </div>
    )
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={FileText}
        title={draftId ? "Edit Draft Quotation" : "New Quotation"}
        subtitle={STEPS[step].subtitle}
        color="indigo"
        actions={
          draftId && (
            <button
              type="button"
              onClick={discardDraft}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Discard Draft
            </button>
          )
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <Stepper step={step} maxReachable={maxReachable} onJump={(i) => setStep(i)} />
      </div>

      {data.company && step > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          Quotation for <span className="font-semibold text-gray-900">{data.company.name}</span>
        </div>
      )}

      <Alert>{error}</Alert>

      <div className={step === 1 || step >= 5 ? "" : "bg-white rounded-xl shadow-sm border border-gray-200 p-6"}>
        {step === 0 && <CompanyStep selected={data.company} onSelect={selectCompany} />}
        {step === 1 && <ProductsStep data={data} update={update} />}
        {step === 2 && <TermsStep selectedIds={data.termIds} onChange={(termIds) => update({ termIds })} />}
        {step === 3 && (
          <EmailTemplateStep
            selectedId={data.emailTemplateId}
            onChange={(emailTemplateId) => update({ emailTemplateId })}
            touched={data.templateTouched}
            onTouched={() => setData((d) => ({ ...d, templateTouched: true }))}
          />
        )}
        {step === 4 && (
          <RecipientsStep company={data.company} selected={data.recipients} onChange={(recipients) => update({ recipients })} />
        )}
        {step === 5 && <PreviewStep data={data} payload={payload} />}
        {step === 6 && <EmailPreviewStep payload={payload} />}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={step === 0 ? () => navigate("/quotations") : back}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {draftSavedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle className="w-3 h-3 text-green-600" />
              Draft saved {new Date(draftSavedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft || !data.company}
            title={data.company ? "Save your progress and continue later" : "Select a company first"}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {savingDraft ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Spinner size="sm" className="border-white" /> : <CheckCircle className="w-4 h-4" />}
              Create Quotation
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
