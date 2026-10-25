import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Building2, Download, ExternalLink, FileText, History, Mail, Send, ShieldCheck, Trash2 } from "lucide-react"
import { quotationApi } from "@/api/quotation.api"
import { useAuth } from "@/context/AuthContext"
import Spinner from "@/components/ui/Spinner"
import Alert from "@/components/ui/Alert"
import { formatDateTime, formatPrice } from "@/utils/format"
import { GST_MODE, monthTitle } from "@/utils/quotationCalc"
import { QuotationStatusBadge } from "./QuotationList"
import SendEmailModal from "./SendEmailModal"

function InfoCard({ icon: Icon, label, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="text-sm text-gray-900">{children}</div>
      </div>
    </div>
  )
}

export default function QuotationDetail() {
  const { quotationId } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [q, setQ] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [sendOpen, setSendOpen] = useState(false)

  useEffect(() => {
    quotationApi
      .get(quotationId)
      .then((res) => {
        // Unfinished quotations are edited in the wizard
        if (res.data.status === "draft") navigate(`/quotations/${res.data._id}/edit`, { replace: true })
        else setQ(res.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [quotationId, navigate])

  const remove = async () => {
    if (!window.confirm(`Delete quotation ${q.quotationNumber} and its PDF? This cannot be undone.`)) return
    try {
      await quotationApi.remove(quotationId)
      navigate("/quotations", { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
        <span className="ml-3 text-gray-600">Loading quotation…</span>
      </div>
    )
  }

  if (!q) {
    return (
      <div className="p-6 space-y-6">
        <Alert>{error || "Quotation not found"}</Alert>
        <Link to="/quotations" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" /> Back to quotations
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Link to="/quotations" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All quotations
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{q.quotationNumber}</h1>
              <QuotationStatusBadge status={q.status} />
            </div>
            <p className="text-gray-600">
              Rates for {monthTitle(q.rateMonth)} · created {formatDateTime(q.createdAt)}
              {q.createdBy?.name && ` by ${q.createdBy.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSuccess("")
              setSendOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {q.status === "sent" ? "Resend Email" : "Send Email"}
          </button>
          {q.pdf && (
            <>
              <a
                href={q.pdf.url}
                download={`${q.quotationNumber}.pdf`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <a
                href={`${process.env.VITE_PDF_URL}${q.pdf.url}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </>
          )}
          {isSuperAdmin && (
            <button
              onClick={remove}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Building2} label="Company">
          <Link to={`/companies/${q.company}`} className="font-medium hover:text-blue-700">
            {q.companySnapshot.name}
          </Link>
          <div className="text-xs text-gray-500 font-mono">{q.companySnapshot.gstNumber}</div>
        </InfoCard>
        <InfoCard icon={FileText} label="GST">
          {q.gstMode === GST_MODE.INCLUDED ? "Included in price" : "Excluded (added on top)"} @ {q.gstRate}%
        </InfoCard>
        <InfoCard icon={ShieldCheck} label="Security Deposit">
          <span className="font-semibold">{formatPrice(q.securityDeposit)}</span>
        </InfoCard>
        <InfoCard icon={Mail} label={`Send to · template: ${q.emailTemplate?.name || "built-in"}`}>
          {q.recipients.map((r) => (
            <div key={r.email} className="truncate">
              {r.name} <span className="text-gray-500">({r.email})</span>
            </div>
          ))}
        </InfoCard>
      </div>

      {q.emails?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Email History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Sent On", "To / CC / BCC", "Subject", "Template", "Sent By"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...q.emails].reverse().map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(e.sentAt)}
                      {e.mode === "mock" && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Mock</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div>{e.to.join(", ")}</div>
                      {e.cc?.length > 0 && <div className="text-xs text-gray-500">CC: {e.cc.join(", ")}</div>}
                      {e.bcc?.length > 0 && <div className="text-xs text-gray-500">BCC: {e.bcc.join(", ")}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{e.subject}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{e.template?.name || "Built-in"}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{e.sentBy?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quotation PDF</h2>
        </div>
        <div className="p-4">
          {q.pdf ? (
            <iframe title={q.quotationNumber} src={q.pdf.url} className="w-full h-[80vh] rounded-lg border border-gray-200" />
          ) : (
            <p className="text-sm text-gray-500 text-center py-12">No PDF stored for this quotation.</p>
          )}
        </div>
      </div>

      <SendEmailModal
        open={sendOpen}
        quotation={q}
        onClose={() => setSendOpen(false)}
        onSent={(updated, message) => {
          setQ(updated)
          setSendOpen(false)
          setSuccess(message)
        }}
      />
    </div>
  )
}
