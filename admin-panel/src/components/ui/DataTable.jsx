import { useState } from 'react'

export default function DataTable({ columns, data, onRowClick, keyField = 'id', emptyMsg = 'No data' }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (col) => {
    if (!col.sortable) return
    if (sortCol === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col.key); setSortDir('asc') }
  }

  const sorted = [...(data || [])].sort((a, b) => {
    if (!sortCol) return 0
    const va = a[sortCol], vb = b[sortCol]
    if (va == null) return 1; if (vb == null) return -1
    return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
  })

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  className={`text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-200 select-none' : ''}`}
                >
                  {col.label}
                  {sortCol === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                  {emptyMsg}
                </td>
              </tr>
            ) : sorted.map(row => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-700/40' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
