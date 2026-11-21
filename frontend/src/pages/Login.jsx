import { useState } from 'react'
import { api } from '../api'
import { ErrorBox } from '../components'

export default function Login({ onLogin }) {
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await api.login(username, password))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand big"><img src="/favicon.svg" alt="" width="40" height="40" /><span>PackSure</span></div>
        <p className="muted">Check packaged-commodity labels against the Legal Metrology (Packaged Commodities) Rules, 2011.</p>
        <label>Username<input value={username} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
        <ErrorBox error={error} />
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <details className="demo">
          <summary>Demo accounts</summary>
          <p>inspector / inspect123 · supervisor / super123 · admin / admin123</p>
        </details>
      </form>
    </div>
  )
}
