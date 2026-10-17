import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Save, UserPlus } from "lucide-react"
import { adminApi } from "@/api/admin.api"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { ROLES, ROLE_LABELS } from "@/utils/constants"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

const initial = { name: "", email: "", phone: "", password: "", role: ROLES.ADMIN }

export default function CreateAdmin() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)
    try {
      const res = await adminApi.create(form)
      setSuccess(`${res.data.name} was created successfully.`)
      setForm(initial)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={UserPlus} title="Create Admin" subtitle="Add a new admin account" color="purple" />

      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-600">*</span></label>
              <input name="name" value={form.name} onChange={onChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-600">*</span></label>
              <input type="email" name="email" value={form.email} onChange={onChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input name="phone" value={form.phone} onChange={onChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role <span className="text-red-600">*</span></label>
              <select name="role" value={form.role} onChange={onChange} className={inputCls}>
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-600">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
              Create Admin
            </button>
            <button
              type="button"
              onClick={() => navigate("/admins")}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
