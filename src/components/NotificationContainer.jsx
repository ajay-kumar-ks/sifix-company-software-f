import React from 'react'
import Notification from './Notification'

export const NotificationContext = React.createContext()

let notificationId = 0

export function notificationReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload]
    case 'REMOVE':
      return state.filter(n => n.id !== action.payload)
    default:
      return state
    }
}

export function createNotification(type, header, message) {
  return {
    id: ++notificationId,
    type,
    header,
    message,
  }
}

const containerStyles = {
  position: 'fixed',
  top: '1.5rem',
  right: '1.5rem',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  pointerEvents: 'none',
  maxHeight: 'calc(100vh - 3rem)',
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

export default function NotificationContainer({ notifications, dispatch }) {
  if (notifications.length === 0) return null

  return (
    <div style={containerStyles}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: notifications.length - index,
          }}
        >
          <Notification
            id={notification.id}
            type={notification.type}
            header={notification.header}
            message={notification.message}
            onDismiss={(id) => dispatch({ type: 'REMOVE', payload: id })}
          />
        </div>
      ))}
    </div>
  )
}