import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { memberApi } from "@/api/company.api"
import Modal from "@/components/ui/Modal"
import Spinner from "@/components/ui/Spinner"

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

const empty = { name: "", phone: "", email: "", designation: "" }

export default function MemberFormModal({ open, member, companyId, onClose, onSaved }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError("")
    setForm(member ? { name: member.name, phone: member.phone, email: member.email || "", designation: member.designation } : empty)
  }, [open, member])

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
      if (member) await memberApi.update(companyId, member._id, payload)
      else await memberApi.create(companyId, payload)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={member ? "Edit Member" : "Add Member"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name <span className="text-red-600">*</span>
          </label>
          <input name="name" value={form.name} onChange={onChange} required autoFocus placeholder="e.g. Ravi Sharma" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Designation <span className="text-red-600">*</span>
          </label>
          <input name="designation" value={form.designation} onChange={onChange} required placeholder="e.g. Manager" className={inputCls} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-600">*</span>
            </label>
            <input name="phone" value={form.phone} onChange={onChange} required placeholder="e.g. 9876543210" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-600">*</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={onChange} required placeholder="e.g. ravi@company.com" className={inputCls} />
          </div>
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
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Spinner size="sm" className="border-white" /> : <Save className="w-4 h-4" />}
            {member ? "Save" : "Add Member"}
          </button>
        </div>
      </form>
    </Modal>
  )
}
