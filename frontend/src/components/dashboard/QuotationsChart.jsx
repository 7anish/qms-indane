import { useState } from "react"
import { BarChart3, Table2 } from "lucide-react"

/*
 * Quotations created per month, stacked by current status.
 * Colours are the app's status colours (validated as a set: amber-500 / blue-600 / emerald-600).
 * Amber is low-contrast on white, so identity never relies on colour alone: legend, per-month
 * tooltip with labels, totals above bars, and a table view.
 */
const SERIES = [
  { key: "sent", label: "Sent", swatch: "bg-emerald-600" },
  { key: "ready", label: "Ready", swatch: "bg-blue-600" },
  { key: "draft", label: "Draft", swatch: "bg-amber-500" },
]
// Bottom-to-top stacking order matches the legend read left-to-right
const PLOT_HEIGHT = 200
const TOOLTIP_HEIGHT = 112 // approx. rendered height, used to keep the tooltip inside the plot

const monthLabel = (key, opts = { month: "short" }) => {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleString("en-IN", opts)
}

// Integer axis with at least 0-4, and headroom above the tallest bar for its total label
const niceTicks = (max) => {
  const step = Math.max(1, Math.ceil(max / 4))
  let top = Math.max(4, Math.ceil(max / step) * step)
  if (top === max) top += step
  const ticks = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return ticks
}

export default function QuotationsChart({ data }) {
  const [view, setView] = useState("chart")
  const [hover, setHover] = useState(null)

  const totals = data.map((m) => SERIES.reduce((s, sr) => s + m[sr.key], 0))
  const ticks = niceTicks(Math.max(...totals))
  const top = ticks[ticks.length - 1]
  const empty = totals.every((t) => t === 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quotations per Month</h2>
          <p className="text-sm text-gray-500">Last {data.length} months, by current status</p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {[
            { key: "chart", label: "Chart", icon: BarChart3 },
            { key: "table", label: "Table", icon: Table2 },
          ].map((o) => {
            const Icon = o.icon
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setView(o.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  view === o.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {o.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className={`w-3 h-3 rounded-sm ${s.swatch}`} />
            {s.label}
          </span>
        ))}
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Month", ...SERIES.map((s) => s.label), "Total"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((m, i) => (
                <tr key={m.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{monthLabel(m.month, { month: "long", year: "numeric" })}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} className="px-4 py-3 text-sm text-gray-700 tabular-nums">
                      {m[s.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 tabular-nums">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Gridlines + y-axis labels (recessive) */}
          <div className="absolute inset-y-0 left-0 right-0" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((t) => (
              <div key={t} className="absolute left-0 right-0 flex items-center" style={{ bottom: (t / top) * PLOT_HEIGHT - 6 }}>
                <span className="w-6 text-right text-xs text-gray-400 tabular-nums">{t}</span>
                <span className={`ml-2 flex-1 border-t ${t === 0 ? "border-gray-300" : "border-gray-100"}`} />
              </div>
            ))}
          </div>

          <div className="relative flex items-end justify-around gap-2" style={{ height: PLOT_HEIGHT }}>
            {data.map((m, i) => {
              const total = totals[i]
              const segments = SERIES.filter((s) => m[s.key] > 0)
              const barHeight = (total / top) * PLOT_HEIGHT // exact scale, matches the gridlines
              return (
                <div
                  key={m.month}
                  className="relative flex-1 h-full flex justify-center cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === i && <div className="absolute inset-x-1 inset-y-0 bg-gray-100/60 rounded-md" />}
                  {/* Stack: 2px surface gaps between segments, 4px rounded top end, anchored to the baseline */}
                  <div
                    className="absolute bottom-0 w-3/5 max-w-10 flex flex-col-reverse gap-[2px]"
                    style={{ height: barHeight }}
                  >
                    {segments.map((s, idx) => (
                      <div
                        key={s.key}
                        className={`${s.swatch} w-full ${idx === segments.length - 1 ? "rounded-t" : ""}`}
                        style={{ flexGrow: m[s.key] }}
                      />
                    ))}
                  </div>
                  {total > 0 && (
                    <span className="absolute text-xs font-semibold text-gray-700 tabular-nums" style={{ bottom: barHeight + 4 }}>
                      {total}
                    </span>
                  )}

                  {hover === i && (
                    // Beside the bar (flips side in the right half), level with the bar top, kept inside the plot
                    <div
                      className={`absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 w-40 pointer-events-none ${
                        i < data.length / 2 ? "left-[calc(50%+28px)]" : "right-[calc(50%+28px)]"
                      }`}
                      style={{ top: Math.min(Math.max(0, PLOT_HEIGHT - barHeight - 8), PLOT_HEIGHT - TOOLTIP_HEIGHT) }}
                    >
                      <p className="text-xs font-semibold text-gray-900 mb-1">{monthLabel(m.month, { month: "long", year: "numeric" })}</p>
                      {SERIES.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-sm ${s.swatch}`} />
                            {s.label}
                          </span>
                          <span className="tabular-nums text-gray-900">{m[s.key]}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-semibold text-gray-900 border-t border-gray-100 mt-1 pt-1">
                        <span>Total</span>
                        <span className="tabular-nums">{total}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-around gap-2 mt-2">
            {data.map((m) => (
              <span key={m.month} className="flex-1 text-center text-xs text-gray-500">
                {monthLabel(m.month)}
              </span>
            ))}
          </div>

          {empty && (
            <p className="absolute inset-x-0 top-16 text-center text-sm text-gray-500">No quotations in the last {data.length} months yet</p>
          )}
        </div>
      )}
    </div>
  )
}
