import Sidebar from "./Sidebar"
import Header from "./Header"

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
