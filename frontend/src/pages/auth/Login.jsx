import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { Building2, Eye, EyeOff, FileText, ListChecks, LogIn, Mail, ShieldCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import Spinner from "@/components/ui/Spinner"
import { APP_NAME } from "@/utils/constants"

const inputBase =
  "w-full h-11 px-3.5 bg-white border border-line rounded-lg text-sm text-ink placeholder:text-gray-400 shadow-sm hover:border-gray-300 focus:outline-none focus:border-primary focus:ring-4 focus:ring-blue-500/10 transition-colors"

// What the product does, shown on the brand panel
const FEATURES = [
  { icon: FileText, text: "Create quotations with rates, terms and PDF in minutes" },
  { icon: Building2, text: "Companies, members and their quotation history" },
  { icon: Mail, text: "Reusable email templates to send quotations fast" },
  { icon: ShieldCheck, text: "Role-based access for super admins and admins" },
]

function BrandMark({ size = "w-11 h-11", icon = "w-5 h-5" }) {
  return (
    <div className={`${size} rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-blue-950/40`}>
      <ListChecks className={`${icon} text-white`} />
    </div>
  )
}

export default function Login() {
  const { admin, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (admin) return <Navigate to="/dashboard" replace />

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await login(form)
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row-reverse bg-page">
      {/* FORM (right on desktop) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-xl font-bold text-ink tracking-tight">{APP_NAME}</p>
              <p className="text-xs text-muted">Quotation Management System</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line shadow-lg mt-8 p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in to your account</h1>
            <p className="mt-1 text-sm text-muted">Admins and super admins sign in here.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/15 rounded-xl px-4 py-3 text-sm"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputBase}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${inputBase} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 rounded-lg text-sm font-semibold shadow-sm shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting ? <Spinner size="sm" className="border-white" /> : <LogIn className="w-4 h-4" />}
                {submitting ? "Logging in…" : "Log In"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Don't have an account? <span className="font-semibold text-ink">Contact your super admin</span>
          </p>
        </div>
      </div>

      {/* BRAND PANEL (left on desktop) */}
      <div className="hidden lg:flex relative overflow-hidden text-white bg-navy lg:w-1/2">
        {/* Soft brand glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full bg-indigo-600/25 blur-3xl" />
        {/* Faint dot grid */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative flex flex-col justify-between w-full px-12 xl:px-16 py-12">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-lg font-bold tracking-wide">{APP_NAME} PORTAL</span>
          </div>

          <div>
            <h2 className="text-4xl xl:text-5xl font-semibold tracking-tight leading-tight">
              Every quotation,
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                one place.
              </span>
            </h2>
            <p className="mt-4 text-base text-slate-300 max-w-md">
              Quotation management for your team — companies, products, pricing, terms and emails, all in one
              dashboard.
            </p>
            <ul className="mt-8 space-y-3.5">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-inset ring-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-300" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
