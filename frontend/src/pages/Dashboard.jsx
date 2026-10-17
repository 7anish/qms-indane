import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  Mail,
  Package,
  PencilLine,
  Plus,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react"
import { dashboardApi } from "@/api/dashboard.api"
import { useAuth } from "@/context/AuthContext"
import PageHeader from "@/components/ui/PageHeader"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import QuotationsChart from "@/components/dashboard/QuotationsChart"
import { QuotationStatusBadge } from "@/pages/quotations/QuotationList"
import { formatDateTime, formatPrice } from "@/utils/format"
import { monthTitle } from "@/utils/quotationCalc"

const WIZARD_STEPS = ["Company", "Products", "Terms", "Email Template", "Recipients", "Quotation Preview", "Email Preview"]

const colorCls = {
  indigo: { border: "border-l-indigo-500", tile: "bg-indigo-50", icon: "text-indigo-600" },
  blue: { border: "border-l-blue-500", tile: "bg-blue-50", icon: "text-blue-600" },
  amber: { border: "border-l-amber-500", tile: "bg-amber-50", icon: "text-amber-600" },
  green: { border: "border-l-green-500", tile: "bg-green-50", icon: "text-green-600" },
  emerald: { border: "border-l-emerald-500", tile: "bg-emerald-50", icon: "text-emerald-600" },
  purple: { border: "border-l-purple-500", tile: "bg-purple-50", icon: "text-purple-600" },
}

const quickLinks = [
  { to: "/quotations/create", title: "New Quotation", desc: "Rates, terms & PDF", color: "indigo" },
  { to: "/companies", title: "Companies", desc: "Companies & members", color: "emerald" },
  { to: "/products", title: "Products", desc: "Cylinders & pricing", color: "blue" },
  { to: "/email-templates", title: "Email Templates", desc: "Reusable emails", color: "purple" },
  { to: "/terms", title: "Terms & Conditions", desc: "Headings & points", color: "orange" },
  { to: "/admins", title: "All Admins", desc: "View & manage", color: "blue" },
  { to: "/admins/create", title: "Create Admin", desc: "Add a new account", color: "purple", superAdminOnly: true },
]

