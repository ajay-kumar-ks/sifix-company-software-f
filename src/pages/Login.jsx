import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    try{
      // First try admin login
      const adminRes = await fetch(import.meta.env.VITE_API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (adminRes.ok) {
        const data = await adminRes.json()
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_role', 'admin')
        nav('/dashboard')
        return
      }

      // Try employee login
      const empRes = await fetch(import.meta.env.VITE_API_URL + '/hr/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (empRes.ok) {
        const data = await empRes.json()
        localStorage.setItem('token', data.token)
        localStorage.setItem('user_role', 'employee')
        localStorage.setItem('user_info', JSON.stringify(data.user))
        nav('/dashboard')
        return
      }

      throw new Error('Invalid')
    }catch(err){
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <form onSubmit={submit} className="w-full max-w-sm mx-4" style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow)', borderRadius: '8px', padding: '2rem' }}>
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-1 mb-8">
          <div className="text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'Grand Hotel, cursive, sans-serif', fontSize: '2.5rem' }}>
            Sifix
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sign in to your account</div>
        </div>

        {error && (
          <div className="mb-4 text-center text-sm" style={{ color: '#ed4956' }}>
            {error}
          </div>
        )}

        <div className="mb-3">
          <input
            value={username}
            onChange={e=>setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>

        <div className="mb-4">
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent)', opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => e.target.style.backgroundColor = 'var(--accent-hover)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'var(--accent)'}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          Admin: admin / admin &nbsp;|&nbsp; Employee: (created by HR)
        </div>
      </form>
    </div>
  )
}
