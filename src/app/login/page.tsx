'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` }
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleEmailAuth() {
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = '/'
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', background: '#111',
        borderRadius: '16px', padding: '40px', border: '1px solid #1f1f1f'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', letterSpacing: '-0.5px' }}>
            Pace<span style={{ color: '#F97316' }}>Labs</span>
          </div>
          <div style={{ color: '#71717a', fontSize: '14px', marginTop: '6px' }}>
            Every mile. Perfectly calculated.
          </div>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            color: '#f5f5f5', fontSize: '15px', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px', marginBottom: '20px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: '#1f1f1f' }} />
          <span style={{ color: '#52525b', fontSize: '13px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#1f1f1f' }} />
        </div>

        {/* Email/password */}
        <input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', borderRadius: '8px',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            color: '#f5f5f5', fontSize: '14px', marginBottom: '10px',
            outline: 'none', boxSizing: 'border-box'
          }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', borderRadius: '8px',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            color: '#f5f5f5', fontSize: '14px', marginBottom: '16px',
            outline: 'none', boxSizing: 'border-box'
          }}
        />

        {error && <div style={{ color: '#F87171', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
        {message && <div style={{ color: '#10b981', fontSize: '13px', marginBottom: '12px' }}>{message}</div>}

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: '#F97316', border: 'none',
            color: '#fff', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', marginBottom: '16px'
          }}
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ color: '#F97316', cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  )
}