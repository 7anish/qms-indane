import axios from "axios"
import { TOKEN_KEY } from "@/utils/constants"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Requests made with responseType "blob" (PDF/Excel downloads) get their JSON error body as a Blob
const readErrorBody = async (data) => {
  if (data instanceof Blob && data.type.includes("application/json")) {
    try {
      return JSON.parse(await data.text())
    } catch {
      return {}
    }
  }
  return data || {}
}

client.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== "/login") window.location.href = "/login"
    }
    const body = await readErrorBody(err.response?.data)
    const message = body.message || err.message || "Something went wrong"
    const error = new Error(message)
    error.status = err.response?.status
    error.errors = body.errors || []
    return Promise.reject(error)
  }
)

export default client
