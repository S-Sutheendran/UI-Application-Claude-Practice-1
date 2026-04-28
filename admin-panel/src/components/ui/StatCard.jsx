export default function StatCard({ label, value, sub, icon, color = 'violet', trend }) {
  const colors = {
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/30 text-violet-400',
    cyan:   'from-cyan-600/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    emerald:'from-emerald-600/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-500/30 text-yellow-400',
    rose:   'from-rose-600/20 to-rose-600/5 border-rose-500/30 text-rose-400',
    blue:   'from-blue-600/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  }

  return (
    <div className={`card p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs yesterday
            </p>
          )}
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
    </div>
  )
}
