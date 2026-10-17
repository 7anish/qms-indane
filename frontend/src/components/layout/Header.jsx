import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, User } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ROLE_LABELS } from "@/utils/constants"

export default function Header() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setBusy(true)
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QMS Portal</h1>
        <p className="text-sm text-gray-500">Manage your system with ease</p>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
          <User className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">{admin?.name}</span>
          <span className="text-gray-500">({ROLE_LABELS[admin?.role]})</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={busy}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  )
}
