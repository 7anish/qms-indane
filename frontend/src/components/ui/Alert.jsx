import { AlertCircle, CheckCircle } from "lucide-react"

const styles = {
  error: { box: "bg-red-50 text-red-700 border-red-200", Icon: AlertCircle },
  success: { box: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle },
}

export default function Alert({ type = "error", children }) {
  if (!children) return null
  const { box, Icon } = styles[type]
  return (
    <div className={`flex items-start gap-2 border p-4 rounded-lg text-sm ${box}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
