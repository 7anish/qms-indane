import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Building2, FileText, Save } from "lucide-react"
import { companyApi } from "@/api/company.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import FileField from "@/components/ui/FileField"
import { ACCEPT, GST_REGEX, PAN_REGEX } from "@/utils/constants"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const errorInputCls = "border-red-300 bg-red-50"

const TEXT_FIELDS = ["name", "address", "email", "phone", "gstNumber", "panNumber", "msmeNumber"]
const FILE_FIELDS = ["gstCertificate", "panFront", "panBack", "msmeCertificate"]

const emptyForm = Object.fromEntries(TEXT_FIELDS.map((f) => [f, ""]))
const emptyFiles = Object.fromEntries(FILE_FIELDS.map((f) => [f, null]))

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function DocSection({ title, color, children }) {
  const tint = {
    blue: "border-blue-200 bg-blue-50/40",
    purple: "border-purple-200 bg-purple-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
  }[color]
  return (
    <div className={`rounded-lg border p-4 space-y-4 ${tint}`}>
      <h3 className="font-medium text-gray-900">{title}</h3>
      {children}
    </div>
  )
}

export default function CompanyForm() {
  const { companyId } = useParams()
  const isEdit = Boolean(companyId)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [files, setFiles] = useState(emptyFiles)
  const [existing, setExisting] = useState({})
  const [removed, setRemoved] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    companyApi
      .get(companyId)
      .then((res) => {
        const c = res.data
        setForm(Object.fromEntries(TEXT_FIELDS.map((f) => [f, c[f] || ""])))
        setExisting(Object.fromEntries(FILE_FIELDS.map((f) => [f, c[f]])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, isEdit])

  const onChange = (e) => {
    const { name, value } = e.target
    const upper = ["gstNumber", "panNumber", "msmeNumber"].includes(name)
    setForm((f) => ({ ...f, [name]: upper ? value.toUpperCase() : value }))
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  const fileProps = (name) => ({
    file: files[name],
    existing: existing[name],
    removed: removed[name],
    onSelect: (file) => setFiles((s) => ({ ...s, [name]: file })),
    onRemoveExisting: () => setRemoved((s) => ({ ...s, [name]: true })),
    onError: setError,
  })

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = "Company name is required"
    if (!form.address.trim()) errs.address = "Address is required"
    if (!GST_REGEX.test(form.gstNumber.trim())) errs.gstNumber = "Enter a valid GST number (e.g. 27ABCDE1234F1Z5)"
    if (!PAN_REGEX.test(form.panNumber.trim())) errs.panNumber = "Enter a valid PAN number (e.g. ABCDE1234F)"
    if (!form.msmeNumber.trim()) errs.msmeNumber = "MSME number is required"
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    const fd = new FormData()
    TEXT_FIELDS.forEach((f) => {
      const v = form[f].trim()
      // On create, skip empty optional fields; on edit, send "" to clear them
      if (v || isEdit) fd.append(f, v)
    })
    FILE_FIELDS.forEach((f) => files[f] && fd.append(f, files[f]))
    const toRemove = FILE_FIELDS.filter((f) => removed[f] && !files[f])
    if (toRemove.length) fd.append("removeFiles", toRemove.join(","))

    setSubmitting(true)
    try {
      const res = isEdit ? await companyApi.update(companyId, fd) : await companyApi.create(fd)
      navigate(`/companies/${res.data._id}`)
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
        <span className="ml-3 text-gray-600">Loading company…</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Building2}
        title={isEdit ? "Edit Company" : "Add Company"}
        subtitle={isEdit ? form.name : "Register a new company with its documents"}
        color="emerald"
      />

      <Alert>{error}</Alert>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name" required error={fieldErrors.name}>
              <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Acme Industries Pvt Ltd" className={`${inputCls} ${fieldErrors.name ? errorInputCls : ""}`} />
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="e.g. info@company.com" className={`${inputCls} ${fieldErrors.email ? errorInputCls : ""}`} />
            </Field>
            <Field label="Phone">
              <input name="phone" value={form.phone} onChange={onChange} placeholder="e.g. 9876543210" className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address" required error={fieldErrors.address}>
                <textarea
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={onChange}
                  placeholder="Building, street, city, state, PIN code"
                  className={`${inputCls} ${fieldErrors.address ? errorInputCls : ""}`}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Registration Documents</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">PDF, JPG or PNG up to 5 MB. PAN card photos: JPG, PNG or WEBP.</p>

          <div className="space-y-4">
            <DocSection title="GST" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="GST Number" required error={fieldErrors.gstNumber}>
                  <input
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={onChange}
                    maxLength={15}
                    placeholder="27ABCDE1234F1Z5"
                    className={`${inputCls} font-mono ${fieldErrors.gstNumber ? errorInputCls : ""}`}
                  />
                </Field>
                <FileField label="GST Certificate" accept={ACCEPT.DOC} hint="PDF / JPG / PNG" {...fileProps("gstCertificate")} />
              </div>
            </DocSection>

            <DocSection title="PAN Card" color="purple">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="PAN Number" required error={fieldErrors.panNumber}>
                  <input
                    name="panNumber"
                    value={form.panNumber}
                    onChange={onChange}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    className={`${inputCls} font-mono ${fieldErrors.panNumber ? errorInputCls : ""}`}
                  />
                </Field>
                <FileField label="PAN Front" accept={ACCEPT.IMAGE} hint="Photo of the front" {...fileProps("panFront")} />
                <FileField label="PAN Back" accept={ACCEPT.IMAGE} hint="Photo of the back" {...fileProps("panBack")} />
              </div>
            </DocSection>

            <DocSection title="MSME" color="emerald">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="MSME / Udyam Number" required error={fieldErrors.msmeNumber}>
                  <input
                    name="msmeNumber"
                    value={form.msmeNumber}
                    onChange={onChange}
                    placeholder="UDYAM-XX-00-0000000"
                    className={`${inputCls} font-mono ${fieldErrors.msmeNumber ? errorInputCls : ""}`}
                  />
                </Field>
                <FileField label="MSME Certificate" accept={ACCEPT.DOC} hint="PDF / JPG / PNG" {...fileProps("msmeCertificate")} />
              </div>
            </DocSection>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create Company"}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/companies/${companyId}` : "/companies")}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
