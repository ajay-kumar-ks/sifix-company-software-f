import React, {useEffect, useState} from 'react'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'
import { FaSearch } from 'react-icons/fa'

export default function Dashboard(){
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isEmployee = localStorage.getItem('user_role') === 'employee'

  useEffect(()=>{
    const token = localStorage.getItem('token')
    fetch(import.meta.env.VITE_API_URL + '/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load dashboard data')
        return r.json()
      })
      .then(data => {
        setData(data)
      })
      .catch(() => setError('Unable to load dashboard data.'))
      .finally(() => setLoading(false))
  },[])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Premium header */}
        <header
          style={{
            backgroundColor: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ flex: 1, position: 'relative', maxWidth: '360px' }}>
            <FaSearch
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                pointerEvents: 'none',
              }}
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid ' + (searchFocused ? 'var(--accent)' : 'var(--border-color)'),
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                boxShadow: searchFocused ? '0 0 0 3px rgba(0,149,246,0.15)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </header>

        {/* Page title area */}
        <div style={{ padding: '24px 24px 0' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            {isEmployee
              ? `Welcome back, ${data?.user?.employee_name || 'Employee'}. Your personal CRM summary is below.`
              : 'Welcome back, Admin. Here&apos;s what&apos;s happening today.'}
          </p>
        </div>

        <main className="p-6 w-full" style={{ maxWidth: '1000px' }}>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)' }} className="text-center py-24">
              <Loader label="Loading dashboard data..." />
            </div>
          ) : error ? (
            <div style={{ color: 'var(--text-secondary)' }} className="text-center py-24">
              {error}
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                  }}
                  className="p-5"
                >
                  <div style={{ color: 'var(--text-secondary)' }} className="text-xs font-semibold uppercase tracking-wider mb-1">{isEmployee ? 'Contacts' : 'Users'}</div>
                  <div className="text-2xl font-bold">{isEmployee ? (data.stats?.users ?? '—') : (data.stats?.users ?? '—')}</div>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                  }}
                  className="p-5"
                >
                  <div style={{ color: 'var(--text-secondary)' }} className="text-xs font-semibold uppercase tracking-wider mb-1">{isEmployee ? 'Leads' : 'Active'}</div>
                  <div className="text-2xl font-bold">{isEmployee ? (data.stats?.active ?? '—') : (data.stats?.active ?? '—')}</div>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                  }}
                  className="p-5"
                >
                  <div style={{ color: 'var(--text-secondary)' }} className="text-xs font-semibold uppercase tracking-wider mb-1">{isEmployee ? 'Clients' : 'Message'}</div>
                  <div className="text-lg font-medium">{isEmployee ? (data.stats?.clients ?? '—') : data.message}</div>
                </div>
              </div>

              {/* Recent activity placeholder */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                  marginTop: '24px',
                  padding: '20px 24px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>{isEmployee ? 'Your CRM Snapshot' : 'Recent Activity'}</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {isEmployee
                    ? 'You can review the contacts, leads, and clients assigned to your account from the CRM section.'
                    : 'No recent activity to display.'}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
