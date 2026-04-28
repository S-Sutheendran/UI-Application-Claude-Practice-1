import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { adminApi } from '../api/admin'

const TYPE_META = {
  task_completed: { label: 'Task Completed', icon: '✅', color: 'badge-green' },
  note_created:   { label: 'Note Created',   icon: '📝', color: 'badge-blue'  },
  user_registered:{ label: 'Registered',     icon: '🎉', color: 'badge-purple' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const PRIORITY_DOT = { high: 'bg-red-400', medium: 'bg-yellow-400', low: 'bg-blue-400' }

export default function Activity() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(50)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    adminApi.activity(limit).then(r => setEvents(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [limit])

  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [limit])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  return (
    <Layout title="Activity Feed" subtitle="Recent platform events — auto-refreshes every 15s">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
          {['all', 'task_completed', 'note_created', 'user_registered'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {f === 'all' ? 'All' : TYPE_META[f]?.label}
            </button>
          ))}
        </div>
        <select className="input max-w-32 text-xs" value={limit} onChange={e => setLimit(+e.target.value)}>
          <option value={25}>25 events</option>
          <option value={50}>50 events</option>
          <option value={100}>100 events</option>
          <option value={200}>200 events</option>
        </select>
        <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
        <span className="text-xs text-slate-600 ml-auto">{filtered.length} events</span>
      </div>

      {loading ? <LoadingSpinner text="Loading activity…" /> : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">No activity yet</div>
          ) : filtered.map((ev, i) => {
            const meta = TYPE_META[ev.type] || { icon: '•', label: ev.type, color: 'badge-blue' }
            return (
              <div key={i} className="card px-4 py-3 flex items-start gap-3 hover:border-slate-600 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-base">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={meta.color}>{meta.label}</span>
                    {ev.priority && (
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ev.priority] || 'bg-slate-500'}`} />
                    )}
                  </div>
                  <p className="text-sm text-slate-200">{ev.detail}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by <span className="text-slate-400 font-medium">{ev.user_name || ev.user}</span>
                    {' '}·{' '}@{ev.user}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-500">{timeAgo(ev.timestamp)}</p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {new Date(ev.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
