import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react"
import { companyApi, memberApi } from "@/api/company.api"
import { useAuth } from "@/context/AuthContext"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { StatusBadge } from "@/components/ui/RoleBadge"
import ImportExcelModal from "@/components/ui/ImportExcelModal"
import MemberFormModal from "./MemberFormModal"

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || "—"}</p>
      </div>
    </div>
  )
}

function DocLink({ file, label }) {
  if (!file) return <span className="text-xs text-gray-400">{label}: not uploaded</span>
  const isImage = file.mimeType?.startsWith("image/")
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      {isImage ? (
        <img src={file.url} alt={label} className="w-10 h-10 rounded object-cover" />
      ) : (
        <FileText className="w-5 h-5 text-blue-600" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
      <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
    </a>
  )
}

function DocCard({ title, number, color, children }) {
  const cls = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  }[color]
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${cls}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-lg font-semibold font-mono text-gray-900">{number || "—"}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function CompanyDetail() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()

  const [company, setCompany] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(true)
  const [error, setError] = useState("")
  const [modal, setModal] = useState({ open: false, member: null })
  const [importOpen, setImportOpen] = useState(false)

  const loadMembers = useCallback(() => {
    setMembersLoading(true)
    memberApi
      .list(companyId, { limit: 100 })
      .then((res) => setMembers(res.data.items))
      .catch((err) => setError(err.message))
      .finally(() => setMembersLoading(false))
  }, [companyId])

  useEffect(() => {
    companyApi
      .get(companyId)
      .then((res) => setCompany(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    loadMembers()
  }, [companyId, loadMembers])

  const deleteCompany = async () => {
    if (!window.confirm(`Delete ${company.name}, all its members and uploaded documents? This cannot be undone.`)) return
    try {
      await companyApi.remove(companyId)
      navigate("/companies", { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteMember = async (m) => {
    if (!window.confirm(`Remove ${m.name} from ${company.name}?`)) return
    try {
      await memberApi.remove(companyId, m._id)
      loadMembers()
    } catch (err) {
      setError(err.message)
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

  if (!company) {
    return (
      <div className="p-6 space-y-6">
        <Alert>{error || "Company not found"}</Alert>
        <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back to companies
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Link to="/companies" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All companies
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-gray-600">Added {new Date(company.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/companies/${companyId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          {isSuperAdmin && (
            <button
              onClick={deleteCompany}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
          <div className="space-y-4">
            <InfoRow icon={MapPin} label="Address" value={company.address} />
            <InfoRow icon={Mail} label="Email" value={company.email} />
            <InfoRow icon={Phone} label="Phone" value={company.phone} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DocCard title="GST" number={company.gstNumber} color="blue">
              <DocLink file={company.gstCertificate} label="Certificate" />
            </DocCard>
            <DocCard title="PAN" number={company.panNumber} color="purple">
              <DocLink file={company.panFront} label="Front" />
              <DocLink file={company.panBack} label="Back" />
            </DocCard>
            <DocCard title="MSME" number={company.msmeNumber} color="emerald">
              <DocLink file={company.msmeCertificate} label="Certificate" />
            </DocCard>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{members.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Members
            </button>
            <button
              onClick={() => setModal({ open: true, member: null })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
            <span className="ml-3 text-gray-600">Loading members…</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No members yet</p>
            <p className="text-gray-500 text-sm mt-2">Add the people who work at this company.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Designation", "Phone", "Email", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((m) => (
                  <tr key={m._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-semibold text-white">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {m.designation}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{m.phone}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{m.email || "—"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ open: true, member: m })}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMember(m)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ImportExcelModal
        open={importOpen}
        title={`Import Members · ${company.name}`}
        description={`Fill one row per member. Everyone in the file is added to ${company.name}.`}
        templateFileName={`QMS-members-${company.name.replace(/[^a-z0-9]+/gi, "-")}-template.xlsx`}
        entityLabel="members"
        downloadTemplate={() => memberApi.downloadTemplate(companyId)}
        importFile={(file) => memberApi.importExcel(companyId, file)}
        onClose={() => setImportOpen(false)}
        onImported={loadMembers}
      />

      <MemberFormModal
        open={modal.open}
        member={modal.member}
        companyId={companyId}
        onClose={() => setModal({ open: false, member: null })}
        onSaved={() => {
          setModal({ open: false, member: null })
          loadMembers()
        }}
      />
    </div>
  )
}
