import { useEffect, useState } from 'react'
import { getSession, onSessionExpired, setSession } from './api'
import Login from './pages/Login'
import NewScan from './pages/NewScan'
import Result from './pages/Result'
import History from './pages/History'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Card from './pages/Card'
import { go } from './components'

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/scan')
  useEffect(() => {
    const f = () => setHash(window.location.hash || '#/scan')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return hash
}


export default function App() {
  const [session, setSess] = useState(getSession())
  const hash = useHash()
  useEffect(() => onSessionExpired(() => setSess(null)), [])

  if (!session) {
    return <Login onLogin={(s) => { setSession(s); setSess(s); go('/scan') }} />
  }
  const role = session.user.role
  const route = hash.replace(/^#/, '')
  let page
  const m = route.match(/^\/scans\/(\d+)/)
  if (m) page = <Result id={Number(m[1])} />
  else if (route.startsWith('/history')) page = <History />
  else if (route.startsWith('/dashboard')) page = <Dashboard role={role} />
  else if (route.startsWith('/users') && role === 'admin') page = <Users />
  else if (route.startsWith('/card')) page = <Card />
  else page = <NewScan user={session.user} />

  const tabs = [
    ['/scan', 'New scan'],
    ['/history', 'History'],
    ['/dashboard', 'Dashboard'],
    ['/card', 'Reference card'],
    ...(role === 'admin' ? [['/users', 'Users']] : []),
  ]
  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#/scan">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>PackSure</span>
        </a>
        <nav>
          {tabs.map(([p, l]) => (
            <a key={p} href={'#' + p} className={route.startsWith(p) ? 'on' : ''}>{l}</a>
          ))}
        </nav>
        <div className="who">
          <span title={session.user.district}>{session.user.name}</span>
          <button className="link" onClick={() => { setSession(null); setSess(null) }}>Sign out</button>
        </div>
      </header>
      <main>{page}</main>
    </div>
  )
}
