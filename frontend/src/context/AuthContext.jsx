import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { authApi } from "@/api/auth.api"
import { ROLES, TOKEN_KEY } from "@/utils/constants"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((res) => setAdmin(res.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials)
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setAdmin(res.data.admin)
    return res.data.admin
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setAdmin(null)
    }
  }, [])

  const value = {
    admin,
    loading,
    login,
    logout,
    isSuperAdmin: admin?.role === ROLES.SUPER_ADMIN,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
