import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { History, Package, Save } from "lucide-react"
import { productApi } from "@/api/product.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import FileField from "@/components/ui/FileField"
import { ACCEPT } from "@/utils/constants"
import { formatPrice } from "@/utils/format"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const errorInputCls = "border-red-300 bg-red-50"

const FIELDS = ["name", "sku", "description", "unit", "status", "gasType", "cylinderCapacityKg", "currentPrice"]
const emptyForm = { ...Object.fromEntries(FIELDS.map((f) => [f, ""])), status: "active" }

// Suggestions only; any value can be typed
const UNIT_OPTIONS = ["Cylinder", "Kg", "Litre", "Cubic Metre", "Piece"]
const GAS_OPTIONS = ["Oxygen", "Nitrogen", "Argon", "Carbon Dioxide", "Acetylene", "LPG", "Helium", "Hydrogen", "Mixed Gas"]

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

export default function ProductForm() {
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [originalPrice, setOriginalPrice] = useState(null)
  const [image, setImage] = useState(null)
  const [existingImage, setExistingImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    productApi
      .get(productId)
      .then((res) => {
        const p = res.data
        setForm(Object.fromEntries(FIELDS.map((f) => [f, p[f] ?? ""])))
        setOriginalPrice(p.currentPrice)
        setExistingImage(p.image || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [productId, isEdit])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: name === "sku" ? value.toUpperCase() : value }))
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = "Product name is required"
    if (!form.description.trim()) errs.description = "Description is required"
    if (!form.unit.trim()) errs.unit = "Unit is required"
    if (!form.gasType.trim()) errs.gasType = "Gas type is required"
    if (!(Number(form.cylinderCapacityKg) > 0)) errs.cylinderCapacityKg = "Enter a capacity greater than 0"
    if (form.currentPrice === "" || !(Number(form.currentPrice) >= 0)) errs.currentPrice = "Enter a price of 0 or more"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const priceChanged = isEdit && form.currentPrice !== "" && Number(form.currentPrice) !== originalPrice

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!validate()) return

    const fd = new FormData()
    FIELDS.forEach((f) => {
      const v = String(form[f]).trim()
      // On create, skip an empty SKU; on edit, send "" to clear it
      if (v || isEdit) fd.append(f, v)
    })
    if (image) fd.append("image", image)
    else if (removeImage) fd.append("removeImage", "true")

    setSubmitting(true)
    try {
      const res = isEdit ? await productApi.update(productId, fd) : await productApi.create(fd)
      navigate(`/products/${res.data._id}`)
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
        <span className="ml-3 text-gray-600">Loading product…</span>
      </div>
    )
  }

  const err = (name) => (fieldErrors[name] ? errorInputCls : "")

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Package}
        title={isEdit ? "Edit Product" : "Add Product"}
        subtitle={isEdit ? form.name : "Add a new gas cylinder product"}
        color="blue"
      />

      <Alert>{error}</Alert>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Product Name" required error={fieldErrors.name}>
                <input name="name" value={form.name} onChange={onChange} placeholder="e.g. Oxygen Cylinder 47L" className={`${inputCls} ${err("name")}`} />
              </Field>
              <Field label="SKU">
                <input name="sku" value={form.sku} onChange={onChange} maxLength={50} placeholder="e.g. OXY-47L" className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Gas Type" required error={fieldErrors.gasType}>
                <input
                  name="gasType"
                  list="gas-type-options"
                  value={form.gasType}
                  onChange={onChange}
                  placeholder="e.g. Oxygen"
                  className={`${inputCls} ${err("gasType")}`}
                />
                <datalist id="gas-type-options">
                  {GAS_OPTIONS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </Field>
              <Field label="Unit" required error={fieldErrors.unit}>
                <input
                  name="unit"
                  list="unit-options"
                  value={form.unit}
                  onChange={onChange}
                  placeholder="e.g. Cylinder"
                  className={`${inputCls} ${err("unit")}`}
                />
                <datalist id="unit-options">
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
              <Field label="Cylinder Capacity (kg)" required error={fieldErrors.cylinderCapacityKg}>
                <input
                  type="number"
                  name="cylinderCapacityKg"
                  value={form.cylinderCapacityKg}
                  onChange={onChange}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 7.5"
                  className={`${inputCls} ${err("cylinderCapacityKg")}`}
                />
              </Field>
              <Field label="Status" required>
                <select name="status" value={form.status} onChange={onChange} className={inputCls}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Description" required error={fieldErrors.description}>
                  <textarea
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={onChange}
                    maxLength={2000}
                    placeholder="Purity, valve type, usage, etc."
                    className={`${inputCls} ${err("description")}`}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
              <Field label="Current Price (₹)" required error={fieldErrors.currentPrice}>
                <input
                  type="number"
                  name="currentPrice"
                  value={form.currentPrice}
                  onChange={onChange}
                  min="0"
                  step="0.01"
                  placeholder="e.g. 450"
                  className={`${inputCls} ${err("currentPrice")}`}
                />
              </Field>
              {priceChanged && (
                <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <History className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Price changes from <b>{formatPrice(originalPrice)}</b> to <b>{formatPrice(Number(form.currentPrice))}</b>. The old
                    price will be saved in the price history.
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Image</h2>
              <FileField
                label="Product Image"
                accept={ACCEPT.IMAGE}
                hint="JPG / PNG / WEBP, up to 5 MB"
                existing={existingImage}
                file={image}
                removed={removeImage}
                onSelect={setImage}
                onRemoveExisting={() => setRemoveImage(true)}
                onError={setError}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/products/${productId}` : "/products")}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
