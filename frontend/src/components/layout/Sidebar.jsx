import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  List,
  ListChecks,
  Mail,
  Package,
  Plus,
  ScrollText,
  UserCog,
  Users,
  UserPlus,
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

const itemBase = "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200"
const activeCls = "bg-blue-50 text-blue-700 border-l-4 border-blue-600"

export default function Sidebar() {
  const { isSuperAdmin } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() =>
    Object.fromEntries(navItems.filter((i) => i.children).map((i) => [i.label, pathname.startsWith(i.basePath)]))
  )

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="px-6 py-4.5 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{APP_NAME}</h1>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon

          if (!item.children) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${itemBase} ${isActive ? activeCls : "text-gray-700 hover:bg-gray-100"}`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            )
          }

          const isOpen = open[item.label]
          const children = item.children.filter((c) => !c.superAdminOnly || isSuperAdmin)
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => setOpen((s) => ({ ...s, [item.label]: !s[item.label] }))}
                className={`${itemBase} w-full justify-between text-gray-700 hover:bg-gray-100 cursor-pointer`}
              >
                <span className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isOpen && (
                <div className="ml-6 mt-2 space-y-1">
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
                        className={() =>
                          `${itemBase} text-sm ${
                            isActive ? activeCls : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`
                        }
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
  )
}
