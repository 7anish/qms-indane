import { forwardRef, useImperativeHandle, useRef } from "react"
import {
  Bold,
  Heading2,
  Maximize2,
  Highlighter,
  Italic,
  Link2,
  List,
  Minus,
  Palette,
  Pilcrow,
  Table,
  TableProperties,
  Underline,
  WrapText,
} from "lucide-react"
import { previewDocument } from "@/utils/template"

const BLANK_TABLE = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0;">
  <tr>
    <th style="border:1px solid #000;padding:6px 10px;background:#FFFF00;">Item</th>
    <th style="border:1px solid #000;padding:6px 10px;background:#FFFF00;">Rate</th>
    <th style="border:1px solid #000;padding:6px 10px;background:#FFFF00;">Remarks</th>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:6px 10px;">&nbsp;</td>
    <td style="border:1px solid #000;padding:6px 10px;text-align:right;">&nbsp;</td>
    <td style="border:1px solid #000;padding:6px 10px;">&nbsp;</td>
  </tr>
</table>`

function ToolButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep the textarea selection
      onClick={onClick}
      className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}

function ColorTool({ title, icon: Icon, onPick }) {
  return (
    <label
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      className="relative p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
    >
      <Icon className="w-4 h-4" />
      <input
        type="color"
        defaultValue="#dc2626"
        onChange={(e) => onPick(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  )
}

/**
 * HTML email body editor: formatting toolbar + HTML source + live preview.
 * - renderPreview(html) returns the HTML to show in the preview (e.g. with variables filled in)
 * - the ref exposes the underlying textarea (for inserting {{variables}} at the cursor)
 */
const HtmlEmailEditor = forwardRef(function HtmlEmailEditor(
  { value, onChange, renderPreview = (html) => html, onFocus, invalid, rows = 16, onFullscreen },
  ref
) {
  const textareaRef = useRef(null)
  useImperativeHandle(ref, () => textareaRef.current)

  // Wrap the current selection (or a placeholder) with before/after and keep it selected
  const wrap = (before, after = "", placeholder = "") => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || placeholder
    onChange(value.slice(0, start) + before + selected + after + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const insert = (snippet) => wrap(snippet, "", "")

  const addLink = () => {
    const url = window.prompt("Link address", "https://")
    if (url) wrap(`<a href="${url.replace(/"/g, "&quot;")}" style="color:#2563eb;">`, "</a>", "link text")
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${invalid ? "border-red-300" : "border-gray-300"}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <ToolButton title="Bold" onClick={() => wrap("<strong>", "</strong>", "bold text")}>
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Italic" onClick={() => wrap("<em>", "</em>", "italic text")}>
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Underline" onClick={() => wrap("<u>", "</u>", "underlined text")}>
          <Underline className="w-4 h-4" />
        </ToolButton>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <ToolButton title="Heading" onClick={() => wrap('<h2 style="margin:0 0 8px;color:#111827;">', "</h2>", "Heading")}>
          <Heading2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Paragraph" onClick={() => wrap("<p>", "</p>", "Paragraph")}>
          <Pilcrow className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Line break" onClick={() => insert("<br>")}>
          <WrapText className="w-4 h-4" />
        </ToolButton>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <ColorTool title="Text colour" icon={Palette} onPick={(c) => wrap(`<span style="color:${c};">`, "</span>", "coloured text")} />
        <ColorTool
          title="Highlight colour"
          icon={Highlighter}
          onPick={(c) => wrap(`<span style="background:${c};">`, "</span>", "highlighted text")}
        />
        <ToolButton title="Link" onClick={addLink}>
          <Link2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Bulleted list" onClick={() => wrap("<ul>\n  <li>", "</li>\n</ul>", "List item")}>
          <List className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Divider" onClick={() => insert('<hr style="border:none;border-top:1px solid #e5e7eb;">')}>
          <Minus className="w-4 h-4" />
        </ToolButton>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        <ToolButton title="Insert table" onClick={() => insert(BLANK_TABLE)}>
          <Table className="w-4 h-4" />
        </ToolButton>
        <button
          type="button"
          title="Insert the quotation's pricing table"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert("{{pricingTable}}")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors cursor-pointer"
        >
          <TableProperties className="w-4 h-4" />
          Pricing table
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          rows={rows}
          spellCheck={false}
          placeholder="<p>Dear {{recipientName}},</p>"
          className="w-full px-3 py-2 font-mono text-xs leading-5 outline-none resize-y border-b lg:border-b-0 lg:border-r border-gray-200 bg-white"
        />
        <div className="bg-white">
          <div className="flex items-center justify-between px-3 pt-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</p>
            {onFullscreen && (
              <button
                type="button"
                onClick={onFullscreen}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                title="Full screen preview"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Full screen
              </button>
            )}
          </div>
          {/* sandbox without allow-scripts: previewed HTML can never run code */}
          <iframe title="Email preview" sandbox="" srcDoc={previewDocument(renderPreview(value))} className="w-full h-full min-h-[320px]" />
        </div>
      </div>
    </div>
  )
})

export default HtmlEmailEditor
