import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  List,
  ListChecks,
  Mail,
  Package,
  Plus,
  ScrollText,
  Store,
  UserCog,
  Users,
  UserPlus,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { APP_NAME } from "@/utils/constants"

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  {
    label: "Quotations",
    icon: FileText,
    basePath: "/quotations",
    // In every section the "add" item comes first, then the lists
    children: [
      { label: "New Quotation", to: "/quotations/create", icon: Plus },
      { label: "All Quotations", to: "/quotations", icon: List },
      { label: "Company Quotations", to: "/quotations/companies", icon: Building2 },
    ],
  },
  {
    label: "Companies",
    icon: Building2,
    basePath: "/companies",
    children: [
      { label: "Add Company", to: "/companies/create", icon: Plus },
      { label: "All Companies", to: "/companies", icon: List },
    ],
  },
  {
    label: "Products",
    icon: Package,
    basePath: "/products",
    children: [
      { label: "Add Product", to: "/products/create", icon: Plus },
      { label: "All Products", to: "/products", icon: List },
    ],
  },
  {
    label: "Markets",
    icon: Store,
    basePath: "/markets",
    children: [
      { label: "Add Market", to: "/markets/create", icon: Plus },
      { label: "All Markets", to: "/markets", icon: List },
    ],
  },
  {
    label: "Terms",
    icon: ScrollText,
    basePath: "/terms",
    children: [
      { label: "Add Terms", to: "/terms/create", icon: Plus },
      { label: "All Terms", to: "/terms", icon: List },
    ],
  },
  {
    label: "Email Templates",
    icon: Mail,
    basePath: "/email-templates",
    children: [
      { label: "New Template", to: "/email-templates/create", icon: Plus },
      { label: "All Templates", to: "/email-templates", icon: List },
    ],
  },
  {
    label: "Admins",
    icon: Users,
    basePath: "/admins",
    children: [
      { label: "Create Admin", to: "/admins/create", icon: UserPlus, superAdminOnly: true },
      { label: "All Admins", to: "/admins", icon: UserCog },
    ],
  },
]

const itemBase = "flex items-center gap-3 px-3 h-10 rounded-lg transition-colors duration-200"
const activeCls = "bg-primary text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)]"
const idleCls = "text-slate-300 hover:bg-white/[0.06] hover:text-white"

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { isSuperAdmin } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() =>
    Object.fromEntries(navItems.filter((i) => i.children).map((i) => [i.label, pathname.startsWith(i.basePath)]))
  )

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-navy/60 backdrop-blur-[2px] lg:hidden transition-opacity ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] shrink-0 bg-navy flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-[72px] shrink-0 px-6 flex items-center justify-between border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <ListChecks className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-bold text-white">{APP_NAME}</h1>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Menu</p>

        <nav className="flex-1 px-4 pb-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon

            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `${itemBase} ${isActive ? activeCls : idleCls}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              )
            }

            const isOpen = open[item.label]
            const inSection = pathname.startsWith(item.basePath)
            const children = item.children.filter((c) => !c.superAdminOnly || isSuperAdmin)
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [item.label]: !s[item.label] }))}
                  className={`${itemBase} w-full justify-between cursor-pointer ${
                    inSection ? "text-white bg-white/[0.04]" : idleCls
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
                {isOpen && (
                  <div className="ml-5 mt-1 mb-2 pl-3 border-l border-white/[0.08] space-y-1">
                    {children.map((child) => {
                      const ChildIcon = child.icon
                      // The section's root link (e.g. "All Companies") stays active on nested
                      // pages like /companies/:id, unless a sibling link matches exactly.
                      const isActive =
                        pathname === child.to ||
                        (child.to === item.basePath &&
                          pathname.startsWith(`${item.basePath}/`) &&
                          !children.some((c) => c.to === pathname))
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={() => `${itemBase} h-9 text-sm ${isActive ? activeCls : idleCls}`}
                        >
                          <ChildIcon className="w-4 h-4" />
                          <span className="font-medium">{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
