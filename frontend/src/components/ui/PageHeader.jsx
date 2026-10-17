const gradients = {
  blue: "from-blue-500 to-blue-600",
  emerald: "from-emerald-500 to-emerald-600",
  green: "from-green-500 to-green-600",
  red: "from-red-500 to-red-600",
  purple: "from-purple-500 to-purple-600",
  orange: "from-orange-500 to-orange-600",
  indigo: "from-indigo-500 to-indigo-600",
}

export default function PageHeader({ icon: Icon, title, subtitle, color = "blue", actions }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-r ${gradients[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  )
}
