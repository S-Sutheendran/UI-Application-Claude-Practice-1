import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import Layout from '../components/layout/Layout'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { adminApi } from '../api/admin'

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

function fmtMins(m) {
  if (!m) return '0h'
  const h = Math.floor(m / 60), min = m % 60
  return min ? `${h}h ${min}m` : `${h}h`
}

const TooltipStyle = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    adminApi.overview().then(r => setData(r.data)).finally(() => setLoading(false))
    const t = setInterval(() => adminApi.overview().then(r => setData(r.data)), 30000)
    return () => clearInterval(t)
  }, [])

  if (loading) return <Layout title="Dashboard"><LoadingSpinner text="Loading overview…" /></Layout>

  const daily = data?.daily_platform_data || []
  const regs = data?.registrations_by_day || []

  const pieData = [
    { name: 'Active', value: data?.active_users || 0 },
    { name: 'Inactive', value: (data?.total_users || 0) - (data?.active_users || 0) },
  ]

  return (
    <Layout title="Dashboard" subtitle="Platform overview — auto-refreshes every 30s">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Users"     value={data?.total_users}            icon="👥" color="violet" />
        <StatCard label="Online Now"      value={data?.online_users}           icon="🟢" color="emerald" sub="last 15 min" />
        <StatCard label="New Today"       value={data?.new_users_today}        icon="✨" color="cyan" />
        <StatCard label="Focus Today"     value={fmtMins(data?.focus_minutes_today)} icon="🍅" color="yellow" />
        <StatCard label="Tasks Today"     value={data?.tasks_completed_today}  icon="✅" color="blue" />
        <StatCard label="Avg Score"       value={`${data?.avg_productivity_score ?? 0}%`} icon="⭐" color="rose" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Daily focus area chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Focus Minutes (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TooltipStyle} formatter={v => [fmtMins(v), 'Focus']} />
              <Area type="monotone" dataKey="focus_minutes" stroke="#7c3aed" fill="url(#gFocus)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Registrations area chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">User Registrations (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={regs}>
              <defs>
                <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#gReg)" strokeWidth={2} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Tasks bar chart */}
        <div className="card p-5 col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Tasks & Pomodoros (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip {...TooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="tasks_completed" name="Tasks" fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="pomodoros" name="Pomodoros" fill="#7c3aed" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User status pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">User Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip {...TooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i] }} />
                {d.name}: <span className="text-white font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Focus Time', value: fmtMins(data?.total_focus_minutes), icon: '⏱' },
          { label: 'Total Pomodoros', value: data?.total_pomodoros?.toLocaleString(), icon: '🍅' },
          { label: 'Tasks Completed', value: data?.total_tasks_completed?.toLocaleString(), icon: '✅' },
          { label: 'Notes Created', value: data?.total_notes_created?.toLocaleString(), icon: '📝' },
        ].map(item => (
          <div key={item.label} className="card p-4 flex items-center gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="text-lg font-bold text-white">{item.value ?? '—'}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
