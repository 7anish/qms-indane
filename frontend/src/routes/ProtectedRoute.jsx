import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import Spinner from "@/components/ui/Spinner"

export default function ProtectedRoute({ children, roles }) {
  const { admin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading…</span>
      </div>
    )
  }

  if (!admin) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(admin.role)) return <Navigate to="/dashboard" replace />

  return children
}
