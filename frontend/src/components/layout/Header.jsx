import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Menu } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ROLE_LABELS } from "@/utils/constants"

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "A"

export default function Header({ onMenuClick }) {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const handleLogout = async () => {
    setBusy(true)
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <header className="h-[72px] shrink-0 bg-white border-b border-line px-4 md:px-7 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-ink truncate">QMS Portal</h1>
          <p className="hidden sm:block text-sm text-muted truncate">Manage your system with ease</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 pl-1 pr-1 sm:pr-4 py-1 rounded-full sm:border sm:border-line">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-sm font-semibold flex items-center justify-center">
            {initials(admin?.name)}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-semibold text-ink">{admin?.name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[admin?.role]}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={busy}
          className="h-[42px] flex items-center gap-2 px-4 text-sm font-medium text-gray-700 bg-white border border-line rounded-lg hover:border-red-200 hover:bg-red-50 hover:text-danger disabled:opacity-50 cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
