import { useEffect, useMemo } from "react"
import { CheckCircle, ExternalLink, FileText, Trash2, Upload, X } from "lucide-react"
import { MAX_FILE_SIZE } from "@/utils/constants"

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const isImage = (type) => type?.startsWith("image/")

/**
 * File input styled as a dropzone.
 * - existing: stored file metadata from the API ({ url, originalName, mimeType, size })
 * - file: newly selected File (not yet uploaded)
 * - removed: true when the user asked to delete the existing file
 */
export default function FileField({ label, accept, hint, existing, file, removed, onSelect, onRemoveExisting, onError }) {
  const previewUrl = useMemo(() => (file && isImage(file.type) ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  const handleChange = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ""
    if (!picked) return
    if (picked.size > MAX_FILE_SIZE) {
      onError?.(`${label}: file must be smaller than ${MAX_FILE_SIZE / (1024 * 1024)} MB`)
      return
    }
    onSelect(picked)
  }

  const labelEl = <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

  if (file) {
    return (
      <div>
        {labelEl}
        <div className="flex items-center justify-between gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 min-w-0">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-green-200" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-green-800 truncate">{file.name}</p>
              <p className="text-xs text-green-700">{formatSize(file.size)} · ready to upload</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (existing && !removed) {
    return (
      <div>
        {labelEl}
        <div className="flex items-center justify-between gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 min-w-0">
            {isImage(existing.mimeType) ? (
              <img src={existing.url} alt="" className="w-12 h-12 rounded-lg object-cover border border-blue-200" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">{existing.originalName}</p>
              <p className="text-xs text-blue-700">{formatSize(existing.size)} · uploaded</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={existing.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
              title="View"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <label className="p-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer" title="Replace">
              <Upload className="w-4 h-4" />
              <input type="file" accept={accept} onChange={handleChange} className="hidden" />
            </label>
            {onRemoveExisting && (
              <button
                type="button"
                onClick={onRemoveExisting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {labelEl}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
        />
      </div>
    </div>
  )
}
