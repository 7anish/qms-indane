import { useMemo, useRef, useState } from "react"
import { Clock, X } from "lucide-react"
import { isEmail } from "@/utils/template"

/**
 * Email address list input: type an address and press Enter/comma (or paste several),
 * or pick from `suggestions` (e.g. recently used addresses).
 */
export default function EmailChipsInput({ value, onChange, suggestions = [], placeholder, max = 20, onError }) {
  const [text, setText] = useState("")
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    return suggestions.filter((s) => !value.includes(s) && (!q || s.includes(q))).slice(0, 8)
  }, [suggestions, value, text])

  const add = (raw) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean)
    if (!parts.length) return true
    const invalid = parts.filter((p) => !isEmail(p))
    if (invalid.length) {
      onError?.(`Invalid email: ${invalid.join(", ")}`)
      return false
    }
    const next = [...new Set([...value, ...parts])]
    if (next.length > max) {
      onError?.(`Up to ${max} addresses allowed`)
      return false
    }
    onError?.("")
    onChange(next)
    return true
  }

  const commit = () => {
    if (add(text)) setText("")
  }

  const onKeyDown = (e) => {
    if (["Enter", ",", ";", "Tab"].includes(e.key) && text.trim()) {
      e.preventDefault()
      commit()
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1))
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1.5 w-full min-h-[42px] px-2 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-text"
      >
        {value.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-sm bg-gray-100 text-gray-800">
            {email}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((v) => v !== email))
              }}
              className="p-0.5 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 cursor-pointer"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion registers first
            setTimeout(() => setOpen(false), 150)
            if (text.trim()) commit()
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text")
            if (/[\s,;]/.test(pasted.trim())) {
              e.preventDefault()
              add(pasted)
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="flex-1 min-w-[160px] px-1 py-1 text-sm outline-none bg-transparent"
        />
      </div>

      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Recently used</p>
          {matches.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                add(s)
                setText("")
                inputRef.current?.focus()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
