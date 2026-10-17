import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Crown, Plus, RefreshCw, Search, Trash2, UserCog, Users } from "lucide-react"
import { adminApi } from "@/api/admin.api"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { RoleBadge, StatusBadge } from "@/components/ui/RoleBadge"
import { ROLES } from "@/utils/constants"

const filters = [
  { value: "", label: "All", active: "bg-gray-900 text-white", idle: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  { value: ROLES.SUPER_ADMIN, label: "Super Admin", active: "bg-purple-600 text-white", idle: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
  { value: ROLES.ADMIN, label: "Admin", active: "bg-blue-600 text-white", idle: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
]

export default function AdminList() {
  const { admin: me, isSuperAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 })
  const [role, setRole] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .list({ page, limit: 10, role: role || undefined, search: search || undefined })
      .then((res) => {
        setItems(res.data.items)
        setMeta(res.data.meta)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, role, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const toggleStatus = async (a) => {
    try {
      await adminApi.update(a._id, { status: a.status === "active" ? "inactive" : "active" })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (a) => {
    if (!window.confirm(`Delete ${a.name}? This cannot be undone.`)) return
    try {
      await adminApi.remove(a._id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Users}
        title="Admins"
        subtitle="Manage admin accounts and roles"
        color="purple"
        actions={
          isSuperAdmin && (
            <Link
              to="/admins/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Admin
            </Link>
          )
        }
      />

      <Alert>{error}</Alert>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setRole(f.value)
                  setPage(1)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  role === f.value ? f.active : f.idle
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{meta.total} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search name, email, phone"
                className="w-64 pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={load}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
            <span className="ml-3 text-gray-600">Loading admins…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">No admins found</p>
            <p className="text-gray-500 text-sm mt-2">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Admin", "Phone", "Role", "Status", "Last Login", ...(isSuperAdmin ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((a) => {
                  const isSuper = a.role === ROLES.SUPER_ADMIN
                  const isMe = a._id === me?._id
                  return (
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r ${
                              isSuper ? "from-purple-500 to-pink-500" : "from-blue-500 to-cyan-500"
                            }`}
                          >
                            {isSuper ? <Crown className="w-4 h-4 text-white" /> : <UserCog className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {a.name}
                              {isMe && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">You</span>}
                            </div>
                            <div className="text-sm text-gray-500">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{a.phone || "—"}</td>
                      <td className="px-4 py-4 whitespace-nowrap"><RoleBadge role={a.role} /></td>
                      <td className="px-4 py-4 whitespace-nowrap"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          {!isMe && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleStatus(a)}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              >
                                {a.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => remove(a)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
