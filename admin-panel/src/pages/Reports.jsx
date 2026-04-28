import { useState } from 'react'
import Layout from '../components/layout/Layout'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { adminApi } from '../api/admin'

function fmtMins(m) { const h = Math.floor((m||0)/60); return `${h}h ${(m||0)%60}m` }
function fmtDate(s) { return s ? new Date(s).toLocaleDateString() : '—' }

function exportCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [report, setReport] = useState([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', min_focus: 0 })
  const [sortCol, setSortCol] = useState('total_focus_minutes')
  const [sortDir, setSortDir] = useState('desc')

  const run = async () => {
    setLoading(true); setRan(false)
    const params = {}
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.min_focus) params.min_focus = filters.min_focus
    const { data } = await adminApi.reportUsers(params)
    setReport(data); setRan(true); setLoading(false)
  }

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sorted = [...report].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol]
    if (va == null) return 1; if (vb == null) return -1
    return sortDir === 'asc' ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
  })

  const COLS = [
    { key: 'username', label: 'Username' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'is_active', label: 'Active', render: v => <span className={v ? 'badge-green' : 'badge-red'}>{v ? 'Yes' : 'No'}</span> },
    { key: 'total_focus_minutes', label: 'Focus Time', render: fmtMins },
    { key: 'total_tasks', label: 'Tasks' },
    { key: 'total_pomodoros', label: 'Pomodoros' },
    { key: 'avg_productivity_score', label: 'Avg Score', render: v => `${v}%` },
    { key: 'active_days', label: 'Active Days' },
    { key: 'last_seen', label: 'Last Seen', render: fmtDate },
    { key: 'created_at', label: 'Joined', render: fmtDate },
  ]

  return (
    <Layout title="Reports" subtitle="Generate and export user activity reports">
      {/* Filters */}
      <div className="card p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Report Filters</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">From Date</label>
            <input type="date" className="input w-40"
              value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">To Date</label>
            <input type="date" className="input w-40"
              value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Min Focus (mins)</label>
            <input type="number" min="0" className="input w-32"
              value={filters.min_focus} onChange={e => setFilters(f => ({ ...f, min_focus: +e.target.value }))} />
          </div>
          <button onClick={run} disabled={loading} className="btn-primary disabled:opacity-50 h-9">
            {loading ? 'Running…' : '▶ Run Report'}
          </button>
          {ran && report.length > 0 && (
            <button onClick={() => exportCSV(report, 'focusmind_report.csv')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors h-9">
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingSpinner text="Generating report…" />}

      {ran && !loading && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-400">{report.length} users in report</p>
            <p className="text-xs text-slate-600">Click column headers to sort</p>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead className="border-b border-slate-700 bg-slate-900/50">
                  <tr>
                    {COLS.map(col => (
                      <th key={col.key} onClick={() => toggleSort(col.key)}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-200 select-none">
                        {col.label} {sortCol === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={COLS.length} className="px-4 py-10 text-center text-slate-500">No data matches your filters</td></tr>
                  ) : sorted.map(row => (
                    <tr key={row.id} className="hover:bg-slate-700/30">
                      {COLS.map(col => (
                        <td key={col.key} className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                          {col.render ? col.render(row[col.key]) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
