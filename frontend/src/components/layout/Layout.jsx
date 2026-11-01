import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Header from "./Header"

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile drawer whenever the route changes
  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <div className="flex h-screen bg-page">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="app-main flex-1 overflow-x-hidden overflow-y-auto bg-page">{children}</main>
      </div>
    </div>
  )
}