const tileCls = {
  indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
  emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
  blue: "from-blue-50 to-blue-100 border-blue-200",
  purple: "from-purple-50 to-purple-100 border-purple-200",
  orange: "from-orange-50 to-orange-100 border-orange-200",
}
const arrowCls = {
  indigo: "text-indigo-600",
  emerald: "text-emerald-600",
  blue: "text-blue-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

function StatCard({ label, value, caption, icon: Icon, color, to }) {
  const body = (
    <div
      className={`h-full bg-white rounded-xl shadow-sm border-l-4 ${colorCls[color].border} p-5 hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1 tabular-nums">{value}</p>
          <p className="text-sm text-gray-500 truncate">{caption}</p>
        </div>
        <div className={`w-12 h-12 ${colorCls[color].tile} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${colorCls[color].icon}`} />
        </div>
      </div>
    </div>
  )
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}

function Card({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function ViewAll({ to, label = "View all" }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
      {label}
      <ChevronRight className="w-4 h-4" />
    </Link>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="text-center py-10">
      <Icon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

function PriceDelta({ oldPrice, newPrice }) {
  const diff = newPrice - oldPrice
  const up = diff > 0
  const Icon = up ? TrendingUp : TrendingDown
  const pct = oldPrice ? Math.abs((diff / oldPrice) * 100).toFixed(1) : null
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        up ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
      }`}
    >
      <Icon className="w-3 h-3" />
      {up ? "+" : "−"}
      {formatPrice(Math.abs(diff))}
      {pct !== null && ` (${pct}%)`}
    </span>
  )
}

export default function Dashboard() {
  const { admin, isSuperAdmin } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    setError("")
    dashboardApi
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle={`${greeting()}, ${admin?.name}`} />
        <Alert>{error}</Alert>
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-600">Loading dashboard…</span>
          </div>
        )}
      </div>
    )
  }

  const { stats } = data
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={`${greeting()}, ${admin?.name} · ${today}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/quotations/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Quotation
            </Link>
          </div>
        }
      />

      <Alert>{error}</Alert>

      {(stats.quotations.ready > 0 || stats.quotations.draft > 0) && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 flex-1">
            {stats.quotations.ready > 0 && (
              <>
                <b>{stats.quotations.ready}</b> quotation{stats.quotations.ready === 1 ? " is" : "s are"} ready but not emailed yet.{" "}
              </>
            )}
            {stats.quotations.draft > 0 && (
              <>
                <b>{stats.quotations.draft}</b> draft{stats.quotations.draft === 1 ? "" : "s"} waiting to be finished.
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          label="Quotations"
          value={stats.quotations.createdThisMonth}
          caption={`this month · ${stats.quotations.total} in total`}
          icon={FileText}
          color="indigo"
          to="/quotations"
        />
        <StatCard
          label="Ready to Send"
          value={stats.quotations.ready}
          caption="completed, not emailed"
          icon={Send}
          color="blue"
          to="/quotations"
        />
        <StatCard
          label="Drafts"
          value={stats.quotations.draft}
          caption="to continue"
          icon={PencilLine}
          color="amber"
          to="/quotations"
        />
        <StatCard
          label="Emails Sent"
          value={stats.emailsThisMonth}
          caption={`this month · ${stats.quotations.sent} quotations sent`}
          icon={Mail}
          color="green"
        />
        <StatCard
          label="Companies"
          value={stats.companies.total}
          caption={`${stats.companies.active} active · ${stats.companies.members} members`}
          icon={Building2}
          color="emerald"
          to="/companies"
        />
        <StatCard
          label="Products"
          value={stats.products.active}
          caption={`active · ${stats.products.total} in total`}
          icon={Package}
          color="purple"
          to="/products"
        />
      </div>

      <QuotationsChart data={data.chart} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Ready to Send" icon={Send} action={<ViewAll to="/quotations" />}>
          {data.readyToSend.length === 0 ? (
            <Empty icon={Send} text="Nothing waiting - every completed quotation has been emailed." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.readyToSend.map((q) => (
                <li key={q._id} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold font-mono text-gray-900">{q.quotationNumber}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {q.companyName} · {monthTitle(q.rateMonth)} · {q.recipients} recipient{q.recipients === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-gray-400">created {formatDateTime(q.createdAt)}</p>
                  </div>
                  <Link
                    to={`/quotations/${q._id}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Continue Drafts" icon={PencilLine} action={<ViewAll to="/quotations" />}>
          {data.drafts.length === 0 ? (
            <Empty icon={PencilLine} text="No drafts. Use Save Draft in the quotation wizard to finish later." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.drafts.map((d) => (
                <li key={d._id} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.companyName}</p>
                    <p className="text-sm text-gray-600 truncate">
                      Step {d.step + 1}: {WIZARD_STEPS[d.step] || "—"}
                      {d.products.length > 0 && ` · ${d.products.join(", ")}`}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> saved {formatDateTime(d.updatedAt)}
                    </p>
                  </div>
                  <Link
                    to={`/quotations/${d._id}/edit`}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent Quotations" icon={FileText} action={<ViewAll to="/quotations" />}>
        {data.recentQuotations.length === 0 ? (
          <Empty icon={FileText} text="No quotations yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Quotation No", "Company", "Products", "Rates For", "Created", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentQuotations.map((q) => (
                  <tr key={q._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/quotations/${q._id}`} className="text-sm font-semibold font-mono text-blue-700 hover:text-blue-800">
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{q.companyName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <span className="line-clamp-1">{q.products.join(", ")}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{monthTitle(q.rateMonth)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDateTime(q.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuotationStatusBadge status={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Emails" icon={Mail}>
          {data.recentEmails.length === 0 ? (
            <Empty icon={Mail} text="No quotation emails sent yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentEmails.map((e, i) => (
                <li key={i} className="px-6 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/quotations/${e.quotationId}`} className="text-sm font-semibold text-gray-900 hover:text-blue-700 truncate">
                      {e.subject}
                    </Link>
                    {e.mode === "mock" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 shrink-0">Mock</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    To {e.to.join(", ")} · <span className="font-mono">{e.quotationNumber}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(e.sentAt)}
                    {e.sentBy && ` by ${e.sentBy}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Price Changes" icon={History} action={<ViewAll to="/products" label="Products" />}>
          {data.recentPriceChanges.length === 0 ? (
            <Empty icon={History} text="No price changes recorded yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recentPriceChanges.map((p, i) => (
                <li key={i} className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <Link to={`/products/${p.productId}`} className="text-sm font-semibold text-gray-900 hover:text-blue-700 truncate block">
                      {p.name}
                    </Link>
                    <p className="text-sm text-gray-600">
                      <span className="line-through text-gray-400">{formatPrice(p.oldPrice)}</span> → {formatPrice(p.newPrice)}
                    </p>
                    <p className="text-xs text-gray-400">{formatDateTime(p.changedOn)}</p>
                  </div>
                  <PriceDelta oldPrice={p.oldPrice} newPrice={p.newPrice} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Current Rates" icon={Package} action={<ViewAll to="/products" />}>
            {data.currentRates.length === 0 ? (
              <Empty icon={Package} text="No active products yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Product", "Gas", "Capacity", "Current Price", "Last Change"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.currentRates.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <Link to={`/products/${p._id}`} className="font-medium text-gray-900 hover:text-blue-700">
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.gasType}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{p.capacityKg} kg</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatPrice(p.currentPrice)} <span className="font-normal text-gray-500">/ {p.unit}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {p.lastChange ? (
                            <PriceDelta oldPrice={p.lastChange.oldPrice} newPrice={p.lastChange.newPrice} />
                          ) : (
                            <span className="text-xs text-gray-400">No changes</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card title="Top Companies" icon={Trophy} action={<ViewAll to="/companies" />}>
          {data.topCompanies.length === 0 ? (
            <Empty icon={Building2} text="No quotations yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.topCompanies.map((c, i) => (
                <li key={c._id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/companies/${c._id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-700 truncate block">
                      {c.name}
                    </Link>
                    <p className="text-xs text-gray-400">last {formatDateTime(c.last)}</p>
                  </div>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm tabular-nums shrink-0">
                    {c.quotations} quotation{c.quotations === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks
            .filter((l) => !l.superAdminOnly || isSuperAdmin)
            .map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`group relative bg-gradient-to-r ${tileCls[l.color]} rounded-xl p-6 hover:shadow-lg transition-all duration-300 border hover:-translate-y-1 flex items-center justify-between overflow-hidden`}
              >
                <div className="relative z-10">
                  <div className="font-semibold text-gray-900 mb-1">{l.title}</div>
                  <div className="text-sm text-gray-600">{l.desc}</div>
                </div>
                <ChevronRight className={`w-5 h-5 ${arrowCls[l.color]} group-hover:translate-x-1 transition-transform duration-300`} />
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
