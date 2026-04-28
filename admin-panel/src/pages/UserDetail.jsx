import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Layout from '../components/layout/Layout'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { adminApi } from '../api/admin'

const TooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
}

const PRIORITY_COLORS = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-blue' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtMins(m) {
  const h = Math.floor((m || 0) / 60), mn = (m || 0) % 60
  return mn ? `${h}h ${mn}m` : `${h}h`
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getUser(id),
      adminApi.userTasks(id),
      adminApi.userNotes(id),
      adminApi.userSessions(id),
      adminApi.userStats(id, 30),
    ]).then(([u, t, n, s, st]) => {
      setUser(u.data); setTasks(t.data); setNotes(n.data)
      setSessions(s.data); setStats(st.data.reverse())
    }).finally(() => setLoading(false))
  }, [id])

  const handlePatch = async (body) => {
    const { data } = await adminApi.patchUser(id, body)
    setUser(data)
  }

  if (loading) return <Layout title="User Detail"><LoadingSpinner text="Loading profile…" /></Layout>
  if (!user) return <Layout title="User Detail"><p className="text-slate-400">User not found</p></Layout>

  const s = user.stats || {}

  const TABS = ['overview', 'tasks', 'notes', 'sessions', 'stats']

  return (
    <Layout title={user.name} subtitle={`@${user.username} · ${user.email}`}>
      {/* Back */}
      <button onClick={() => navigate('/users')} className="btn-ghost text-sm mb-4">← All Users</button>

      {/* Profile header */}
      <div className="card p-5 mb-5">
        <div className="flex flex-wrap items-start gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-bold text-white">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-800 ${user.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white">{user.name}</h2>
              {user.is_admin && <span className="badge-purple">Admin</span>}
              <span className={user.is_active ? 'badge-green' : 'badge-red'}>{user.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-slate-400 text-sm">@{user.username} · {user.email}</p>
            <p className="text-slate-500 text-xs mt-1">Joined {fmtDate(user.created_at)} · Last seen {user.last_seen ? fmtDate(user.last_seen) : 'never'}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handlePatch({ is_active: !user.is_active })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${user.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
              {user.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => handlePatch({ is_admin: !user.is_admin })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors">
              {user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-5 pt-5 border-t border-slate-700">
          {[
            { label: 'Tasks', value: `${s.completed_tasks}/${s.total_tasks}` },
            { label: 'Focus', value: fmtMins(s.total_focus_minutes) },
            { label: 'Pomodoros', value: s.total_pomodoros },
            { label: 'Notes', value: s.total_notes },
            { label: 'Streak', value: `${s.streak_days}d` },
            { label: 'Avg Score', value: `${s.avg_productivity_score}%` },
            { label: 'Daily Goal', value: `${user.daily_goal} 🍅` },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-base font-bold text-white">{item.value ?? '—'}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Productivity Score (30 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip {...TooltipStyle} formatter={v => [`${v}%`, 'Score']} />
                <Line type="monotone" dataKey="productivity_score" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Focus Minutes (30 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip {...TooltipStyle} formatter={v => [fmtMins(v), 'Focus']} />
                <Bar dataKey="focus_minutes" fill="#06b6d4" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 bg-slate-900/50">
              <tr>
                {['Title', 'Priority', 'Status', 'Due Date', 'Tags'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tasks.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No tasks</td></tr>
              ) : tasks.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-slate-200 max-w-xs truncate">{t.title}</td>
                  <td className="px-4 py-3"><span className={PRIORITY_COLORS[t.priority] || 'badge-blue'}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={t.completed ? 'badge-green' : 'badge-yellow'}>{t.completed ? 'Done' : 'Pending'}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.due_date || '—'}</td>
                  <td className="px-4 py-3">{(t.tags || []).map(tag => <span key={tag} className="badge-blue mr-1">{tag}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'notes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length === 0
            ? <p className="text-slate-500 col-span-3 py-10 text-center">No notes</p>
            : notes.map(n => (
              <div key={n.id} className="card p-4" style={{ borderLeftColor: n.color || '#7c3aed', borderLeftWidth: 3 }}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-white truncate">{n.title || 'Untitled'}</h4>
                  {n.pinned && <span className="text-yellow-400 text-xs">📌</span>}
                </div>
                <p className="text-xs text-slate-400 line-clamp-3">{n.content_preview}</p>
                <p className="text-xs text-slate-600 mt-2">{fmtDate(n.updated_at)}</p>
              </div>
            ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 bg-slate-900/50">
              <tr>
                {['Type', 'Duration', 'Completed At', 'Hour', 'Day'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sessions.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No sessions</td></tr>
              ) : sessions.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><span className={s.type === 'focus' ? 'badge-violet' : 'badge-blue'}>{s.type}</span></td>
                  <td className="px-4 py-3 text-slate-300">{s.duration} min</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(s.completed_at)}</td>
                  <td className="px-4 py-3 text-slate-400">{s.hour_of_day}:00</td>
                  <td className="px-4 py-3 text-slate-400">{DAYS[s.day_of_week] || s.day_of_week}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stats' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 bg-slate-900/50">
              <tr>
                {['Date', 'Focus', 'Pomodoros', 'Tasks Done', 'Notes', 'Score'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No stats</td></tr>
              ) : [...stats].reverse().map(r => (
                <tr key={r.date}>
                  <td className="px-4 py-3 text-slate-300 font-medium">{r.date}</td>
                  <td className="px-4 py-3 text-slate-400">{fmtMins(r.focus_minutes)}</td>
                  <td className="px-4 py-3 text-slate-400">{r.pomodoros}</td>
                  <td className="px-4 py-3 text-slate-400">{r.tasks_completed}</td>
                  <td className="px-4 py-3 text-slate-400">{r.notes_created}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${r.productivity_score >= 70 ? 'text-emerald-400' : r.productivity_score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {r.productivity_score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
