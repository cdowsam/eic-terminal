import { useState, useEffect } from 'react'

const CORRECT_PASSWORD = 'godstechnology'
const SESSION_KEY = 'eic_auth'

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setUnlocked(true)
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (input === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setUnlocked(true)
    } else {
      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 600)
    }
  }

  if (unlocked) return children

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#128274;</div>
        <h2 style={{ color: '#00ff88', margin: '0 0 8px', fontSize: '20px', letterSpacing: '2px' }}>
          EIC TERMINAL
        </h2>
        <p style={{ color: '#555', fontSize: '12px', marginBottom: '32px', letterSpacing: '1px' }}>
          RESTRICTED ACCESS
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Enter password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#0a0a0a',
              border: error ? '1px solid #ff4444' : '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              animation: shake ? 'shake 0.6s ease' : 'none',
            }}
          />
          {error && (
            <p style={{ color: '#ff4444', fontSize: '12px', margin: '8px 0 0', textAlign: 'left' }}>
              Incorrect password. Try again.
            </p>
          )}
          <button
            type="submit"
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              background: '#00ff88',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              letterSpacing: '1px',
            }}
          >
            ENTER
          </button>
        </form>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </div>
  )
}
