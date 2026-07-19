import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import Loader from '../components/Loader'

// Parse an API datetime string (naive UTC) as a proper Date object.
// The backend sends naive UTC ISO strings without timezone info.
// Appending 'Z' tells JavaScript to interpret it as UTC consistently.
function parseApiDate(str) {
  return new Date(str + 'Z')
}

function formatDate(date) {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
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

// ─── Activity log helpers ──────────────────────────────────────────────────

const ACTIVITY_CONFIG = {
  created_contact: {
    label: 'Created Contact',
    icon: '✦',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.10)',
  },
  updated_contact: {
    label: 'Updated Contact',
    icon: '✎',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
  },
  moved_to_leads: {
    label: 'Moved to Leads',
    icon: '➜',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.10)',
  },
  changed_phase: {
    label: 'Phase Changed',
    icon: '⇄',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.10)',
  },
  converted_to_client: {
    label: 'Converted to Client',
    icon: '✓',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  sent_email: {
    label: 'Email Sent',
    icon: '✉',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.10)',
  },
  sent_whatsapp: {
    label: 'WhatsApp Message',
    icon: '💬',
    color: '#25D366',
    bg: 'rgba(37,211,102,0.10)',
  },
  made_call: {
    label: 'Phone Call',
    icon: '📞',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.10)',
  },
}

function getActivityConfig(action) {
  return ACTIVITY_CONFIG[action] || {
    label: action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon: '○',
    color: 'var(--text-secondary)',
    bg: 'var(--bg-secondary)',
  }
}

function Badge({ children, color = 'var(--accent)', variant = 'filled' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: variant === 'filled' ? (color + '22') : 'transparent',
        border: variant === 'outline' ? `1.5px solid ${color}44` : 'none',
        color: color,
      }}
    >
      {children}
    </span>
  )
}

function formatRelativeTime(dateStr) {
  const now = Date.now()
  const then = parseApiDate(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800) return 'yesterday'
  const d = parseApiDate(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDetails(action, details) {
  if (!details) return null

  // Follow-up pattern: "Email sent to John — "Subject" | Notes"
  const emailMatch = details.match(/^Email sent to ([^—]+) — "([^"]+)" \| (.+)$/)
  if (emailMatch) {
    return (
      <span>
        To <Badge color="#3b82f6">{emailMatch[1].trim()}</Badge>
        <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>·</span>
        <span style={{ fontWeight: 600 }}>"{emailMatch[2]}"</span>
      </span>
    )
  }

  // WhatsApp pattern
  const waMatch = details.match(/^WhatsApp sent to ([^—]+) — "([^"]+)" \| (.+)$/)
  if (waMatch) {
    return (
      <span>
        To <Badge color="#25D366">{waMatch[1].trim()}</Badge>
        <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>·</span>
        <span style={{ fontWeight: 600 }}>"{waMatch[2]}"</span>
      </span>
    )
  }

  // Call pattern
  const callMatch = details.match(/^Phone Call sent to ([^—]+)(?: — "([^"]+)")? \| (.+)$/)
  if (callMatch) {
    return (
      <span>
        With <Badge color="#f97316">{callMatch[1].trim()}</Badge>
        {callMatch[2] && (
          <>
            <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>·</span>
            <span style={{ fontWeight: 600 }}>"{callMatch[2]}"</span>
          </>
        )}
      </span>
    )
  }

  // Phase change: "Moved from 'Intro' to 'Proposal' | ..."
  const moveMatch = details.match(/^Moved from '([^']+)' to '([^']+)'/)
  if (moveMatch) {
    return (
      <span>
        Moved from <Badge>{moveMatch[1]}</Badge>
        <span style={{ margin: '0 6px', color: 'var(--text-secondary)' }}>→</span>
        <Badge color="#10b981">{moveMatch[2]}</Badge>
      </span>
    )
  }

  // Updated fields: "Updated fields: name, email | ..."
  const updateMatch = details.match(/^Updated fields: ([^|]+)/)
  if (updateMatch) {
    const fields = updateMatch[1].split(', ')
    return (
      <span>
        Updated fields:{' '}
        {fields.map((f, i) => (
          <React.Fragment key={f}>
            {i > 0 && <span style={{ color: 'var(--text-secondary)' }}>, </span>}
            <Badge color="#f59e0b" variant="outline">{f}</Badge>
          </React.Fragment>
        ))}
      </span>
    )
  }

  // Created contact/lead
  if (details.startsWith('Created ')) {
    const type = details.includes('lead') ? 'lead' : 'contact'
    return <span>New {type} record created</span>
  }

  // Moved to leads
  if (details.startsWith('Moved to leads')) {
    return <span>Promoted from contact to lead pipeline</span>
  }

  // Converted to client
  const clientMatch = details.match(/^Converted to client via phase '([^']+)'/)
  if (clientMatch) {
    return (
      <span>
        Promoted to client via <Badge color="#10b981">{clientMatch[1]}</Badge>
      </span>
    )
  }

  // Fallback
  return <span>{details.length > 120 ? details.slice(0, 120) + '…' : details}</span>
}

