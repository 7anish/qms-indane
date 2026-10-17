import { useEffect, useState } from "react"
import { CheckCircle, Download, FileSpreadsheet, Upload, X, XCircle } from "lucide-react"
import Modal from "@/components/ui/Modal"
import Spinner from "@/components/ui/Spinner"
import { MAX_FILE_SIZE } from "@/utils/constants"
import { saveBlob } from "@/utils/download"

/**
 * Two-step Excel import: download the template, then upload the filled file.
 * - downloadTemplate(): Promise<Blob>
 * - importFile(file): Promise<{ data: { created } }>
 * - entityLabel: plural noun shown in the success message, e.g. "companies"
 */
export default function ImportExcelModal({
  open,
  title,
  description,
  templateFileName,
  entityLabel,
  downloadTemplate,
  importFile,
  onClose,
  onImported,
}) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [created, setCreated] = useState(null)
  const [error, setError] = useState("")
  const [rowErrors, setRowErrors] = useState([])

  useEffect(() => {
    if (!open) return
    setFile(null)
    setCreated(null)
    setError("")
    setRowErrors([])
  }, [open])

  const handleDownload = async () => {
    setDownloading(true)
    setError("")
    try {
      saveBlob(await downloadTemplate(), templateFileName)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  const pickFile = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ""
    setError("")
    setRowErrors([])
    setCreated(null)
    if (!picked) return
    if (!picked.name.toLowerCase().endsWith(".xlsx")) return setError("Please choose an .xlsx Excel file")
    if (picked.size > MAX_FILE_SIZE) return setError(`File must be smaller than ${MAX_FILE_SIZE / (1024 * 1024)} MB`)
    setFile(picked)
  }

  const handleUpload = async () => {
    setUploading(true)
    setError("")
    setRowErrors([])
    try {
      const res = await importFile(file)
      setCreated(res.data.created)
      setFile(null)
      onImported()
    } catch (err) {
      setError(err.message)
      setRowErrors(err.errors || [])
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose} size="max-w-2xl">
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-medium text-blue-900">Step 1 · Download the template</p>
          {description && <p className="text-sm text-blue-800 mt-1">{description}</p>}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {downloading ? <Spinner size="sm" className="border-white" /> : <Download className="w-4 h-4" />}
            Download Sample Excel
          </button>
        </div>

        <div>
          <p className="font-medium text-gray-900 mb-2">Step 2 · Upload the filled file</p>
          {file ? (
            <div className="flex items-center justify-between gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-800 truncate">{file.name}</span>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Select the filled .xlsx file</p>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={pickFile}
                className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
              />
            </div>
          )}
        </div>

        {created !== null && (
          <div className="flex items-start gap-2 bg-green-50 text-green-700 border border-green-200 p-4 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Imported <b>{created}</b> {entityLabel}.
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            {rowErrors.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-red-200 bg-white">
                <table className="w-full">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      {["Row", "Problem"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {rowErrors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-sm text-gray-700 w-16">{e.row}</td>
                        <td className="px-3 py-2 text-sm text-red-700">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            {created !== null ? "Done" : "Cancel"}
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {uploading ? <Spinner size="sm" className="border-white" /> : <Upload className="w-4 h-4" />}
            Import
          </button>
        </div>
      </div>
    </Modal>
  )
}
