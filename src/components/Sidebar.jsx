import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FaThLarge,
  FaAddressBook,
  FaUserCircle,
  FaSignOutAlt,
  FaUser,
  FaUsers,
  FaLock,
  FaHistory,
} from 'react-icons/fa'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileInfo, setProfileInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_info') || '{}')
    } catch {
      return {}
    }
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const role = localStorage.getItem('user_role')
  const isEmployee = role === 'employee'
  const menuItems = [
    { path: isEmployee ? '/employee/dashboard' : '/dashboard', icon: FaThLarge, label: 'Dashboard' },
    { path: isEmployee ? '/employee/crm' : '/crm', icon: FaAddressBook, label: 'CRM' },
    ...(isEmployee ? [] : [{ path: '/hr', icon: FaUsers, label: 'HR' }, { path: '/audit-log', icon: FaHistory, label: 'Activity Log' }]),
  ]

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_info')
    navigate('/login')
  }

  function handleProfile() {
    setMenuOpen(false)
    if (isEmployee) {
      try {
        setProfileInfo(JSON.parse(localStorage.getItem('user_info') || '{}'))
      } catch {
        setProfileInfo({})
      }
      setProfileMessage('')
      setProfileError('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setProfileModalOpen(true)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setProfileError('')
    setProfileMessage('')

    if (newPassword !== confirmPassword) {
      setProfileError('New passwords do not match')
      return
    }
    if (newPassword.length < 3) {
      setProfileError('Password must be at least 3 characters')
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
      setProfileMessage('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [menuOpen])

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
        width: collapsed ? '64px' : '220px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
      }}
    >
      {/* Brand — click to collapse/expand */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-color)',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '10px',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span
          style={{
            fontSize: collapsed ? '1.4rem' : '1.25rem',
            fontWeight: 800,
            color: 'var(--accent)',
            background: 'linear-gradient(135deg, #0095f6, #00d2ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}
        >
          {collapsed ? 'S' : 'Sifix'}
        </span>

      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {menuItems.map(item => (
          <NavLink key={item.path} to={item.path} end>
            {({ isActive }) => (
              <div
                className={`${collapsed ? 'justify-center' : ''} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: collapsed ? '14px 0' : '12px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  backgroundColor: isActive ? 'rgba(0, 149, 246, 0.08)' : 'transparent',
                  transition: 'background-color 0.2s, color 0.2s',
                  borderRadius: '0 8px 8px 0',
                  marginRight: collapsed ? '0' : '12px',
                  position: 'relative',
                }}
              >
                <item.icon style={{ fontSize: '1.2rem', flexShrink: 0 }} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '8px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user profile with dropdown */}
      <div ref={menuRef} style={{ position: 'relative', borderTop: '1px solid var(--border-color)' }}>
        {/* Clickable user area */}
        <div
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '14px 0' : '14px 16px',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          className="hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          title="Profile"
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <FaUserCircle style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', display: 'block' }} />
            <span
              style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid var(--bg-card)',
              }}
            />
          </div>
          {!collapsed && (
            <div style={{ fontSize: '0.8rem', lineHeight: 1.3, flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{isEmployee ? 'Employee' : 'Admin'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isEmployee ? 'Employee Portal' : 'admin@sifix.com'}
              </div>
            </div>
          )}
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: collapsed ? '50%' : '12px',
              transform: collapsed ? 'translateX(-50%)' : 'none',
              minWidth: collapsed ? '180px' : '190px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
              padding: '6px',
              marginBottom: '8px',
              zIndex: 50,
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <div
              onClick={handleProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                transition: 'background-color 0.15s',
              }}
              className="hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <FaUser style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }} />
              Profile
            </div>
            <div
              style={{
                height: '1px',
                backgroundColor: 'var(--border-color)',
                margin: '4px 8px',
              }}
            />
            <div
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#ed4956',
                fontSize: '0.85rem',
                transition: 'background-color 0.15s',
              }}
              className="hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <FaSignOutAlt style={{ fontSize: '0.85rem', flexShrink: 0 }} />
              Logout
            </div>
          </div>
        )}
      </div>

      {profileModalOpen && isEmployee && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setProfileModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              padding: '24px',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Profile</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage your account details and password</p>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(0,149,246,0.08)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Name</div>
                <div style={{ fontWeight: 600 }}>{profileInfo.employee_name || 'Employee'}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(0,149,246,0.08)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</div>
                <div style={{ fontWeight: 600 }}>{profileInfo.employee_email || '-'}</div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: 'rgba(0,149,246,0.08)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Username</div>
                <div style={{ fontWeight: 600 }}>{profileInfo.username || '-'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <FaLock style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Change Password</h4>
            </div>

            {profileMessage && (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#15803d', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                {profileMessage}
              </div>
            )}
            {profileError && (
              <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#b91c1c', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                {profileError}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px 12px', borderRadius: '999px', border: 'none', backgroundColor: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