const FOLLOW_UP_TYPES = [
  { value: 'email', label: 'Email', icon: '✉', color: '#3b82f6' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { value: 'call', label: 'Call', icon: '📞', color: '#f97316' },
]

// ─── Follow-up form component ──────────────────────────────────────────────

function FollowUpForm({ onSubmit, onCancel, contactName }) {
  const [type, setType] = useState('email')
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ followup_type: type, subject: subject.trim() || null, details: details.trim() || null })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {FOLLOW_UP_TYPES.map(ft => (
          <button
            key={ft.value}
            type="button"
            onClick={() => setType(ft.value)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '10px',
              border: '2px solid',
              borderColor: type === ft.value ? ft.color : 'var(--border-color)',
              backgroundColor: type === ft.value ? ft.color + '18' : 'transparent',
              color: type === ft.value ? ft.color : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            {ft.icon} {ft.label}
          </button>
        ))}
      </div>

      <input
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder={type === 'call' ? 'Call purpose / topic' : 'Subject'}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
        }}
      />

      <textarea
        value={details}
        onChange={e => setDetails(e.target.value)}
        placeholder="Notes, summary, or any additional information..."
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            cursor: submitting ? 'wait' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Adding...' : 'Add Entry'}
        </button>
      </div>
    </form>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function ContactDetails() {
  const { referenceId } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [logs, setLogs] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const contactRes = await fetch(`${import.meta.env.VITE_API_URL}/contacts/reference/${encodeURIComponent(referenceId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!contactRes.ok) {
          throw new Error('Unable to load contact details')
        }
        const contactData = await contactRes.json()
        setContact(contactData)

        const [logsRes, followUpsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/contacts/${contactData.id}/logs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/contacts/${contactData.id}/follow-ups`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!logsRes.ok) {
          throw new Error('Unable to load contact logs')
        }
        const logsData = await logsRes.json()
        setLogs(Array.isArray(logsData) ? logsData : [])

        if (followUpsRes.ok) {
          const followUpsData = await followUpsRes.json()
          setFollowUps(Array.isArray(followUpsData) ? followUpsData : [])
        }
      } catch (err) {
        setError(err.message || 'Failed to load contact details')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [referenceId, navigate])

  const isLead = contact?.stage?.toLowerCase() === 'lead' || contact?.pipeline_id != null
  const isClient = contact?.is_client

  // Only show first 5 logs unless expanded
  const displayedLogs = showAllLogs ? logs : logs.slice(0, 5)

  const statusColor = contact?.status === 'Active' ? '#10b981'
    : contact?.status === 'Contacted' ? '#3b82f6'
    : contact?.status === 'Lead' ? '#8b5cf6'
    : '#f59e0b'

  async function handleAddFollowUp(payload) {
    const token = localStorage.getItem('token')
    setFollowUpSubmitting(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/contacts/${contact.id}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.detail || 'Failed to add follow-up')
      }
      const created = await res.json()
      setFollowUps(prev => [created, ...prev])

      // Refresh activity logs to include the new entry
      const logsRes = await fetch(`${import.meta.env.VITE_API_URL}/contacts/${contact.id}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(Array.isArray(logsData) ? logsData : [])
      }

      setShowFollowUpForm(false)
    } catch (err) {
      console.error('Failed to add follow-up:', err)
    } finally {
      setFollowUpSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ flex: 1 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                padding: '6px 12px',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              ← Back to CRM
            </button>
          </div>
          <ThemeToggle />
        </header>

        <main style={{ padding: '24px', flex: 1 }}>
          {loading ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '80px' }}>
              <Loader label="Loading contact details..." />
            </div>
          ) : error ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '80px' }}>
              {error}
            </div>
          ) : (
            contact && (
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* ─── Header / Identity card ─── */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  padding: '28px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{contact.name}</h1>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: statusColor + '18',
                          color: statusColor,
                          border: `1px solid ${statusColor}33`,
                        }}>
                          {contact.status}
                        </span>
                        {isClient && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16,185,129,0.3)',
                          }}>
                            Client
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Reference:</strong> {contact.reference_id || contact.id}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Stage:</strong> {contact.stage}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Owner:</strong> {contact.owner}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Company:</strong> {contact.company_name || '—'}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Email:</strong> {contact.email}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Phone:</strong> {contact.phone || '—'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '10px', minWidth: '200px' }}>
                      <div style={{ padding: '14px 18px', borderRadius: '14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Created</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatDateTime(contact.created_at)}</div>
                      </div>
                      <div style={{ padding: '14px 18px', borderRadius: '14px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Last Updated</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatDateTime(contact.updated_at)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', marginTop: '24px' }}>
                  {/* ─── Left column: Details ─── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ opacity: 0.6 }}>📋</span> Contact Details
                      </h2>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description</div>
                          <div style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{contact.description || 'No description available.'}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Job Title</div>
                            <div>{contact.job_title || '—'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Address</div>
                            <div>{contact.address || '—'}</div>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tags</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {Array.isArray(contact.tags) && contact.tags.length
                              ? contact.tags.map(tag => (
                                  <span key={tag} style={{
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    backgroundColor: 'rgba(99,102,241,0.10)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                  }}>
                                    {tag}
                                  </span>
                                ))
                              : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ opacity: 0.6 }}>📌</span> Journey Status
                      </h2>
                      {isClient ? (
                        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.3rem' }}>✅</span>
                            <div style={{ fontWeight: 700, color: '#10b981' }}>Client</div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            This contact has been successfully converted to a client. They have completed the full journey from contact through the pipeline.
                          </div>
                        </div>
                      ) : isLead ? (
                        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.3rem' }}>🔄</span>
                            <div style={{ fontWeight: 700, color: '#8b5cf6' }}>Active Lead</div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            Currently progressing through the pipeline at stage <strong>{contact.stage}</strong>. Track their journey below.
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.3rem' }}>📇</span>
                            <div style={{ fontWeight: 700, color: '#f59e0b' }}>Contact</div>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            This contact has not yet been moved to a pipeline. Use the "Move to Leads" action on the CRM page to start their journey.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── Right column: Follow-ups & Activity Timeline ─── */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* ─── Follow-ups card ─── */}
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <span style={{ opacity: 0.6 }}>📤</span> Follow-ups
                          {followUps.length > 0 && (
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-secondary)',
                              padding: '2px 10px',
                              borderRadius: '999px',
                            }}>
                              {followUps.length}
                            </span>
                          )}
                        </h2>
                        <button
                          onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--accent)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          + New
                        </button>
                      </div>

                      {showFollowUpForm && (
                        <FollowUpForm
                          onSubmit={handleAddFollowUp}
                          onCancel={() => setShowFollowUpForm(false)}
                          contactName={contact.name}
                        />
                      )}

                      {followUps.length === 0 && !showFollowUpForm ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '24px 16px',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '14px',
                          border: '1px dashed var(--border-color)',
                          fontSize: '0.85rem',
                        }}>
                          No follow-ups logged yet. Click "+ New" to add an email, WhatsApp, or call record.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px', marginTop: followUps.length > 0 ? '12px' : 0 }}>
                          {followUps.slice(0, 5).map(fu => {
                            const ft = FOLLOW_UP_TYPES.find(t => t.value === fu.followup_type) || FOLLOW_UP_TYPES[0]
                            return (
                              <div
                                key={fu.id}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  padding: '12px',
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  border: '1px solid var(--border-color)',
                                  transition: 'background 0.2s',
                                }}
                              >
                                <div style={{
                                  flexShrink: 0,
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '10px',
                                  backgroundColor: ft.color + '15',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1rem',
                                }}>
                                  {ft.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: ft.color }}>{ft.label}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                      {formatRelativeTime(fu.created_at)}
                                    </div>
                                  </div>
                                  {fu.subject && (
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '2px' }}>
                                      {fu.subject}
                                    </div>
                                  )}
                                  {fu.details && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {fu.details}
                                    </div>
                                  )}
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '4px' }}>
                                    by {fu.created_by}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {followUps.length > 5 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '4px' }}>
                              +{followUps.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ─── Activity Timeline ─── */}
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ opacity: 0.6 }}>📊</span> Activity Timeline
                        {logs.length > 0 && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '2px 10px',
                            borderRadius: '999px',
                          }}>
                            {logs.length} event{logs.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </h2>

                      {logs.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          padding: '48px 24px',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '16px',
                          border: '1px dashed var(--border-color)',
                        }}>
                          <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.5 }}>📭</div>
                          <div style={{ fontWeight: 600, marginBottom: '6px' }}>No Activity Yet</div>
                          <div style={{ fontSize: '0.85rem' }}>Events will appear here as this contact progresses through the pipeline.</div>
                        </div>
                      ) : (
                        <>
                          <div style={{ position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              left: '13px',
                              top: '8px',
                              bottom: '8px',
                              width: '2px',
                              backgroundColor: 'var(--border-color)',
                              borderRadius: '2px',
                            }} />

                            <div style={{ display: 'grid', gap: '6px' }}>
                              {displayedLogs.map(log => {
                                const config = getActivityConfig(log.action)
                                return (
                                  <div
                                    key={log.id}
                                    style={{
                                      display: 'flex',
                                      gap: '14px',
                                      padding: '12px 14px',
                                      borderRadius: '12px',
                                      transition: 'background 0.2s',
                                      position: 'relative',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{
                                      flexShrink: 0,
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      backgroundColor: config.bg,
                                      border: `2px solid ${config.color}44`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.75rem',
                                      color: config.color,
                                      fontWeight: 700,
                                      zIndex: 1,
                                    }}>
                                      {config.icon}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: config.color }}>
                                          {config.label}
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                          {formatRelativeTime(log.created_at)}
                                        </div>
                                      </div>

                                      <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '4px', lineHeight: 1.5 }}>
                                        {formatDetails(log.action, log.details)}
                                      </div>

                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span>by {log.actor}</span>
                                        <span style={{ opacity: 0.4 }}>·</span>
                                        <span>{formatDateTime(log.created_at)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {logs.length > 5 && (
                            <button
                              onClick={() => setShowAllLogs(!showAllLogs)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                width: '100%',
                                marginTop: '12px',
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1px dashed var(--border-color)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                            >
                              {showAllLogs ? 'Show less ↑' : `Show all ${logs.length} events ↓`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  )
}
