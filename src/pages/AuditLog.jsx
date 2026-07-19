import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'

// Parse an API datetime string (naive UTC) as a proper Date object.
// The backend sends naive UTC ISO strings without timezone info.
// Appending 'Z' tells JavaScript to interpret it as UTC consistently.
function parseApiDate(str) {
  return new Date(str + 'Z')
}

function formatDateTime(str) {
  if (!str) return '—'
  const d = parseApiDate(str)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

const ROWS_PER_PAGE = 20

export default function AuditLog() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    const role = localStorage.getItem('user_role')
    if (role !== 'admin') {
      navigate('/dashboard')
      return
    }

    const token = localStorage.getItem('token')
    async function fetchAuditData() {
      try {
        const [userRes, logRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/audit-logs`, { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (!userRes.ok) {
          const err = await userRes.json().catch(() => null)
          throw new Error(err?.detail || 'Failed to load users for audit filter')
        }
        if (!logRes.ok) {
          const err = await logRes.json().catch(() => null)
          throw new Error(err?.detail || 'Failed to load activity log')
        }

        const userData = await userRes.json()
        const logData = await logRes.json()
        setUsers(Array.isArray(userData) ? userData : [])
        setEntries(Array.isArray(logData) ? logData : [])
      } catch (err) {
        setError(err?.message || 'Unable to load activity log')
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [navigate])

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries.filter(entry => {
      const matchesUser = !userFilter || entry.actor?.toLowerCase().includes(userFilter.toLowerCase())
      const matchesDate = (!startDate || parseApiDate(entry.created_at) >= new Date(startDate)) && (!endDate || parseApiDate(entry.created_at) <= new Date(endDate + 'T23:59:59'))
      const matchesSearch = !query || [entry.action, entry.entity_name, entry.details, entry.actor].join(' ').toLowerCase().includes(query)
      return matchesUser && matchesDate && matchesSearch
    })
  }, [entries, search, startDate, endDate, userFilter])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [search, startDate, endDate, userFilter])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedEntries = useMemo(() => {
    const start = (safePage - 1) * ROWS_PER_PAGE
    return filteredEntries.slice(start, start + ROWS_PER_PAGE)
  }, [filteredEntries, safePage])

  function goToPage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // Build pagination range: show up to 5 page buttons around the current page
  const paginationRange = useMemo(() => {
    const range = []
    const maxVisible = 5
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      range.push(i)
    }
    return range
  }, [safePage, totalPages])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Activity Log</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Track all CRM and pipeline changes made by users</p>
          </div>
          <ThemeToggle />
        </header>
        <main style={{ padding: '24px', flex: 1 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <input value={endDate} onChange={e => setEndDate(e.target.value)} type="date" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minWidth: '180px' }}>
                <option value="">All users</option>
                {users.map(user => <option key={user.username} value={user.username}>{user.label || user.username}</option>)}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, contact, lead, or details" style={{ flex: 1, minWidth: '260px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center' }}><Loader label="Loading activity log..." /></div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No activity found for the selected filters.</div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 8px' }}>Time</th>
                        <th style={{ padding: '12px 8px' }}>User</th>
                        <th style={{ padding: '12px 8px' }}>Action</th>
                        <th style={{ padding: '12px 8px' }}>Entity</th>
                        <th style={{ padding: '12px 8px' }}>Ref #</th>
                        <th style={{ padding: '12px 8px' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.map(entry => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>{formatDateTime(entry.created_at)}</td>
                          <td style={{ padding: '12px 8px' }}>{entry.actor}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{entry.action.replace(/_/g, ' ')}</td>
                          <td style={{ padding: '12px 8px' }}>{entry.entity_type ? `${entry.entity_type}${entry.entity_id ? ` #${entry.entity_id}` : ''}` : '—'}</td>
                          <td style={{ padding: '12px 8px' }}>
                            {(() => {
                              var refMatch = entry.details && entry.details.match(/ref=([^\s;]+)/)
                              if (!refMatch) return <span style={{ color: 'var(--text-secondary)' }}>—</span>
                              var ref = refMatch[1]
                              return (
                                <span
                                  onClick={() => navigate('/crm/contact/' + ref)}
                                  style={{
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(99,102,241,0.10)',
                                    color: '#818cf8',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    display: 'inline-block',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.22)' }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.10)' }}
                                  title="View contact track page"
                                >
                                  {ref}
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{ padding: '12px 8px', maxWidth: '380px' }}>
                            {entry.entity_name && <strong style={{ marginRight: '4px' }}>{entry.entity_name}</strong>}
                            {entry.details ? (
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {entry.details.replace(/\s*ref=[^\s;]+;?/g, '').trim() || '—'}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filteredEntries.length)} of {filteredEntries.length} entries
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage <= 1}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: safePage <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                        cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: safePage <= 1 ? 0.5 : 1,
                        transition: 'background 0.2s',
                      }}
                    >
                      Previous
                    </button>
                    {paginationRange.map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        style={{
                          minWidth: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: pageNum === safePage ? 'var(--accent)' : 'var(--border-color)',
                          backgroundColor: pageNum === safePage ? 'var(--accent)' : 'transparent',
                          color: pageNum === safePage ? '#fff' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: pageNum === safePage ? 700 : 500,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (pageNum !== safePage) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (pageNum !== safePage) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage >= totalPages}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: safePage >= totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
                        cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        opacity: safePage >= totalPages ? 0.5 : 1,
                        transition: 'background 0.2s',
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
