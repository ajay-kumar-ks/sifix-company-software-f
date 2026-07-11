import React, { useEffect, useRef, useState } from 'react'

const NOTIFICATION_DURATION = 4000

const iconSvgs = {
  success: `data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24' fill='%23ffffff'%3E%3Cpath d='M400-314.46 250.46-464 296-509.54l104 104 264-264L709.54-624 400-314.46Z'/%3E%3C/svg%3E`,
  error: `data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24' fill='%23ffffff'%3E%3Cpath d='m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z'/%3E%3C/svg%3E`,
}

const accentColors = {
  success: { main: '#10b981', light: 'rgba(16, 185, 129, 0.12)', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  error: { main: '#ef4444', light: 'rgba(239, 68, 68, 0.12)', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
}

export default function Notification({ id, type = 'success', header, message, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef(null)
  const remainingRef = useRef(NOTIFICATION_DURATION)
  const startTimeRef = useRef(Date.now())
  const notifRef = useRef(null)

  useEffect(() => {
    startTimeRef.current = Date.now()
    remainingRef.current = NOTIFICATION_DURATION

    timerRef.current = setTimeout(() => {
      handleClose()
    }, NOTIFICATION_DURATION)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current)
      remainingRef.current -= Date.now() - startTimeRef.current
    } else {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        handleClose()
      }, remainingRef.current)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPaused])

  function handleClose() {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onDismiss?.(id), 300)
    }, 300)
  }

  const accent = accentColors[type]

  if (!isVisible) return null

  return (
    <div
      ref={notifRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        display: 'flex',
        gap: '1rem',
        width: '26rem',
        maxWidth: 'calc(100vw - 4rem)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        zIndex: 2,
        padding: '1.25rem 1.25rem 1.25rem 0',
        overflow: 'hidden',
        position: 'relative',
        animation: isExiting
          ? 'notificationSlideOut 0.35s cubic-bezier(0.55, 0, 1, 0.45) forwards'
          : 'notificationSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        pointerEvents: 'auto',
      }}
    >
      {/* Glass glare overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)',
          pointerEvents: 'none',
          borderRadius: '1rem',
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          width: '4px',
          height: '100%',
          background: accent.gradient,
          borderRadius: '0 4px 4px 0',
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            background: isPaused
              ? accent.main
              : `${accent.gradient}`,
            transformOrigin: 'left',
            animation: isPaused ? 'none' : `notificationCountdown ${remainingRef.current}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
            borderRadius: '0 2px 2px 0',
            boxShadow: `0 0 6px ${accent.main}`,
          }}
        />
      </div>

      {/* Icon */}
      <div
        style={{
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: '1',
          width: '2.75rem',
          flexShrink: 0,
          background: accent.gradient,
          boxShadow: `0 4px 12px ${accent.main}44`,
          position: 'relative',
          zIndex: 1,
          animation: 'iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both',
        }}
      >
        <img
          src={iconSvgs[type]}
          alt=""
          style={{ width: '1.25rem', height: '1.25rem', display: 'block' }}
        />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <h2
          style={{
            color: '#0f172a',
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}
        >
          {header}
        </h2>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.875rem',
            letterSpacing: '0.01em',
            lineHeight: 1.5,
            color: '#475569',
          }}
        >
          {message}
        </p>
      </div>

      {/* Dismiss button */}
      <div style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start' }}>
        <button
          onClick={handleClose}
          aria-label="dismiss this notification"
          style={{
            appearance: 'none',
            background: 'rgba(0, 0, 0, 0.04)',
            border: 'none',
            font: 'inherit',
            margin: 0,
            padding: '0',
            cursor: 'pointer',
            fontSize: '0.8rem',
            lineHeight: 1,
            width: '1.75rem',
            height: '1.75rem',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)'
            e.currentTarget.style.color = '#475569'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)'
            e.currentTarget.style.color = '#94a3b8'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}