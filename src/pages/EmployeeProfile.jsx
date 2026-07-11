import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import { FaUserCircle, FaLock, FaSignOutAlt } from 'react-icons/fa'

export default function EmployeeProfile() {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const info = localStorage.getItem('user_info')
    const role = localStorage.getItem('user_role')
    if (role !== 'employee' || !info) {
      navigate('/login')
      return
    }
    setUserInfo(JSON.parse(info))
  }, [])

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 3) {
      setError('Password must be at least 3 characters')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hr/profile/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to update password')
      }
      setMessage('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_info')
    navigate('/login')
  }

  if (!userInfo) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #0095f6, #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sifix
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Employee Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ThemeToggle />
            <button onClick={handleLogout} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '999px', border: '1px solid var(--border-color)',
              backgroundColor: 'transparent', color: '#ed4956', cursor: 'pointer', fontSize: '0.85rem',
            }}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div style={{ maxWidth: '680px', margin: '40px auto', padding: '0 20px', width: '100%' }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px',
            border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            textAlign: 'center', marginBottom: '24px',
          }}>
            <FaUserCircle style={{ fontSize: '4rem', color: 'var(--accent)', marginBottom: '12px' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{userInfo.employee_name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>{userInfo.employee_position}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{userInfo.employee_email}</p>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: 'rgba(0,149,246,0.12)', color: 'var(--accent)',
              }}>
                @{userInfo.username}
              </span>
              <span style={{
                padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                backgroundColor: 'rgba(34,197,94,0.12)', color: '#15803d',
              }}>
                {userInfo.role}
              </span>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '28px',
            border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <FaLock style={{ color: 'var(--accent)', fontSize: '1.1rem' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Change Password</h2>
            </div>

            {message && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(34,197,94,0.1)', color: '#15803d', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px', borderRadius: '999px', border: 'none',
                  backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
                  opacity: submitting ? 0.6 : 1, fontSize: '0.9rem',
                }}
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              You can only change your password. Other profile details are managed by HR.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}