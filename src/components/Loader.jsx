import React from 'react'

export default function Loader({ label = 'Loading...', size = 30, color = 'var(--text-secondary)' }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div
        className="loader"
        style={{
          '--color': color,
          '--size': `${size}px`,
        }}
        aria-busy="true"
        aria-label={label}
      >
        <span />
        <span />
        <span />
        <span />
      </div>
      {label ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{label}</div>
      ) : null}
    </div>
  )
}
