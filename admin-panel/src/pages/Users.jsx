import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import DataTable from '../components/ui/DataTable'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Modal from '../components/ui/Modal'
import { adminApi } from '../api/admin'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtLastSeen(s) {
  if (!s) return 'Never'
  const diff = Date.now() - new Date(s)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function isOnline(s) {
  if (!s) return false
  return Date.now() - new Date(s) < 15 * 60 * 1000
}

const COLUMNS = [
  {
    key: 'name', label: 'User', sortable: true,
    render: (v, row) => (
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {v?.[0]?.toUpperCase() || '?'}
          </div>
          {isOnline(row.last_seen) && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-800" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{v}</p>
          <p className="text-xs text-slate-500">@{row.username}</p>
        </div>
      </div>
    ),
  },
  { key: 'email', label: 'Email', sortable: true, render: v => <span className="text-slate-400 text-xs">{v}</span> },
  {
    key: 'is_active', label: 'Status', sortable: true,
    render: (v, row) => (
      <div className="flex flex-col gap-1">
        <span className={v ? 'badge-green' : 'badge-red'}>{v ? 'Active' : 'Inactive'}</span>
        {row.is_admin && <span className="badge-purple">Admin</span>}
      </div>
    ),
  },
  {
    key: 'last_seen', label: 'Last Seen', sortable: true,
    render: v => <span className={`text-xs ${isOnline(v) ? 'text-emerald-400' : 'text-slate-500'}`}>{fmtLastSeen(v)}</span>,
  },
  {
    key: 'stats', label: 'Tasks', sortable: false,
    render: (v) => <span className="text-sm">{v?.completed_tasks ?? 0} / {v?.total_tasks ?? 0}</span>,
  },
  {
    key: 'stats', label: 'Focus', sortable: false,
    render: (v) => {
      const m = v?.total_focus_minutes || 0
      const h = Math.floor(m / 60)
      return <span className="text-sm">{h}h {m % 60}m</span>
    },
  },
  {
    key: 'stats', label: 'Score', sortable: false,
    render: (v) => {
      const s = v?.avg_productivity_score || 0
      const color = s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400'
      return <span className={`text-sm font-medium ${color}`}>{s}%</span>
    },
  },
  { key: 'created_at', label: 'Joined', sortable: true, render: fmtDate },
]

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (filterActive !== '') params.is_active = filterActive === 'active'
    adminApi.users(params).then(r => setUsers(r.data)).finally(() => setLoading(false))
  }, [search, filterActive])

  useEffect(() => { load() }, [load])

  const handlePatch = async (id, body) => {
    await adminApi.patchUser(id, body)
    load()
    setSelected(null)
  }

  const handleDelete = async (id) => {
    await adminApi.deleteUser(id)
    setConfirmDelete(null)
    load()
  }

  return (
    <Layout title="Users" subtitle={`${users.length} users loaded`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="input max-w-xs"
          placeholder="Search name, username, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input max-w-40"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
        >
          <option value="">All users</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <button onClick={load} className="btn-ghost text-sm">↻ Refresh</button>
        <div className="ml-auto flex gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Online</span>
        </div>
      </div>

      {loading ? <LoadingSpinner text="Loading users…" /> : (
        <DataTable
          columns={COLUMNS}
          data={users}
          onRowClick={row => navigate(`/users/${row.id}`)}
          emptyMsg="No users found"
        />
      )}

      {/* User quick-action modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="User Actions">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white">
                {selected.name?.[0]}
              </div>
              <div>
                <p className="font-medium text-white">{selected.name}</p>
                <p className="text-sm text-slate-400">{selected.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handlePatch(selected.id, { is_active: !selected.is_active })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selected.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                {selected.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handlePatch(selected.id, { is_admin: !selected.is_admin })}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors">
                {selected.is_admin ? 'Remove Admin' : 'Make Admin'}
              </button>
            </div>
            <button onClick={() => { setSelected(null); navigate(`/users/${selected.id}`) }}
              className="btn-primary w-full">
              View Full Profile
            </button>
            <button onClick={() => { setConfirmDelete(selected); setSelected(null) }}
              className="w-full px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              Delete User
            </button>
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirm Delete">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Permanently delete <span className="text-white font-medium">{confirmDelete.name}</span>?
              This will remove all their tasks, notes, and data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
