import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// ─── Global fetch interceptor ────────────────────────────────────────────────
// Automatically logs out the user if the backend returns 403 "User account is disabled".
// This ensures deactivated users are immediately redirected to login on any API call.
;(function() {
  const origFetch = window.fetch
  window.fetch = function fetchWithInterceptor() {
    return origFetch.apply(this, arguments).then(async (response) => {
      if (response.status === 403) {
        try {
          const cloned = response.clone()
          const body = await cloned.json()
          if (body && body.detail === 'User account is disabled') {
            localStorage.removeItem('token')
            // Use location.href for a hard redirect (bypasses React router)
            window.location.href = '/login'
          }
        } catch (_) {
          // Not a JSON response or missing detail field — ignore
        }
      }
      return response
    })
  }
})()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
