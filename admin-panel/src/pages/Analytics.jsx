import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import Layout from '../components/layout/Layout'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { adminApi } from '../api/admin'

const TT = { contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 } }
const PIE_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e', none: '#64748b' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmtMins(m) { const h = Math.floor((m||0)/60); return `${h}h ${(m||0)%60}m` }

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    adminApi.analytics(days).then(r => setData(r.data)).finally(() => setLoading(false))
  }, [days])

  if (loading) return <Layout title="Analytics"><LoadingSpinner text="Crunching numbers…" /></Layout>

  const { daily = [], top_users_by_focus = [], focus_by_hour = [], focus_by_day_of_week = [], priority_distribution = [] } = data

  const pieData = priority_distribution.map(d => ({ name: d.priority || 'none', value: d.count }))

  const dowData = DAYS.map((name, i) => ({ name, sessions: focus_by_day_of_week.find(d => d.day === i)?.sessions || 0 }))

  return (
    <Layout title="Analytics" subtitle="Platform-wide engagement and usage data">
      {/* Time range */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === d ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* Row 1 - Active users + Focus trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Active Users</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gDau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="active_users" name="Active Users" stroke="#06b6d4" fill="url(#gDau)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Avg Productivity Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TT} formatter={v => [`${v}%`, 'Avg Score']} />
              <Line type="monotone" dataKey="avg_score" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 - Focus by hour + day of week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Focus Sessions by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={focus_by_hour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}:00`} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TT} labelFormatter={v => `${v}:00–${v+1}:00`} />
              <Bar dataKey="sessions" name="Sessions" fill="#7c3aed" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Focus Sessions by Day of Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TT} />
              <Bar dataKey="sessions" name="Sessions" fill="#06b6d4" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 - Top users + Priority dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top 10 Users by Focus Time</h3>
          <div className="space-y-3">
            {top_users_by_focus.map((u, i) => {
              const max = top_users_by_focus[0]?.total_focus_minutes || 1
              const pct = Math.round((u.total_focus_minutes / max) * 100)
              return (
                <div key={u.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-4">#{i+1}</span>
                      <span className="text-sm text-slate-300">{u.name || u.username}</span>
                    </div>
                    <span className="text-xs text-slate-500">{fmtMins(u.total_focus_minutes)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full">
                    <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {top_users_by_focus.length === 0 && <p className="text-slate-500 text-sm text-center py-6">No data yet</p>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Task Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                {pieData.map((d) => <Cell key={d.name} fill={PIE_COLORS[d.name] || '#64748b'} />)}
              </Pie>
              <Tooltip {...TT} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[d.name] }} />
                {d.name}: <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
