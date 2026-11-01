const gradients = {
  blue: "from-blue-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  green: "from-green-500 to-green-600",
  red: "from-red-500 to-red-600",
  purple: "from-violet-500 to-purple-600",
  orange: "from-orange-500 to-orange-600",
  indigo: "from-indigo-500 to-indigo-600",
}

export default function PageHeader({ icon: Icon, title, subtitle, color = "blue", actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-12 h-12 shrink-0 bg-gradient-to-br ${gradients[color] || gradients.blue} rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  )
}
